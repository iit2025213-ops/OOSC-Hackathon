import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import schemeService from '../services/schemeService.js';
import { getGeminiModel, generateContentSafe } from '../config/gemini.js';
import { mdToPdf } from 'md-to-pdf';
import { v2 as cloudinary } from 'cloudinary';
import { supabase } from '../config/supabase.js';
import puppeteer from 'puppeteer';

const router = express.Router();

// In-memory cache for explanations
// Key: "scheme_id_language" -> Value: Explanation Object
const explanationCache = {};

// 1. Match Schemes
router.post('/match', requireAuth, async (req, res) => {
  try {
    const userProfile = req.body;
    let extractedKeywords = [];

    if (userProfile.search_query && process.env.GEMINI_API_KEY) {
      const model = getGeminiModel();
      const prompt = `
You are a government scheme expert. A user wants to find schemes based on this query:
"${userProfile.search_query}"

Extract 3 to 6 single-word keywords that capture the core intent of this query (e.g. "business", "agriculture", "education", "loan", "dairy", "scholarship", "housing").
Return ONLY a JSON array of these lowercase keyword strings. Do not use markdown.
Example: ["dairy", "agriculture", "loan"]
`;
      try {
        const resultText = await generateContentSafe(model, prompt);
        let text = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        extractedKeywords = JSON.parse(text);
        console.log("[SchemeRoutes] Extracted keywords:", extractedKeywords);
      } catch (err) {
        console.error("[SchemeRoutes] Failed to extract keywords via Gemini:", err);
      }
    }

    const result = schemeService.matchSchemes(userProfile, extractedKeywords);
    res.json(result);
  } catch (error) {
    console.error("[SchemeRoutes] Error matching schemes:", error);
    if (error.code && error.code.startsWith('AI_')) {
      return res.status(error.status || 500).json({ success: false, error: error.message, code: error.code });
    }
    res.status(500).json({ success: false, error: 'Failed to match schemes' });
  }
});

// 2. Explain Scheme
router.post('/:id/explain', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { profile, language = 'en' } = req.body;

    const scheme = schemeService.getSchemeById(id);
    if (!scheme) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const cacheKey = `${id}_${language}`;
    let cachedExplanation = explanationCache[cacheKey];

    // If not cached, generate the explanation using Gemini
    if (!cachedExplanation) {
      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: 'Gemini API Key is missing. Cannot generate explanation.' });
      }

      const model = getGeminiModel();

      const prompt = `
You explain Indian government welfare schemes to ordinary citizens in simple, clear language. Use only the scheme information supplied to you below. Do not invent benefits, amounts, eligibility rules, deadlines, documents, fees, procedures, or URLs. Do not use outside knowledge. If information is missing or unclear, explicitly say so and tell the user to check the official government source.

Language: ${language === 'hi' ? 'Hindi' : 'English'}

Scheme Details:
Name: ${scheme.scheme_name}
Description: ${scheme.description}
Benefits: ${scheme.benefits}
Eligibility: ${scheme.eligibility}
Application Process: ${scheme.application_process}
Documents Required: ${scheme.documents_required}

Return ONLY a valid JSON object matching this structure. Do not include markdown formatting like \`\`\`json.
{
  "summary": "Simple explanation of what the scheme does.",
  "benefits_simplified": "What the citizen receives.",
  "steps": ["Step 1...", "Step 2..."],
  "documents": ["Document 1", "Document 2"],
  "important_note": "Any important limitation or missing information."
}
`;

      try {
        const responseText = await generateContentSafe(model, prompt);
        let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
        cachedExplanation = JSON.parse(cleanedText);
        explanationCache[cacheKey] = cachedExplanation;
      } catch (error) {
        console.error("Failed to generate or parse Gemini explanation:", error);
        if (error.code && error.code.startsWith('AI_')) throw error; // Pass up to route handler
        return res.status(500).json({ success: false, error: 'Failed to generate a valid explanation' });
      }
    }

    // Now, determine the personalized "why_eligible" deterministically based on the profile
    let why_eligible = "We could not determine your specific eligibility based on your profile.";
    if (profile) {
      // Run match for just this scheme
      const matchResult = schemeService.matchSchemes(profile);
      const isEligible = matchResult.eligible.find(s => s.id === id);
      const isAlmostEligible = matchResult.almost_eligible.find(s => s.id === id);

      if (isEligible) {
        why_eligible = `Based on the information you provided (Age: ${profile.age || 'N/A'}, Income: ${profile.annual_income || 'N/A'}), you appear to meet all the listed eligibility criteria for this scheme.`;
      } else if (isAlmostEligible) {
        why_eligible = `You meet almost all requirements, except: ${isAlmostEligible.blocking_criterion.expected} (Yours: ${isAlmostEligible.blocking_criterion.actual}).`;
      } else {
        why_eligible = `Based on the information you provided, you do not appear to meet all the requirements for this scheme.`;
      }
    }

    // Combine cached static explanation with dynamic personalized explanation
    const finalResponse = {
      ...cachedExplanation,
      why_eligible
    };

    res.json(finalResponse);

  } catch (error) {
    console.error("[SchemeRoutes] Error explaining scheme:", error);
    if (error.code && error.code.startsWith('AI_')) {
      return res.status(error.status || 500).json({ success: false, error: error.message, code: error.code });
    }
    res.status(500).json({ success: false, error: 'Failed to generate explanation' });
  }
});

