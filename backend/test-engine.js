import fs from 'fs';
import schemeService from './services/schemeService.js';

console.log("Is Loaded:", schemeService.isLoaded);
console.log("Total Schemes:", schemeService.schemes.length);

const profile = { age: 2 };

// Find a scheme that requires age > 18
const adultScheme = schemeService.schemes.find(s => s.eligibility_criteria && s.eligibility_criteria.age_min >= 18);
if (adultScheme) {
  console.log("Found Adult Scheme:", adultScheme.scheme_name);
  console.log("Raw Eligibility:", adultScheme.eligibility_criteria);
  const check = schemeService.checkEligibility(adultScheme.id, profile);
  console.log("Check result passed:", check.passed);
  console.log("Check result failed:", check.failed);
  console.log("Check result missing:", check.missing);
}

// Check some of the schemes that match age=2
const matchResult = schemeService.matchSchemes(profile, []);
console.log(`\nMatched ${matchResult.summary.eligible_count} eligible schemes for age=2, and ${matchResult.summary.almost_eligible_count} almost eligible.`);

console.log("\nSample 10 Eligible Schemes for age=2:");
const sample = matchResult.eligible.slice(0, 10);
sample.forEach(s => {
  const fullScheme = schemeService.getSchemeById(s.id);
  console.log(`- ${fullScheme.scheme_name}`);
  // Find raw object to show raw criteria before normalization
  // Actually fullScheme.eligibility_criteria is already normalized in schemeService constructor!
  console.log(`  Normalized criteria:`, fullScheme.eligibility_criteria);
});
