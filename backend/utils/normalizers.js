export function cleanString(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '');
}

const STATES_MAP = {
  "andaman and nicobar islands": "andaman and nicobar islands",
  "andhra pradesh": "andhra pradesh",
  "arunachal pradesh": "arunachal pradesh",
  "assam": "assam",
  "bihar": "bihar",
  "chandigarh": "chandigarh",
  "chhattisgarh": "chhattisgarh",
  "dadra and nagar haveli and daman and diu": "dadra and nagar haveli and daman and diu",
  "dadra and nagar haveli": "dadra and nagar haveli and daman and diu",
  "daman and diu": "dadra and nagar haveli and daman and diu",
  "delhi": "delhi",
  "nct of delhi": "delhi",
  "new delhi": "delhi",
  "goa": "goa",
  "gujarat": "gujarat",
  "haryana": "haryana",
  "himachal pradesh": "himachal pradesh",
  "jammu and kashmir": "jammu and kashmir",
  "jharkhand": "jharkhand",
  "karnataka": "karnataka",
  "kerala": "kerala",
  "ladakh": "ladakh",
  "lakshadweep": "lakshadweep",
  "madhya pradesh": "madhya pradesh",
  "maharashtra": "maharashtra",
  "manipur": "manipur",
  "meghalaya": "meghalaya",
  "mizoram": "mizoram",
  "nagaland": "nagaland",
  "odisha": "odisha",
  "orissa": "odisha",
  "puducherry": "puducherry",
  "pondicherry": "puducherry",
  "punjab": "punjab",
  "rajasthan": "rajasthan",
  "sikkim": "sikkim",
  "tamil nadu": "tamil nadu",
  "telangana": "telangana",
  "tripura": "tripura",
  "uttar pradesh": "uttar pradesh",
  "uttarakhand": "uttarakhand",
  "west bengal": "west bengal"
};

export function normalizeState(stateStr) {
  if (!stateStr) return null;
  const clean = String(stateStr)
    .toLowerCase()
    .replace(/ state$/i, '')
    .replace(/ ut$/i, '')
    .trim();
  
  return STATES_MAP[clean] || null;
}

export function parseIncome(incomeStr) {
  if (incomeStr === null || incomeStr === undefined || incomeStr === '') return null;
  if (typeof incomeStr === 'number') return incomeStr;
  
  const clean = String(incomeStr).toLowerCase().replace(/,/g, '');
  
  // Extract number including optional decimal (e.g., 2, 2.5, 0.5)
  const numMatch = clean.match(/\d*\.?\d+/);
  if (!numMatch) return null;
  
  let num = parseFloat(numMatch[0]);
  if (isNaN(num)) return null;
  
  if (clean.includes('lakh') || clean.includes('lakhs')) {
    num *= 100000;
  } else if (clean.includes('crore') || clean.includes('cr') || clean.includes('crores')) {
    num *= 10000000;
  } else if (clean.includes('thousand')) {
    num *= 1000;
  }
  
  return num;
}

export function normalizeGender(genderStr) {
  if (!genderStr) return 'all';
  const clean = String(genderStr).toLowerCase().trim();
  
  if (['female', 'woman', 'women', 'girl', 'girls', 'lady', 'ladies'].includes(clean)) return 'female';
  if (['male', 'man', 'men', 'boy', 'boys'].includes(clean)) return 'male';
  if (['transgender', 'trans', 'third gender'].includes(clean)) return 'transgender';
  
  return 'all';
}

export function parseAge(ageStr) {
  const norm = { min: null, max: null };
  if (ageStr === null || ageStr === undefined || ageStr === '') return norm;
  
  if (typeof ageStr === 'number') {
    norm.min = ageStr;
    return norm;
  }
  
  const clean = String(ageStr).toLowerCase().replace(/–/g, '-'); // handle unicode dashes
  
  // Range: "18-25", "18 to 25"
  const rangeMatch = clean.match(/(\d+)\s*(?:-|to)\s*(\d+)/);
  if (rangeMatch) {
    norm.min = parseFloat(rangeMatch[1]);
    norm.max = parseFloat(rangeMatch[2]);
    return norm;
  }
  
  // Max limits
  const maxMatch = clean.match(/(?:below|under|up to|upto|maximum|max|less than)\s*(\d+)/);
  if (maxMatch) {
    norm.max = parseFloat(maxMatch[1]);
    return norm;
  }
  
  // Min limits
  const minMatch = clean.match(/(?:above|minimum|min|more than|at least)\s*(\d+)/);
  if (minMatch) {
    norm.min = parseFloat(minMatch[1]);
    return norm;
  }
  
  // Default to min if it's just a number
  const numMatch = clean.match(/[\d.]+/);
  if (numMatch) {
    norm.min = parseFloat(numMatch[0]);
    return norm;
  }
  
  return null;
}

export function normalizeCaste(casteInput) {
  if (!casteInput) return [];
  
  const casteArr = Array.isArray(casteInput) ? casteInput : String(casteInput).split(',');
  const normalized = new Set();
  
  for (let c of casteArr) {
    const clean = String(c).toLowerCase().trim().replace(/[.\/]/g, '');
    if (!clean) continue;
    
    if (['obc', 'other backward class', 'other backward classes'].includes(clean)) normalized.add('OBC');
    else if (['sc', 'scheduled caste', 'scheduled castes'].includes(clean)) normalized.add('SC');
    else if (['st', 'scheduled tribe', 'scheduled tribes'].includes(clean)) normalized.add('ST');
    else if (['ews', 'economically weaker section', 'economic weaker section'].includes(clean)) normalized.add('EWS');
    else if (['general', 'gen', 'ur', 'unreserved'].includes(clean)) normalized.add('GENERAL');
    else normalized.add(clean.toUpperCase()); 
  }
  
  return Array.from(normalized);
}

export function normalizeArray(arr) {
  if (!arr) return [];
  if (!Array.isArray(arr)) {
    if (typeof arr === 'string') return [arr.trim()];
    return [];
  }
  return arr.map(a => String(a).trim()).filter(a => a.length > 0);
}