// 3. Draft Application Letter (Saved as PDF)
router.post('/:id/draft_application', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { profile, caseId } = req.body;

    if (!caseId) {
      return res.status(400).json({ error: 'A caseId is required to save the document.' });
    }

    const scheme = schemeService.getSchemeById(id);
    if (!scheme) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API Key is missing. Cannot generate application.' });
    }

    const model = getGeminiModel();

    const prompt = `
You are drafting a formal application letter/affidavit for an Indian citizen applying for a government welfare scheme.
Use the citizen's details and the scheme details below.

Citizen Details:
Age: ${profile.age || 'N/A'}
Gender: ${profile.gender || 'N/A'}
Caste: ${profile.caste || 'N/A'}
Annual Income: ${profile.annual_income || 'N/A'}
State: ${profile.state || 'N/A'}

Scheme Details:
Name: ${scheme.scheme_name}
Department/Ministry: ${scheme.department}, ${scheme.ministry}

Generate a formal, professional application letter in Markdown format. 
Format it like a standard formal letter with placeholders like [Date], [Recipient Name], etc., if specific official names are unknown. Include a clear subject line. 
Return ONLY the Markdown text.
`;

    const responseText = await generateContentSafe(model, prompt);
    let markdownContent = responseText.replace(/```markdown/g, '').replace(/```/g, '').trim();

    console.log(`[SchemeRoutes] Converting Application Letter for Scheme ${id} to PDF...`);
    const pdf = await mdToPdf(
      { content: markdownContent },
      { 
        launch_options: { 
          executablePath: puppeteer.executablePath(),
          args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        },
        pdf_options: { format: 'A4', margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } },
        css: `
          body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000; }
          h1, h2, h3 { font-family: "Arial", sans-serif; text-align: center; margin-bottom: 15px; }
          h1 { font-size: 16pt; font-weight: bold; text-decoration: underline; }
          p { margin-bottom: 12px; }
        `
      }
    );

    console.log(`[SchemeRoutes] Uploading PDF to Cloudinary...`);
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

    const pdf_url = uploadResult.secure_url;

    const documentData = {
      response_type: "document_draft",
      document_type: `Application for ${scheme.scheme_name}`,
      markdown_content: markdownContent,
      pdf_url: pdf_url,
      disclaimer: "This document was generated using AI. Please review and ensure all details are accurate before official submission.",
      created_at: new Date().toISOString()
    };

    // Save to database
    await supabase.from('messages').insert([{
      case_id: caseId,
      role: 'assistant',
      content: documentData
    }]);

    res.json(documentData);

  } catch (error) {
    console.error("[SchemeRoutes] Error drafting application:", error);
    if (error.code && error.code.startsWith('AI_')) {
      return res.status(error.status || 500).json({ success: false, error: error.message, code: error.code });
    }
    res.status(500).json({ success: false, error: 'Failed to draft application' });
  }
});

