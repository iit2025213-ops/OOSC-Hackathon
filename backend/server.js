import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { supabase } from './config/supabase.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';
import fetch, { FormData, Blob } from 'node-fetch';
import { mdToPdf } from 'md-to-pdf';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Set up Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const PYTHON_API_BASE = "https://lunacy-undoing-moistness.ngrok-free.dev";

// --- ROUTES ---

// 1. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Node.js Application Backend is running' });
});

// 2. Create a new case
app.post('/api/cases/new', requireAuth, async (req, res) => {
  try {
    const { title, initial_query } = req.body;
    
    // Generate a smart title from the query (truncate to 60 chars max)
    const caseTitle = title || (initial_query ? initial_query.substring(0, 60) : 'New Case');
    
    const { data: caseData, error } = await supabase
      .from('cases')
      .insert([{
        user_id: req.user.id,
        title: caseTitle,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;

    console.log(`[BACKEND] Created new case: ${caseData.id} for user: ${req.user.id}`);
    res.json(caseData);
  } catch (error) {
    console.error('[BACKEND] Error creating case:', error.message);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// 3. Send a message in a case (the main AI gateway)
app.post('/api/cases/:caseId/message', requireAuth, upload.array('evidence', 5), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { query, history } = req.body;
    const files = req.files;

    // Verify case belongs to user
    const { data: caseCheck, error: caseCheckErr } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', req.user.id)
      .single();

    if (caseCheckErr || !caseCheck) {
      return res.status(404).json({ error: 'Case not found' });
    }

    let parsedHistory = [];
    if (history) {
      try { parsedHistory = JSON.parse(history); } catch (e) { /* ignore */ }
    }

    console.log(`[BACKEND] Case ${caseId}: Received query: "${query}" with ${parsedHistory.length} history items`);

    // Save user message to DB
    await supabase.from('messages').insert([{
      case_id: caseId,
      role: 'user',
      content: { text: query || '' }
    }]);

    // Handle file uploads
    let evidenceUrls = [];
    let extractedText = "";

    if (files && files.length > 0) {
      console.log(`[BACKEND] Processing ${files.length} evidence file(s)...`);

      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'adhikaar_evidence' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          uploadStream.end(file.buffer);
        });
      });

      // Extract text via Python API
      for (const file of files) {
        try {
          console.log(`[BACKEND] Sending file to Python Upload API...`);
          const formData = new FormData();
          const fileBlob = new Blob([file.buffer], { type: file.mimetype });
          formData.append('file', fileBlob, file.originalname);

          const uploadRes = await fetch(`${PYTHON_API_BASE}/api/v1/legal/upload`, {
            method: "POST",
            body: formData
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.status === "success" && uploadData.extracted_text) {
              extractedText += uploadData.extracted_text + "\n\n";
            }
          }
        } catch (e) {
          console.error("[BACKEND] Python File Upload Error:", e.message);
        }
      }

      evidenceUrls = await Promise.all(uploadPromises);
    }

    // Call the Python FastAPI Legal Brain
    console.log(`[BACKEND] Calling Python API chat endpoint...`);
    try {
      const brainResponse = await fetch(`${PYTHON_API_BASE}/api/v1/legal/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" 
        },
        body: JSON.stringify({
          query: query || "",
          history: parsedHistory,
          document_text: extractedText.trim() || null
        })
      });

      if (!brainResponse.ok) {
        throw new Error(`Python API responded with status: ${brainResponse.status}`);
      }

      const aiData = await brainResponse.json();

      // Save AI response to DB
      await supabase.from('messages').insert([{
        case_id: caseId,
        role: 'assistant',
        content: aiData
      }]);

      // Update case title if this is the first real response and it's an analysis
      if (aiData.response_type === 'analysis' && aiData.analysis?.domain) {
        const smartTitle = `${aiData.analysis.domain}${aiData.analysis.subdomain ? ' — ' + aiData.analysis.subdomain : ''}`;
        await supabase.from('cases').update({ 
          title: smartTitle, 
          status: 'analyzed' 
        }).eq('id', caseId);
      }

      return res.json({ ...aiData, evidence_provided: evidenceUrls });

    } catch (fetchError) {
      console.error("[BACKEND] Python API is unreachable:", fetchError.message);
      
      // Fallback response
      const fallback = {
        response_type: "question",
        ai_message: "I'm having trouble reaching the Legal AI server right now. Could you tell me more about your situation? I'll try to reconnect shortly."
      };
      
      await supabase.from('messages').insert([{
        case_id: caseId,
        role: 'assistant',
        content: fallback
      }]);

      return res.json(fallback);
    }

  } catch (error) {
    console.error('[BACKEND] Error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// 3b. Send a message (Streaming SSE)
app.post('/api/cases/:caseId/message/stream', requireAuth, upload.array('evidence', 5), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { query, history, previous_analysis } = req.body;
    const files = req.files;

    // Verify case belongs to user
    const { data: caseCheck, error: caseCheckErr } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', req.user.id)
      .single();

    if (caseCheckErr || !caseCheck) {
      return res.status(404).json({ error: 'Case not found' });
    }

    let parsedHistory = [];
    if (history) {
      try { parsedHistory = JSON.parse(history); } catch (e) { /* ignore */ }
    }

    let parsedPreviousAnalysis = null;
    if (previous_analysis) {
      try { parsedPreviousAnalysis = JSON.parse(previous_analysis); } catch (e) { /* ignore */ }
    }

    console.log(`[BACKEND] Case ${caseId}: Received STREAM query: "${query}"`);

    // Save user message to DB
    await supabase.from('messages').insert([{
      case_id: caseId,
      role: 'user',
      content: { text: query || '' }
    }]);

    // Handle file uploads
    let evidenceUrls = [];
    let extractedText = "";

    if (files && files.length > 0) {
      console.log(`[BACKEND] Processing ${files.length} evidence file(s)...`);
      const uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'adhikaar_evidence' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          uploadStream.end(file.buffer);
        });
      });

      // Extract text via Python API
      for (const file of files) {
        try {
          const formData = new FormData();
          const fileBlob = new Blob([file.buffer], { type: file.mimetype });
          formData.append('file', fileBlob, file.originalname);

          const uploadRes = await fetch(`${PYTHON_API_BASE}/api/v1/legal/upload`, {
            method: "POST",
            body: formData
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.status === "success" && uploadData.extracted_text) {
              extractedText += uploadData.extracted_text + "\n\n";
            }
          }
        } catch (e) {
          console.error("[BACKEND] Python File Upload Error:", e.message);
        }
      }

      evidenceUrls = await Promise.all(uploadPromises);
    }

    // Call the Python FastAPI Legal Brain STREAM endpoint
    console.log(`[BACKEND] Calling Python API chat stream endpoint...`);
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const brainResponse = await fetch(`${PYTHON_API_BASE}/api/v1/legal/chat/stream`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          query: query || "",
          history: parsedHistory,
          document_text: extractedText.trim() || null,
          previous_analysis: parsedPreviousAnalysis
        })
      });

      if (!brainResponse.ok) {
        throw new Error(`Python API responded with status: ${brainResponse.status}`);
      }

      let fullResponseString = "";

      brainResponse.body.on('data', (chunk) => {
        res.write(chunk); // stream directly to client
        fullResponseString += chunk.toString();
      });

      brainResponse.body.on('end', async () => {
        // Parse the accumulated string to find final_response
        const lines = fullResponseString.split('\n\n');
        for (const line of lines) {
           if (line.startsWith('data: ')) {
              try {
                 const data = JSON.parse(line.replace('data: ', ''));
                 if (data.final_response) {
                    const aiData = data.final_response;
                    
                    // Save AI response to DB
                    await supabase.from('messages').insert([{
                      case_id: caseId,
                      role: 'assistant',
                      content: aiData
                    }]);

                    // Update case title if this is the first real response and it's an analysis
                    if (aiData.response_type === 'analysis' && aiData.analysis?.domain) {
                      const smartTitle = `${aiData.analysis.domain}${aiData.analysis.subdomain ? ' — ' + aiData.analysis.subdomain : ''}`;
                      await supabase.from('cases').update({ 
                        title: smartTitle, 
                        status: 'analyzed' 
                      }).eq('id', caseId);
                    }
                 }
              } catch(e) {}
           }
        }
        res.end(); // close SSE connection
      });

      brainResponse.body.on('error', (err) => {
        console.error("[BACKEND] Stream error:", err);
        res.write(`data: {"status": "Error: Connection lost"}\n\n`);
        res.end();
      });

    } catch (fetchError) {
      console.error("[BACKEND] Python API is unreachable:", fetchError.message);
      res.write(`data: ${JSON.stringify({ final_response: { response_type: "question", ai_message: "I'm having trouble reaching the Legal AI server right now. Could you tell me more about your situation? I'll try to reconnect shortly." } })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('[BACKEND] Error:', error);
    res.write(`data: {"status": "Error: Failed to process request"}\n\n`);
    res.end();
  }
});

// 3c. Handle Feedback
app.post('/api/cases/:caseId/feedback', requireAuth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { request_id, rating, comments } = req.body;

    const { data: latestMessage, error: fetchErr } = await supabase
      .from('messages')
      .select('id')
      .eq('case_id', caseId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchErr || !latestMessage) {
      return res.status(404).json({ error: 'No AI message found to rate' });
    }

    const { error: updateErr } = await supabase
      .from('messages')
      .update({
        feedback_rating: rating,
        feedback_comments: comments || null
      })
      .eq('id', latestMessage.id);

    if (updateErr) throw updateErr;

    res.json({ success: true });
  } catch (err) {
    console.error('[BACKEND] Feedback Error:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// 3d. Draft a Legal Document
app.post('/api/cases/:caseId/draft_document', requireAuth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { instruction, history, previous_analysis } = req.body;

    // Verify case belongs to user
    const { data: caseCheck, error: caseCheckErr } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('user_id', req.user.id)
      .single();

    if (caseCheckErr || !caseCheck) {
      return res.status(404).json({ error: 'Case not found' });
    }

    console.log(`[BACKEND] Case ${caseId}: Drafting document: "${instruction}"`);

    const brainResponse = await fetch(`${PYTHON_API_BASE}/api/v1/legal/draft_document`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({
        instruction: instruction || "",
        history: history || [],
        previous_analysis: previous_analysis || null
      })
    });

    if (!brainResponse.ok) {
      throw new Error(`Python API responded with status: ${brainResponse.status}`);
    }

    const draftData = await brainResponse.json();

    let pdf_url = null;
    try {
      console.log(`[BACKEND] Case ${caseId}: Converting Markdown to PDF...`);
      // Use CSS to style the PDF to look like a professional document
      const pdf = await mdToPdf(
        { content: draftData.markdown_content },
        { 
          launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
          pdf_options: { format: 'A4', margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } },
          css: `
            body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000; }
            h1, h2, h3 { font-family: "Arial", sans-serif; text-align: center; margin-bottom: 15px; }
            h1 { font-size: 16pt; font-weight: bold; text-decoration: underline; }
            p { margin-bottom: 12px; }
          `
        }
      );

      console.log(`[BACKEND] Case ${caseId}: Uploading PDF to Cloudinary...`);
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'raw', format: 'pdf', folder: 'adhikaar_documents' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(pdf.content);
      });
      pdf_url = uploadResult.secure_url;
      draftData.pdf_url = pdf_url;
    } catch (pdfErr) {
      console.error('[BACKEND] PDF Generation/Upload Error:', pdfErr.message || pdfErr);
      if (pdfErr.stack) console.error(pdfErr.stack);
      // We don't fail the whole request, we just save without the PDF
    }

    // Save the drafted document as a message in the case
    await supabase.from('messages').insert([{
      case_id: caseId,
      role: 'assistant',
      content: { response_type: 'document_draft', ...draftData, created_at: new Date().toISOString() }
    }]);

    return res.json(draftData);

  } catch (err) {
    console.error('[BACKEND] Draft Document Error:', err.message);
    res.status(500).json({ error: 'Failed to draft document' });
  }
});

