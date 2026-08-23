import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CENTRAL_FILE = path.join(__dirname, '../centralscheme.json');
const STATE_FILE = path.join(__dirname, '../statescheme.json');
const OUTPUT_FILE = path.join(__dirname, '../enriched_test.json'); // Reusing this output file name

console.log(`[Regex ETL] Starting offline extraction...`);

const central = JSON.parse(fs.readFileSync(CENTRAL_FILE, 'utf-8'));
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
const allSchemes = [...central, ...state];

const needsEnrichment = allSchemes.filter(s => {
  const crit = s.eligibility_criteria;
  if (!crit) return true;
  if (Object.keys(crit).length === 0) return true;
  if (crit.age_min === null && crit.age_max === null && crit.income_max === null) return true;
  return false;
});

console.log(`[Regex ETL] Found ${needsEnrichment.length} schemes missing data.`);

let extractedCount = 0;

function extractWithRegex(text) {
  if (!text) return null;
  text = text.toLowerCase();
  
  let age_min = null;
  let age_max = null;
  let income_max = null;
  
  // 1. Hunt for Age
  // Pattern: "18 to 60 years" or "between 18 and 60"
  const ageRangeMatch = text.match(/(?:between|from)?\s*(\d{1,2})\s*(?:to|and|-)\s*(\d{1,2})\s*years?/);
  if (ageRangeMatch) {
    age_min = parseInt(ageRangeMatch[1]);
    age_max = parseInt(ageRangeMatch[2]);
  }
  
  // Pattern: "above 60 years" or "minimum age is 18"
  const ageMinMatch = text.match(/(?:above|minimum age|more than|at least)\s*(\d{1,2})\s*years?/);
  if (ageMinMatch && !age_min) age_min = parseInt(ageMinMatch[1]);

  // Pattern: "below 18 years" or "maximum age 35"
  const ageMaxMatch = text.match(/(?:below|maximum age|up to|less than)\s*(\d{1,2})\s*years?/);
  if (ageMaxMatch && !age_max) age_max = parseInt(ageMaxMatch[1]);

  // 2. Hunt for Income
  // Pattern: "income below 2,00,000" or "Rs. 2.5 lakh" or "Rs 200000"
  // Look for "lakh"
  const lakhMatch = text.match(/(?:income|salary).*?(?:rs\.?|rupees|below|upto|up to)\s*([\d\.]+)\s*lakh/);
  if (lakhMatch) {
    income_max = parseFloat(lakhMatch[1]) * 100000;
  } else {
    // Look for raw numbers like "Rs. 150000" or "Rs 1,50,000"
    const rawMatch = text.match(/(?:income|salary).*?(?:rs\.?|rupees|below|upto|up to)\s*([\d,]{4,9})/);
    if (rawMatch) {
      income_max = parseInt(rawMatch[1].replace(/,/g, ''));
    }
  }

  // 3. Gender
  let gender = 'all';
  if (text.includes('women') || text.includes('girl') || text.includes('female') || text.includes('pregnant')) {
    if (!text.includes('men') && !text.includes('boy')) {
      gender = 'female';
    }
  }

  if (age_min !== null || age_max !== null || income_max !== null || gender !== 'all') {
    return { age_min, age_max, income_max, gender };
  }
  return null;
}

const enrichedResults = [];

for (const scheme of needsEnrichment) {
  const combinedText = `${scheme.description || ''} ${scheme.eligibility || ''} ${scheme.full_details || ''}`;
  
  const extracted = extractWithRegex(combinedText);
  
  if (extracted) {
    const ec = scheme.eligibility_criteria || {
      age_min: null, age_max: null, gender: 'all', income_max: null, 
      bpl_required: false, disability_required: false, caste: []
    };
    
    if (extracted.age_min) ec.age_min = extracted.age_min;
    if (extracted.age_max) ec.age_max = extracted.age_max;
    if (extracted.income_max) ec.income_max = extracted.income_max;
    if (extracted.gender) ec.gender = extracted.gender;
    
    scheme.eligibility_criteria = ec;
    enrichedResults.push(scheme);
    extractedCount++;
  }
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedResults, null, 2));

console.log(`\n[Regex ETL] Scanning Complete!`);
console.log(`[Regex ETL] Successfully recovered hidden data for ${extractedCount} schemes!`);
console.log(`[Regex ETL] Wrote the recovered schemes to ${OUTPUT_FILE}`);
console.log(`Run 'node merge_enriched.js' to inject them into your database.`);
