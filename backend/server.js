import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { supabase } from './config/supabase.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';
import fetch from 'node-fetch';

dotenv.config();

// Configure Cloudinary (Requires these variables in your .env file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow React frontend to talk to this backend
app.use(express.json()); // Parse incoming JSON requests

// Routes
app.use('/api/auth', authRoutes);

// Set up Multer for file uploads (storing in memory for now before sending to Cloudinary)
const upload = multer({ storage: multer.memoryStorage() });

// --- MOCK LEGAL BRAIN ---
// While your friend is building the FastAPI backend, we will use this mock response
// so you can finish the React frontend today.
const mockLegalBrainResponse = {
  request_id: "req_demo_001",
  domain: "tenant_landlord",
  summary: "The tenant's security deposit of ₹50,000 was not returned by the landlord after vacating the premises.",
  facts: [
    "Tenant paid ₹50,000 security deposit.",
    "Tenancy has ended.",
    "Landlord has not returned the deposit."
  ],
  legal_position: [
    "Under standard Rent Control Acts and the Model Tenancy Act, a landlord must return the security deposit within a stipulated time (usually 30 days) after deducting unpaid rent or valid damage costs."
  ],
  sources: [
    {
      source_id: "src_mta_2021",
      type: "statute",
      title: "Model Tenancy Act, 2021",
      section: "Section 11",
      url: "https://mohua.gov.in/upload/uploadfiles/magazines/Model-Tenancy-Act-2021.pdf",
      retrieved_text: "The security deposit shall be refunded to the tenant on the date of taking over vacant possession of the premises..."
    }
  ],
  next_steps: [
    "Send a formal Legal Notice to the landlord demanding the return of the deposit within 15 days.",
    "If no response, file a complaint in the Rent Court or Consumer Dispute Redressal Commission."
  ],
  deadlines: [
    "15 days to respond after receiving Legal Notice."
  ]
};

// --- ROUTES ---

// 1. Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Node.js Application Backend is running' });
});

// 2. The main API Gateway Route (The Link) - Protected by JWT Authentication
app.post('/api/legal/analyze', requireAuth, upload.array('evidence', 5), async (req, res) => {
  try {
    const { query, location, history } = req.body;
    const files = req.files; // Array of uploaded files

    let parsedHistory = [];
    if (history) {
      try {
        parsedHistory = JSON.parse(history);
      } catch (e) {
        console.error("[BACKEND] Error parsing history", e);
      }
    }

    console.log(`[BACKEND] Received query: "${query}" with ${parsedHistory.length} history items`);
    
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
          
          const uploadRes = await fetch("https://lunacy-undoing-moistness.ngrok-free.dev/api/v1/legal/upload", {
            method: "POST",
            body: formData
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload API returned status: ${uploadRes.status}`);
          }

          const uploadData = await uploadRes.json();
          if (uploadData.status === "success" && uploadData.extracted_text) {
            extractedText += uploadData.extracted_text + "\n\n";
          }
        } catch(e) { 
          console.error("[BACKEND] Python File Upload Error:", e); 
        }
      }

      evidenceUrls = await Promise.all(uploadPromises);
      console.log(`[BACKEND] Upload successful! URLs:`, evidenceUrls);
    }

    // Call the Python FastAPI Legal Brain
    console.log("[BACKEND] Calling Python API at https://lunacy-undoing-moistness.ngrok-free.dev/api/v1/legal/chat");
    try {
      const brainResponse = await fetch("https://lunacy-undoing-moistness.ngrok-free.dev/api/v1/legal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      
      if (aiData.response_type === 'question') {
        // Just forward the question to the frontend
        return res.json(aiData);
      } else if (aiData.response_type === 'analysis') {
        // Save to DB and append case ID
        const responseWithEvidence = { ...aiData, evidence_provided: evidenceUrls };
        
        try {
          console.log(`[BACKEND] Saving case to Supabase for user: ${req.user.id}`);
          const { data: caseData, error: caseError } = await supabase
            .from('cases')
            .insert([{ 
              user_id: req.user.id,
              title: (query || "Uploaded Document").substring(0, 50),
              status: 'analyzed' 
            }])
            .select()
            .single();
            
          if (caseError) throw caseError;

          const { error: msgError } = await supabase
            .from('messages')
            .insert([{ 
              case_id: caseData.id, 
              role: 'assistant', 
              content: responseWithEvidence 
            }]);
            
          if (msgError) throw msgError;
          
          responseWithEvidence.id = caseData.id;
        } catch (dbError) {
          console.error(`[BACKEND] Database error:`, dbError.message);
        }

        return res.json(responseWithEvidence);
      } else {
        return res.json({ error: "Unknown response_type from AI" });
      }

    } catch (fetchError) {
      console.error("[BACKEND] Python API is unreachable:", fetchError.message || fetchError);
      // Fallback for testing frontend since python server is on friend's laptop
      return res.json({
         request_id: "req_demo_002",
         response_type: "question",
         ai_message: "It seems your friend's Python Legal Brain server is currently offline or unreachable. Can you tell me more about your issue anyway so we can test the chat interface?"
      });
    }

  } catch (error) {
    console.error('[BACKEND] Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// 3. Fetch user's cases
app.get('/api/cases', requireAuth, async (req, res) => {
  try {
    const { data: cases, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(cases);
  } catch (error) {
    console.error('[BACKEND] Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// 4. Fetch specific case details (including AI response)
app.get('/api/cases/:id', requireAuth, async (req, res) => {
  try {
    // Check if case belongs to user
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (caseError) throw caseError;

    // Get the AI message content
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('content')
      .eq('case_id', req.params.id)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1);

    if (msgError) throw msgError;

    const fullCaseData = messages && messages.length > 0 ? messages[0].content : {};
    fullCaseData.request_id = caseData.id;
    
    res.json(fullCaseData);
  } catch (error) {
    console.error('[BACKEND] Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
