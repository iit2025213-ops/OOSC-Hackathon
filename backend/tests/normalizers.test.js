import assert from 'assert';
import {
  normalizeState,
  parseIncome,
  normalizeGender,
  parseAge,
  normalizeCaste
} from '../utils/normalizers.js';

try {
  console.log("Testing normalizeState...");
  assert.strictEqual(normalizeState("Goa"), "goa");
  assert.strictEqual(normalizeState("GOA"), "goa");
  assert.strictEqual(normalizeState("Goa State"), "goa");
  assert.strictEqual(normalizeState("Goalpara"), null); // Goalpara should be unparseable
  
  console.log("Testing parseIncome...");
  assert.strictEqual(parseIncome(250000), 250000);
  assert.strictEqual(parseIncome("250000"), 250000);
  assert.strictEqual(parseIncome("₹2,50,000"), 250000);
  assert.strictEqual(parseIncome("Rs. 2 Lakhs"), 200000);
  assert.strictEqual(parseIncome("2.5 Lakhs"), 250000);
  assert.strictEqual(parseIncome("2.5 lakh"), 250000);
  assert.strictEqual(parseIncome("₹ 2.5 Lakh"), 250000);
  assert.strictEqual(parseIncome("5 Crore"), 50000000);
  assert.strictEqual(parseIncome("1.2 Cr"), 12000000);
  assert.strictEqual(parseIncome("Rs 50,000 per annum"), 50000);
  assert.strictEqual(parseIncome("invalid"), "UNPARSEABLE");

  console.log("Testing normalizeGender...");
  assert.strictEqual(normalizeGender("female"), "female");
  assert.strictEqual(normalizeGender("woman"), "female");
  assert.strictEqual(normalizeGender("women"), "female");
  assert.strictEqual(normalizeGender("girl"), "female");
  assert.strictEqual(normalizeGender("girls"), "female");
  assert.strictEqual(normalizeGender("lady"), "female");
  assert.strictEqual(normalizeGender("ladies"), "female");
  assert.strictEqual(normalizeGender("male"), "male");
  assert.strictEqual(normalizeGender("man"), "male");
  assert.strictEqual(normalizeGender("boys"), "male");
  assert.strictEqual(normalizeGender("transgender"), "transgender");
  assert.strictEqual(normalizeGender("third gender"), "transgender");
  
  console.log("Testing parseAge...");
  assert.deepStrictEqual(parseAge("18-25"), { min: 18, max: 25 });
  assert.deepStrictEqual(parseAge("18 to 25 years"), { min: 18, max: 25 });
  assert.deepStrictEqual(parseAge("18 - 25"), { min: 18, max: 25 });
  assert.deepStrictEqual(parseAge("Age: 18 to 25"), { min: 18, max: 25 });
  assert.deepStrictEqual(parseAge("below 25"), { min: null, max: 25 });
  assert.deepStrictEqual(parseAge("up to 25 years"), { min: null, max: 25 });
  assert.deepStrictEqual(parseAge("above 18"), { min: 18, max: null });
  assert.deepStrictEqual(parseAge("25 years"), { min: 25, max: null }); // default treats single as min 

  console.log("Testing normalizeCaste...");
  assert.deepStrictEqual(normalizeCaste("OBC"), ["OBC"]);
  assert.deepStrictEqual(normalizeCaste("Other Backward Classes"), ["OBC"]);
  assert.deepStrictEqual(normalizeCaste("Other Backward Class"), ["OBC"]);
  assert.deepStrictEqual(normalizeCaste("SC"), ["SC"]);
  assert.deepStrictEqual(normalizeCaste("Scheduled Caste"), ["SC"]);
  assert.deepStrictEqual(normalizeCaste("ST"), ["ST"]);
  assert.deepStrictEqual(normalizeCaste("Scheduled Tribes"), ["ST"]);
  assert.deepStrictEqual(normalizeCaste("EWS"), ["EWS"]);
  assert.deepStrictEqual(normalizeCaste("Economically Weaker Section"), ["EWS"]);
  assert.deepStrictEqual(normalizeCaste("General"), ["GENERAL"]);
  assert.deepStrictEqual(normalizeCaste("Unreserved"), ["GENERAL"]);
  assert.deepStrictEqual(normalizeCaste(["SC", "ST", "OBC"]), ["SC", "ST", "OBC"]);
  
  console.log("ALL NORMALIZER TESTS PASSED SUCCESSFULLY.");
} catch (err) {
  console.error("TEST FAILED:", err);
  process.exit(1);
}
