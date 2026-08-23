import schemeService from './services/schemeService.js';

console.log('\n' + '='.repeat(70));
console.log('TODDLER BUG REPRODUCTION TEST');
console.log('='.repeat(70) + '\n');

// The bug: age=2 should NOT match adult schemes
const buggyProfile = {
  age: 2,
  gender: 'male',
  annual_income: null,
  caste: null,
  state: null,
  bpl: null,
  disability: null,
};

console.log('Test Profile:', JSON.stringify(buggyProfile, null, 2));
console.log('\nRunning matchSchemes()...\n');

// Wait for data to load
setTimeout(() => {
  const results = schemeService.matchSchemes(buggyProfile);

  console.log(`RESULTS FOR AGE=2:`);
  console.log(`  Eligible: ${results.eligible.length} schemes`);
  console.log(`  Almost Eligible: ${results.almost_eligible.length} schemes`);
  console.log(`  Total Matching: ${results.eligible.length + results.almost_eligible.length}`);
  console.log('\n');

  if (results.eligible.length > 50) {
    console.log('🔴 BUG CONFIRMED: Age 2 matched ' + results.eligible.length + ' schemes (should be < 10)');
    console.log('\nFirst 10 eligible schemes for age=2:');
    results.eligible.slice(0, 10).forEach((scheme, idx) => {
      const ec = scheme.eligibility_criteria || {};
      console.log(`  ${idx + 1}. ${scheme.scheme_name}`);
      console.log(`     age_min: ${ec.age_min}, age_max: ${ec.age_max}`);
    });
  } else {
    console.log('✓ Bug not reproduced (age 2 matched only ' + results.eligible.length + ' schemes)');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}, 500);
