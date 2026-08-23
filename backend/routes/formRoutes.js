import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../config/supabase.js';
import { v2 as cloudinary } from 'cloudinary';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import { getGeminiModel, generateContentSafe } from '../config/gemini.js';
import fetch from 'node-fetch';
import streamifier from 'streamifier';
import fs from 'fs';
import os from 'os';
import path from 'path';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Upload & Extract Form
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { case_id } = req.body;
    
    if (!file) return res.status(400).json({ error: 'No file provided' });
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are currently supported' });
    }
    
    console.log(`[FormRoutes] Processing upload: ${file.originalname} for case: ${case_id || 'none'}`);
    
    // 1. Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'adhikaar_forms', resource_type: 'raw', format: 'pdf' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    // 2. Extract fields using pdf-lib
    const pdfDoc = await PDFDocument.load(file.buffer);
    const form = pdfDoc.getForm();
    const pdfFields = form.getFields();
    
    const detected_fields = pdfFields.map(f => {
      const type = f.constructor.name.replace('PDF', '').replace('Field', '').toLowerCase();
      // Map PDF types to our types (e.g. PDFTextField -> text)
      let mappedType = 'text';
      if (type.includes('check') || type.includes('radio')) mappedType = 'checkbox';
      else if (type.includes('dropdown') || type.includes('option')) mappedType = 'select';
      
      return {
        id: f.getName(),
        name: f.getName(),
        label: f.getName(), // Raw name for now
        type: mappedType,
        required: false, // PDF-lib doesn't easily expose 'required' flag
        description: ''
      };
    });

    console.log(`[FormRoutes] Extracted ${detected_fields.length} fields from PDF.`);

    // 3. Save to Supabase uploaded_forms
    const file_hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    
    const { data: formData, error: dbError } = await supabase
      .from('uploaded_forms')
      .insert([{
        user_id: req.user.id,
        case_id: case_id || null,
        file_name: file.originalname,
        file_type: 'pdf',
        file_size: file.size,
        file_path: uploadResult.secure_url,
        file_hash: file_hash,
        status: 'EXTRACTED',
        extraction_method: 'pdf-lib',
        detected_fields: detected_fields,
        extracted_at: new Date()
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. Cache original PDF locally to bypass Cloudinary 401 blocking for programmatic downloads
    const localPath = path.join(os.tmpdir(), `adhikaar_form_${formData.id}.pdf`);
    fs.writeFileSync(localPath, file.buffer);

    res.json(formData);
  } catch (error) {
    console.error('[FormRoutes] Upload Error:', error);
    res.status(500).json({ error: 'Failed to process form upload' });
  }
});

// 2. Confirm Detected Fields
router.post('/:id/confirm', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed_fields } = req.body;
    
    // 1. Get the form
    const { data: form, error: formError } = await supabase
      .from('uploaded_forms')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // 2. Validate fields against detected
    const detected_ids = form.detected_fields.map(f => f.id);
    const validFields = confirmed_fields.filter(f => detected_ids.includes(f.id));

    // 3. Update form status
    await supabase
      .from('uploaded_forms')
      .update({
        detected_fields: validFields,
        user_confirmed: true,
        confirmed_at: new Date(),
        status: 'CONFIRMED'
      })
      .eq('id', id);

    // 4. Create Session
    const { data: session, error: sessionError } = await supabase
      .from('form_fill_sessions')
      .insert([{
        form_id: id,
        user_id: req.user.id,
        case_id: form.case_id,
        status: 'ACTIVE',
        current_step: 0,
        completed_fields: [],
        answers: {},
        conversation_history: []
      }])
      .select()
      .single();

    if (sessionError) throw sessionError;

    res.json({ 
      status: 'CONFIRMED',
      session_id: session.id,
      message: 'Fields confirmed. Ready to start conversation.'
    });
  } catch (error) {
    console.error('[FormRoutes] Confirm Error:', error);
    res.status(500).json({ error: 'Failed to confirm fields' });
  }
});

// 3. Get Next Question for Session
router.get('/sessions/:id/next-question', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: session, error: sessionErr } = await supabase
      .from('form_fill_sessions')
      .select('*, uploaded_forms(*)')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (sessionErr || !session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'COMPLETED') return res.json({ status: 'COMPLETE', message: 'All fields completed!' });

    const form = session.uploaded_forms;
    
    // Find next unanswered field
    let nextField = null;
    for (const field of form.detected_fields) {
      if (!session.completed_fields.includes(field.id)) {
        nextField = field;
        break;
      }
    }

    if (!nextField) {
      // All done!
      await supabase.from('form_fill_sessions').update({ status: 'COMPLETED' }).eq('id', id);
      return res.json({ status: 'COMPLETE', message: 'All required fields completed!' });
    }

    // Generate Question via Gemini
    const model = getGeminiModel();
    const prompt = `
      You are an AI assistant helping a user fill out a government form.
      Generate a natural, short, and conversational question asking for this form field:
      
      Field Name: ${nextField.name}
      Type: ${nextField.type}
      
      The question must be extremely clear and conversational. 
      Return ONLY the question string, without quotes or extra text.
    `;
    
    let question = `Please provide your ${nextField.label}`;
    try {
      const resp = await generateContentSafe(model, prompt);
      if (resp) question = resp.trim();
    } catch (e) {
      console.warn('[FormRoutes] Gemini failed to generate question, using fallback.');
    }

    res.json({
      status: 'ASKING',
      field_id: nextField.id,
      field_name: nextField.name,
      question: question
    });
  } catch (error) {
    console.error('[FormRoutes] Next Question Error:', error);
    res.status(500).json({ error: 'Failed to get next question' });
  }
});

