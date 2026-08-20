import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { supabase } from './config/supabase.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';

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
    const { query, location } = req.body;
    const files = req.files; // Array of uploaded files

    console.log(`[BACKEND] Received query: "${query}"`);
    
    let evidenceUrls = [];

    if (files && files.length > 0) {
      console.log(`[BACKEND] Uploading ${files.length} evidence file(s) to Cloudinary...`);
      
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

      evidenceUrls = await Promise.all(uploadPromises);
      console.log(`[BACKEND] Upload successful! URLs:`, evidenceUrls);
    }

    // TODO: When your friend finishes the Legal Brain, uncomment this to send the query + evidenceUrls
    /*
      const brainResponse = await fetch("http://localhost:8000/api/v1/legal/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query, evidence_urls: evidenceUrls })
      });
      const data = await brainResponse.json();
      return res.json(data);
    */

    // FOR NOW: We just simulate waiting, then return the mock data
    setTimeout(async () => {
      // Add the fake evidence urls to the mock response just to prove it works
      const responseWithEvidence = { ...mockLegalBrainResponse, evidence_provided: evidenceUrls };
      
      try {
        console.log(`[BACKEND] Saving case and message to Supabase for user: ${req.user.id}`);
        // 1. Create a new case
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .insert([{ 
            user_id: req.user.id,
            title: query.substring(0, 50) || 'New Case', 
            status: 'analyzed' 
          }])
          .select()
          .single();
          
        if (caseError) throw caseError;

        // 2. Save the AI response as a message
        const { error: msgError } = await supabase
          .from('messages')
          .insert([{ 
            case_id: caseData.id, 
            role: 'assistant', 
            content: responseWithEvidence 
          }]);
          
        if (msgError) throw msgError;
        console.log(`[BACKEND] Successfully saved to Supabase! Case ID: ${caseData.id}`);
        
        // Attach the real case ID so the frontend can navigate to it
        responseWithEvidence.id = caseData.id;
      } catch (dbError) {
        console.error(`[BACKEND] Database error:`, dbError.message);
      }

      res.json(responseWithEvidence);
    }, 2000);

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
