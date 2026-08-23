import schemeService from './services/schemeService.js';

const profile = { age: 2 };
const result = schemeService.matchSchemes(profile);
console.log("BEFORE FIX:");
console.log(`Eligible: ${result.summary.eligible_count}`);
console.log(`Almost Eligible: ${result.summary.almost_eligible_count}`);

const sample = result.eligible.slice(0, 3);
console.log("Sample 3 Eligible Schemes:");
sample.forEach(s => console.log(`- ${s.scheme_name} (${s.source_type})`));