// 4. Submit Answer for Session
router.post('/sessions/:id/answer', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { field_id, user_response } = req.body;
    
    const { data: session, error: sessionErr } = await supabase
      .from('form_fill_sessions')
      .select('*, uploaded_forms(*)')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (sessionErr || !session) return res.status(404).json({ error: 'Session not found' });

    const field = session.uploaded_forms.detected_fields.find(f => f.id === field_id);
    if (!field) return res.status(404).json({ error: 'Field not found in form' });

    // Use Gemini to extract the precise value from the conversational response
    const model = getGeminiModel();
    const extractPrompt = `
      The user was asked to provide their: ${field.label}
      They responded with: "${user_response}"
      
      Extract exactly the raw value that belongs in the form field.
      For example, if asked for name and they say "My name is John Doe", return "John Doe".
      If asked for a checkbox/radio and they say "Yes I am", return "true".
      Return ONLY the extracted value.
    `;

    let extractedValue = user_response;
    try {
      const resp = await generateContentSafe(model, extractPrompt);
      if (resp) extractedValue = resp.trim();
    } catch (e) {
      console.warn('[FormRoutes] Gemini extraction failed, using raw response.');
    }

    // Deterministic Validation (Simple length/existence check for now)
    if (!extractedValue || extractedValue.length < 1) {
      return res.json({
        status: 'INVALID',
        error: 'Value cannot be empty',
        suggestion: 'Could you please provide a valid answer?'
      });
    }

    // Update Session State
    const updatedAnswers = { ...session.answers };
    updatedAnswers[field_id] = {
      value: extractedValue,
      raw_response: user_response,
      answered_at: new Date()
    };

    const updatedCompletedFields = [...session.completed_fields, field_id];
    
    const updatedHistory = [...session.conversation_history, {
      field_id,
      user_response,
      extracted_value: extractedValue,
      timestamp: new Date()
    }];

    await supabase
      .from('form_fill_sessions')
      .update({
        answers: updatedAnswers,
        completed_fields: updatedCompletedFields,
        conversation_history: updatedHistory,
        current_step: session.current_step + 1
      })
      .eq('id', id);

    res.json({ 
      status: 'ACCEPTED', 
      value: extractedValue,
      message: 'Got it!' 
    });
  } catch (error) {
    console.error('[FormRoutes] Answer Error:', error);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// 5. Generate Final Form
router.post('/sessions/:id/generate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Fetch Session and Form Data
    const { data: session, error: sessionErr } = await supabase
      .from('form_fill_sessions')
      .select('*, uploaded_forms(*)')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (sessionErr || !session) return res.status(404).json({ error: 'Session not found' });
    const form = session.uploaded_forms;

    console.log(`[FormRoutes] Generating final form for session ${id}`);

    // 2. Load original blank PDF from local cache (bypasses Cloudinary 401 PDF block)
    const localPath = path.join(os.tmpdir(), `adhikaar_form_${form.id}.pdf`);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Original PDF not found in local cache. Please upload the form again.`);
    }
    const pdfBuffer = fs.readFileSync(localPath);

    // 3. Load into pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pdfForm = pdfDoc.getForm();

    // 4. Populate fields with user answers
    const answers = session.answers;
    
    for (const [fieldId, answerData] of Object.entries(answers)) {
      try {
        const field = pdfForm.getField(fieldId);
        const type = field.constructor.name;
        
        if (type.includes('Text')) {
          field.setText(String(answerData.value));
        } else if (type.includes('Check') || type.includes('Radio')) {
          if (String(answerData.value).toLowerCase() === 'true' || answerData.value === true) {
            field.check();
          }
        } else if (type.includes('Option') || type.includes('Dropdown')) {
          field.select(String(answerData.value));
        }
      } catch (e) {
        console.warn(`[FormRoutes] Could not fill field ${fieldId}:`, e.message);
      }
    }

    // 5. Flatten the form (Make it read-only)
    pdfForm.flatten();

    // 6. Save populated PDF to buffer
    const filledPdfBytes = await pdfDoc.save();
    const finalBuffer = Buffer.from(filledPdfBytes);

    // 7. Upload final PDF to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'adhikaar_filled_forms', resource_type: 'raw', format: 'pdf' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(finalBuffer).pipe(uploadStream);
    });

    const finalUrl = uploadResult.secure_url;
    const finalFileName = `Filled_${form.file_name}`;

    // 8. Update Session
    await supabase.from('form_fill_sessions').update({ status: 'COMPLETED' }).eq('id', id);

    // 9. Save to Database
    const { data: generatedDoc, error: genErr } = await supabase
      .from('generated_documents')
      .insert([{
        session_id: id,
        form_id: form.id,
        user_id: req.user.id,
        case_id: session.case_id,
        file_name: finalFileName,
        file_path: finalUrl
      }])
      .select()
      .single();

    if (genErr) throw genErr;

    // 10. Attach to Case Messages if case exists
    if (session.case_id) {
      await supabase.from('messages').insert([{
        case_id: session.case_id,
        role: 'assistant',
        content: { text: `Here is your completed form: **${form.file_name}**` },
        evidence_urls: [finalUrl]
      }]);
    }

    res.json({ 
      status: 'COMPLETED',
      document_url: finalUrl,
      file_name: finalFileName,
      generated_doc_id: generatedDoc.id,
      pdf_base64: finalBuffer.toString('base64')
    });
  } catch (error) {
    console.error('[FormRoutes] Generate Error:', error);
    res.status(500).json({ error: 'Failed to generate form' });
  }
});

export default router;
