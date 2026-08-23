import fs from 'fs';
const central = JSON.parse(fs.readFileSync(new URL('./centralscheme.json', import.meta.url)));
const state = JSON.parse(fs.readFileSync(new URL('./statescheme.json', import.meta.url)));
const all = [...central, ...state];

const missingCriteria = all.filter(s => {
  const crit = s.eligibility_criteria;
  if (!crit) return true;
  if (Object.keys(crit).length === 0) return true;
  
  // If ALL structured data is null/default, it is considered missing
  if (crit.age_min === null && 
      crit.age_max === null && 
      crit.income_max === null && 
      crit.gender === 'all' && 
      crit.caste.length === 0 && 
      !crit.bpl_required && 
      !crit.disability_required) {
    return true;
  }
  return false;
});

const total = all.length;
const missingCount = missingCriteria.length;
const validCount = total - missingCount;
const percentage = ((validCount / total) * 100).toFixed(2);

console.log('');
console.log('DATA QUALITY REPORT');
console.log('='.repeat(50));
console.log(`Total schemes: ${total}`);
console.log(`Schemes WITH verified criteria: ${validCount} (${percentage}%)`);
console.log(`Schemes WITHOUT criteria (Needs Verification): ${missingCount}`);
console.log('');

console.log('SAMPLE SCHEMES (first 5 with criteria):');
withCriteria.slice(0, 5).forEach(s => {
  console.log(`  ✓ ${s.scheme_name.substring(0, 40)}`);
  console.log(`    age_min: ${s.eligibility_criteria.age_min} (type: ${typeof s.eligibility_criteria.age_min})`);
  console.log(`    age_max: ${s.eligibility_criteria.age_max} (type: ${typeof s.eligibility_criteria.age_max})`);
  console.log(`    income_max: ${s.eligibility_criteria.income_max}`);
  console.log('');
});
