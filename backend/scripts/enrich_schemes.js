import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getGeminiModel, generateContentSafe } from '../config/gemini.js';
import * as normalizers from '../utils/normalizers.js';

// Setup ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure scripts directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

// Load env vars (adjust path if your .env is elsewhere)
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const CENTRAL_FILE = path.join(__dirname, '../centralscheme.json');
const STATE_FILE = path.join(__dirname, '../statescheme.json');
const OUTPUT_FILE = path.join(__dirname, '../enriched_test.json');

// How many schemes to test in this dry run
const LIMIT = 2000; // Large enough to process all 1255 broken schemes

async function enrichSchemes() {
  console.log(`[Enrichment] Starting script...`);
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set. Exiting.");
    process.exit(1);
  }

  const central = JSON.parse(fs.readFileSync(CENTRAL_FILE, 'utf-8'));
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  const allSchemes = [...central, ...state];

  console.log(`[Enrichment] Loaded ${allSchemes.length} schemes.`);

  // Find schemes that need enrichment (missing criteria entirely, or age_min is null)
  const needsEnrichment = allSchemes.filter(s => {
    const crit = s.eligibility_criteria;
    if (!crit) return true;
    if (Object.keys(crit).length === 0) return true;
    // Missing key fields
    if (crit.age_min === null && crit.age_max === null && crit.income_max === null) return true;
    return false;
  });

  console.log(`[Enrichment] Found ${needsEnrichment.length} schemes that need data extraction.`);
  const batch = needsEnrichment.slice(0, LIMIT);
  console.log(`[Enrichment] Processing batch of ${batch.length}...`);

  const model = getGeminiModel();
  const enrichedResults = [];

  for (let i = 0; i < batch.length; i++) {
    const scheme = batch[i];
    console.log(`\n[${i+1}/${batch.length}] Processing: ${scheme.scheme_name}`);

    const prompt = `
You are an expert data extractor. Your task is to extract exact eligibility criteria from the Indian government scheme described below.

**Scheme Name:** ${scheme.scheme_name}
**Description:** ${scheme.description}
**Benefits:** ${scheme.benefits}
**Eligibility Text:** ${scheme.eligibility || 'N/A'}
**Full Details:** ${scheme.full_details || 'N/A'}

Read the text carefully. Extract the following fields as JSON only (no markdown, no backticks).
If a field is not explicitly mentioned, use null.
- age_min: (number or null) Minimum age required.
- age_max: (number or null) Maximum age allowed.
- income_max: (number or null) Maximum income allowed (extract numerical value, e.g. 200000).
- gender: ("all", "male", "female", "transgender")

Return ONLY valid JSON format.
Example: {"age_min": 18, "age_max": null, "income_max": 250000, "gender": "female"}
    `;

    try {
      // 1. Call Gemini
      const resultText = await generateContentSafe(model, prompt);
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const extracted = JSON.parse(cleaned);

      // 2. Normalize and inject the extracted data safely
      const ec = scheme.eligibility_criteria || {
        age_min: null, age_max: null, gender: 'all', income_max: null, 
        bpl_required: false, disability_required: false, caste: []
      };

      if (extracted.age_min !== null) ec.age_min = normalizers.parseAge(extracted.age_min)?.min || null;
      if (extracted.age_max !== null) ec.age_max = normalizers.parseAge(extracted.age_max)?.max || null;
      if (extracted.income_max !== null) ec.income_max = normalizers.parseIncome(extracted.income_max);
      if (extracted.gender !== null) ec.gender = normalizers.normalizeGender(extracted.gender);

      scheme.eligibility_criteria = ec;
      
      console.log(`  -> Success! Extracted:`, JSON.stringify(extracted));
      enrichedResults.push(scheme);

    } catch (err) {
      console.error(`  -> Failed to enrich:`, err.message);
      enrichedResults.push(scheme); // Push it anyway so we don't lose data
    }

    // Rate limiting: sleep for 4.5 seconds between calls (to stay safely under 15 requests/min limit)
    await new Promise(r => setTimeout(r, 4500));
  }

  // Save the test output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedResults, null, 2));
  console.log(`\n[Enrichment] Wrote ${enrichedResults.length} schemes to ${OUTPUT_FILE}`);
  console.log(`Please review ${OUTPUT_FILE} to verify the data quality.`);
}

enrichSchemes();
