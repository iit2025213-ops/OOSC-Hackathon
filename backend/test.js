// backend/test_normalizers.js
import * as normalizers from './utils/normalizers.js';

console.log('\n' + '='.repeat(60));
console.log('NORMALIZER TEST SUITE');
console.log('='.repeat(60) + '\n');

// Test parseIncome with real examples
console.log('Testing parseIncome():');
const incomeTests = [
  { input: '200000', expected: 200000, source: 'plain number' },
  { input: '2,00,000', expected: 200000, source: 'Indian format' },
  { input: '2.5 Lakh', expected: 250000, source: 'text amount' },
  { input: '₹2,50,000', expected: 250000, source: 'with rupee symbol' },
  { input: '2 Crore', expected: 20000000, source: 'crore' },
  { input: 'nil', expected: null, source: 'invalid' },
  { input: '', expected: null, source: 'empty' },
  { input: null, expected: null, source: 'null' },
  { input: 'varies', expected: null, source: 'non-numeric' },
];

let incomePass = 0, incomeFail = 0;
incomeTests.forEach(({ input, expected, source }) => {
  const result = normalizers.parseIncome(input);
  const pass = result === expected;
  if (pass) {
    console.log(`  ✓ parseIncome(${JSON.stringify(input)}) = ${result} (${source})`);
    incomePass++;
  } else {
    console.log(`  ✗ parseIncome(${JSON.stringify(input)}) = ${result}, expected ${expected} (${source})`);
    incomeFail++;
  }
});
console.log(`\nIncome: ${incomePass} passed, ${incomeFail} FAILED\n`);

// Test parseAge
console.log('Testing parseAge():');
const ageTests = [
  { input: 25, expected: 25, source: 'number' },
  { input: '25', expected: 25, source: 'string number' },
  { input: 'twenty-five', expected: null, source: 'text' },
  { input: null, expected: null, source: 'null' },
  { input: '', expected: null, source: 'empty' },
  { input: -5, expected: null, source: 'negative' },
  { input: 150, expected: null, source: 'too high' },
];

let agePass = 0, ageFail = 0;
ageTests.forEach(({ input, expected, source }) => {
  const result = normalizers.parseAge(input);
  const pass = result === expected;
  if (pass) {
    console.log(`  ✓ parseAge(${JSON.stringify(input)}) = ${result} (${source})`);
    agePass++;
  } else {
    console.log(`  ✗ parseAge(${JSON.stringify(input)}) = ${result}, expected ${expected} (${source})`);
    ageFail++;
  }
});
console.log(`\nAge: ${agePass} passed, ${ageFail} FAILED\n`);

// Test normalizeState
console.log('Testing normalizeState():');
const stateTests = [
  { input: 'maharashtra', expected: 'maharashtra', source: 'lowercase' },
  { input: 'MAHARASHTRA', expected: 'maharashtra', source: 'uppercase' },
  { input: 'Maharashtra', expected: 'maharashtra', source: 'mixed case' },
  { input: 'karnataka ', expected: 'karnataka', source: 'with trailing space' },
];

let statePass = 0, stateFail = 0;
stateTests.forEach(({ input, expected, source }) => {
  const result = normalizers.normalizeState(input);
  const pass = result === expected;
  if (pass) {
    console.log(`  ✓ normalizeState(${JSON.stringify(input)}) = ${result} (${source})`);
    statePass++;
  } else {
    console.log(`  ✗ normalizeState(${JSON.stringify(input)}) = ${result}, expected ${expected} (${source})`);
    stateFail++;
  }
});
console.log(`\nState: ${statePass} passed, ${stateFail} FAILED\n`);

console.log('='.repeat(60));
if (incomeFail + ageFail + stateFail > 0) {
  console.log('⚠️  SOME TESTS FAILED - Your normalizers have bugs');
} else {
  console.log('✓ All normalizer tests passed');
}
console.log('='.repeat(60) + '\n');