// 4. Fetch user's cases (list view)
app.get('/api/cases', requireAuth, async (req, res) => {
  try {
    const { data: cases, error } = await supabase
      .from('cases')
      .select('id, title, status, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get message counts for each case
    const caseIds = cases.map(c => c.id);
    if (caseIds.length > 0) {
      const { data: msgCounts } = await supabase
        .from('messages')
        .select('case_id')
        .in('case_id', caseIds);

      const countMap = {};
      (msgCounts || []).forEach(m => {
        countMap[m.case_id] = (countMap[m.case_id] || 0) + 1;
      });

      cases.forEach(c => {
        c.message_count = countMap[c.id] || 0;
      });
    }

    res.json(cases);
  } catch (error) {
    console.error('[BACKEND] Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// 5. Fetch a specific case with all messages
app.get('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (caseError) throw caseError;

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('case_id', req.params.id)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    res.json({
      ...caseData,
      messages: messages || []
    });
  } catch (error) {
    console.error('[BACKEND] Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case details' });
  }
});

// 6. Update a case (rename, archive, change status)
app.patch('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    const { title, status } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('cases')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[BACKEND] Error updating case:', error);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

// 7. Delete a case
app.delete('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    // Delete messages first
    await supabase.from('messages').delete().eq('case_id', req.params.id);
    
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[BACKEND] Error deleting case:', error);
    res.status(500).json({ error: 'Failed to delete case' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