// 4. Search Schemes
router.get('/search', requireAuth, (req, res) => {
  try {
    const { q } = req.query;
    const results = schemeService.searchSchemes(q);
    res.json(results);
  } catch (error) {
    console.error("[SchemeRoutes] Error searching schemes:", error);
    res.status(500).json({ error: 'Failed to search schemes' });
  }
});

// 5. Check Eligibility for Single Scheme
router.post('/:id/check', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const profile = req.body;
    
    const result = schemeService.checkEligibility(id, profile);
    if (!result) return res.status(404).json({ error: 'Scheme not found' });

    res.json(result);
  } catch (error) {
    console.error("[SchemeRoutes] Error checking eligibility:", error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// 6. Explain Single Scheme Eligibility
router.post('/:id/explain_eligibility', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { profile, result } = req.body; // result is the { status, passed, failed, missing } object

    const scheme = schemeService.getSchemeById(id);
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API Key missing.' });
    }

    const model = getGeminiModel();

    const prompt = `
You are Adhikaar, a helpful government scheme assistant. 
Explain to the user why they received the following eligibility result for the scheme: "${scheme.scheme_name}".

User Profile:
Age: ${profile.age || 'Not provided'}
Income: ${profile.annual_income || 'Not provided'}
State: ${profile.state || 'Not provided'}

Deterministic Eligibility Result: ${result.status}
Passed criteria: ${JSON.stringify(result.passed)}
Failed criteria: ${JSON.stringify(result.failed)}
Missing criteria: ${JSON.stringify(result.missing)}

Rules:
1. Explain simply in 2-3 short sentences.
2. If ELIGIBLE, tell them they appear eligible based on the passed criteria.
3. If ALMOST_ELIGIBLE or NOT_ELIGIBLE, gently explain exactly which criteria they missed based on the 'failed' array. Do NOT invent criteria.
4. Do not make decisions yourself; just explain the system's result.
`;
    const explanationText = await generateContentSafe(model, prompt);
    res.json({ explanation: explanationText });
  } catch (error) {
    console.error("[SchemeRoutes] Error explaining eligibility:", error);
    if (error.code && error.code.startsWith('AI_')) {
      return res.status(error.status || 500).json({ success: false, error: error.message, code: error.code });
    }
    res.status(500).json({ success: false, error: 'Failed to explain eligibility' });
  }
});

// 7. Chat About Scheme
router.post('/:id/chat', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { query, result } = req.body;

    const scheme = schemeService.getSchemeById(id);
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API Key missing.' });
    }

    const model = getGeminiModel({ tools: [{ googleSearchRetrieval: {} }] });


    const prompt = `
You are Adhikaar, a helpful assistant answering questions about the Indian government scheme: "${scheme.scheme_name}".
Here is the official scheme data we have on file:
Description: ${scheme.description}
Benefits: ${scheme.benefits}
Eligibility: ${scheme.eligibility}
Application Process: ${scheme.application_process}
Documents Required: ${scheme.documents_required}

The user's current eligibility status for this scheme is: ${result ? result.status : 'Unknown'}.

User's Question: "${query}"

Rules:
1. Answer the question using the scheme data provided above.
2. If the user's question asks for information not in the data (e.g. current deadlines, latest news, official URLs), USE YOUR GOOGLE SEARCH TOOL to find the most up-to-date and accurate information on the web.
3. Do not invent documents, benefits, or URLs. If you search and still cannot find it, state that you do not have that information.
4. Keep the answer brief and citizen-friendly.
`;

    const answerText = await generateContentSafe(model, prompt);
    res.json({ answer: answerText });
  } catch (error) {
    console.error("[SchemeRoutes] Error in scheme chat:", error);
    if (error.code && error.code.startsWith('AI_')) {
      return res.status(error.status || 500).json({ success: false, error: error.message, code: error.code });
    }
    res.status(500).json({ success: false, error: 'Failed to chat about scheme' });
  }
});

export default router;
