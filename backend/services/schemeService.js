import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  cleanString,
  normalizeState,
  parseIncome,
  normalizeGender,
  parseAge,
  normalizeCaste,
  normalizeArray
} from '../utils/normalizers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SchemeService {
  constructor() {
    this.schemes = [];
    this.isLoaded = false;
    this.loadSchemes();
  }

  loadSchemes() {
    try {
      console.log("[SchemeService] Loading scheme datasets...");
      
      const centralPath = path.join(__dirname, '..', 'centralscheme.json');
      let centralData = [];
      if (fs.existsSync(centralPath)) {
        centralData = JSON.parse(fs.readFileSync(centralPath, 'utf8'));
      }
      
      const statePath = path.join(__dirname, '..', 'statescheme.json');
      let stateData = [];
      if (fs.existsSync(statePath)) {
        stateData = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      }

      // Normalize central schemes
      const normalizedCentral = centralData.map((scheme, index) => ({
        id: `central_${index}`,
        source_type: 'central',
        state: null,
        scheme_name: cleanString(scheme.scheme_name) || "Unknown Scheme",
        description: cleanString(scheme.description),
        ministry: cleanString(scheme.ministry),
        department: cleanString(scheme.department),
        category: normalizeArray(scheme.category),
        beneficiary_type: normalizeArray(scheme.beneficiary_type),
        benefits: cleanString(scheme.benefits),
        eligibility: cleanString(scheme.eligibility),
        application_process: cleanString(scheme.application_process),
        documents_required: cleanString(scheme.documents_required),
        apply_url: cleanString(scheme.apply_url),
        official_url: cleanString(scheme.official_url),
        eligibility_criteria: this.normalizeCriteria(scheme.eligibility_criteria)
      }));

      // Normalize state schemes
      const normalizedState = stateData.map((scheme, index) => ({
        id: `state_${index}`,
        source_type: 'state',
        state: normalizeState(scheme.state),
        scheme_name: cleanString(scheme.scheme_name) || "Unknown Scheme",
        description: cleanString(scheme.description),
        ministry: cleanString(scheme.ministry),
        department: cleanString(scheme.department),
        category: normalizeArray(scheme.category),
        beneficiary_type: normalizeArray(scheme.beneficiary_type),
        benefits: cleanString(scheme.benefits),
        eligibility: cleanString(scheme.eligibility),
        application_process: cleanString(scheme.application_process),
        documents_required: cleanString(scheme.documents_required),
        apply_url: cleanString(scheme.apply_url),
        official_url: cleanString(scheme.official_url),
        eligibility_criteria: this.normalizeCriteria(scheme.eligibility_criteria)
      }));

      this.schemes = [...normalizedCentral, ...normalizedState];
      this.isLoaded = true;
      console.log(`[SchemeService] Successfully loaded ${normalizedCentral.length} central and ${normalizedState.length} state schemes.`);
    } catch (error) {
      console.error("[SchemeService] Failed to load schemes:", error);
    }
  }

  normalizeCriteria(criteria) {
    const norm = {
      gender: 'all',
      age_min: null,
      age_max: null,
      caste: [],
      income_max: null,
      bpl_required: false,
      disability_required: false
    };

    if (!criteria) return norm;

    norm.gender = normalizeGender(criteria.gender);

    const parsedMinAge = parseAge(criteria.age_min);
    if (parsedMinAge === 'UNPARSEABLE') norm.age_min = 'UNPARSEABLE';
    else if (parsedMinAge && parsedMinAge.min !== null) norm.age_min = parsedMinAge.min;
    
    const parsedMaxAge = parseAge(criteria.age_max);
    if (parsedMaxAge === 'UNPARSEABLE') norm.age_max = 'UNPARSEABLE';
    else if (parsedMaxAge && parsedMaxAge.max !== null) norm.age_max = parsedMaxAge.max;

    if (parsedMinAge !== 'UNPARSEABLE' && parsedMinAge.max !== null && norm.age_max === null) norm.age_max = parsedMinAge.max;
    if (parsedMaxAge !== 'UNPARSEABLE' && parsedMaxAge.min !== null && norm.age_min === null) norm.age_min = parsedMaxAge.min;

    if (norm.age_min === 'UNPARSEABLE') console.warn(`[SchemeService] Unparseable age_min: ${criteria.age_min}`);
    if (norm.age_max === 'UNPARSEABLE') console.warn(`[SchemeService] Unparseable age_max: ${criteria.age_max}`);

    norm.income_max = parseIncome(criteria.income_max);
    if (norm.income_max === 'UNPARSEABLE') console.warn(`[SchemeService] Unparseable income_max: ${criteria.income_max}`);

    norm.caste = normalizeCaste(criteria.caste);

    if (criteria.bpl_required === true || criteria.bpl_required === "true") norm.bpl_required = true;
    if (criteria.disability_required === true || criteria.disability_required === "true") norm.disability_required = true;

    return norm;
  }

  getSchemeById(id) {
    return this.schemes.find(s => s.id === id);
  }

  searchSchemes(query, limit = 20) {
    if (!this.isLoaded || !query) return [];
    const lowerQuery = query.toLowerCase();
    
    // Simple relevance scoring
    const scored = this.schemes.map(s => {
      let score = 0;
      if (s.scheme_name.toLowerCase().includes(lowerQuery)) {
        if (s.scheme_name.toLowerCase() === lowerQuery) score += 100;
        else if (s.scheme_name.toLowerCase().startsWith(lowerQuery)) score += 50;
        else score += 10;
      }
      if (s.description && s.description.toLowerCase().includes(lowerQuery)) score += 2;
      if (s.ministry && s.ministry.toLowerCase().includes(lowerQuery)) score += 1;
      
      return { scheme: s, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        id: s.scheme.id,
        scheme_name: s.scheme.scheme_name,
        ministry: s.scheme.ministry,
        source_type: s.scheme.source_type
      }));
  }

  checkEligibility(schemeId, userProfile) {
    const scheme = this.getSchemeById(schemeId);
    if (!scheme) return null;

    const uAge = userProfile.age ? parseInt(userProfile.age) : null;
    const uGender = normalizeGender(userProfile.gender);
    const uCaste = normalizeCaste(userProfile.caste);
    const uIncome = parseIncome(userProfile.annual_income);
    const uBpl = !!userProfile.bpl;
    const uDisability = !!userProfile.disability;
    const uState = normalizeState(userProfile.state);

    const crit = scheme.eligibility_criteria;
    const passed = [];
    const failed = [];
    const missing = [];

    // State
    if (scheme.source_type === 'state') {
      if (scheme.state === null) {
        failed.push({ criterion: "State Requirement Unclear", details: "Scheme state is unknown/unparseable." });
      } else if (!uState) {
        missing.push("State/UT");
      } else if (scheme.state !== uState) {
        failed.push({ criterion: "State", details: `Required: ${scheme.state}, You: ${uState}` });
      } else {
        passed.push({ criterion: "State", details: `Matched: ${scheme.state}` });
      }
    }

    // Age
    if (crit.age_min !== null || crit.age_max !== null) {
      if (uAge === null) {
        missing.push("Age");
      } else {
        let ageFailed = false;
        if (crit.age_min === 'UNPARSEABLE' || crit.age_max === 'UNPARSEABLE') {
          failed.push({ criterion: "Age Requirement Unclear", details: "The scheme data contains unparseable age rules." });
          ageFailed = true;
        } else {
          if (crit.age_min !== null && uAge < crit.age_min) {
            failed.push({ criterion: "Minimum Age", details: `Required: ${crit.age_min}, You: ${uAge}` });
            ageFailed = true;
          }
          if (crit.age_max !== null && uAge > crit.age_max) {
            failed.push({ criterion: "Maximum Age", details: `Required: ${crit.age_max}, You: ${uAge}` });
            ageFailed = true;
          }
        }
        if (!ageFailed) {
          let range = "";
          if (crit.age_min && crit.age_max) range = `${crit.age_min}-${crit.age_max}`;
          else if (crit.age_min) range = `Min ${crit.age_min}`;
          else if (crit.age_max) range = `Max ${crit.age_max}`;
          passed.push({ criterion: "Age", details: `Required: ${range}, You: ${uAge}` });
        }
      }
    }

    // Gender
    if (crit.gender !== 'all') {
      if (uGender === 'all') {
        missing.push("Gender");
      } else if (crit.gender !== uGender) {
        failed.push({ criterion: "Gender", details: `Required: ${crit.gender}, You: ${uGender}` });
      } else {
        passed.push({ criterion: "Gender", details: `Matched: ${crit.gender}` });
      }
    }

    // Caste
    if (crit.caste && crit.caste.length > 0) {
      if (!uCaste || uCaste.length === 0) {
        missing.push("Caste/Category");
      } else {
        const hasMatch = crit.caste.some(c => uCaste.includes(c));
        if (!hasMatch) {
          failed.push({ criterion: "Caste", details: `Required: one of ${crit.caste.join(', ')}, You: ${uCaste.join(', ')}` });
        } else {
          passed.push({ criterion: "Caste", details: `Matched: ${uCaste.join(', ')}` });
        }
      }
    }

    // Income
    if (crit.income_max !== null) {
      if (uIncome === null) {
        missing.push("Annual Income");
      } else if (crit.income_max === 'UNPARSEABLE') {
        failed.push({ criterion: "Income Requirement Unclear", details: "The scheme data contains unparseable income rules." });
      } else if (uIncome > crit.income_max) {
        failed.push({ criterion: "Income", details: `Maximum allowed: ₹${crit.income_max}, You: ₹${uIncome}` });
      } else {
        passed.push({ criterion: "Income", details: `Required: <= ₹${crit.income_max}, You: ₹${uIncome}` });
      }
    }

    // BPL
    if (crit.bpl_required) {
      if (!uBpl) {
        failed.push({ criterion: "BPL Status", details: `Required: Yes, You: No` });
      } else {
        passed.push({ criterion: "BPL Status", details: `Matched: Yes` });
      }
    }

    // Disability
    if (crit.disability_required) {
      if (!uDisability) {
        failed.push({ criterion: "Disability Status", details: `Required: Yes, You: No` });
      } else {
        passed.push({ criterion: "Disability Status", details: `Matched: Yes` });
      }
    }

    let status = "UNKNOWN";
    
    // If absolutely no structured criteria were evaluated
    const hasCriteria = (crit.age_min !== null || crit.age_max !== null) ||
                        (crit.gender !== 'all') ||
                        (crit.caste && crit.caste.length > 0) ||
                        (crit.income_max !== null) ||
                        (crit.bpl_required) ||
                        (crit.disability_required) ||
                        (scheme.source_type === 'state' && scheme.state !== null);

    if (!hasCriteria) {
      status = "UNKNOWN";
      missing.push("Structured Criteria (Please read the scheme description manually)");
    } else {
      if (failed.length === 0 && missing.length === 0) status = "ELIGIBLE";
      else if (failed.length === 1 && missing.length === 0) status = "ALMOST_ELIGIBLE";
      else if (failed.length > 0) status = "NOT_ELIGIBLE";
      else if (missing.length > 0) status = "UNKNOWN";
    }

    return {
      status,
      passed,
      failed,
      missing,
      scheme_details: scheme
    };
  }

  matchSchemes(userProfile, extractedKeywords = []) {
    if (!this.isLoaded) return { eligible: [], almost_eligible: [], needs_verification: [], summary: { eligible_count: 0, almost_eligible_count: 0 } };

    const eligible = [];
    const almost_eligible = [];
    const needs_verification = [];

    // Normalize user profile for easier comparison
    const uAge = userProfile.age ? parseInt(userProfile.age) : null;
    const uGender = normalizeGender(userProfile.gender);
    const uCaste = normalizeCaste(userProfile.caste);
    const uIncome = parseIncome(userProfile.annual_income);
    const uBpl = !!userProfile.bpl;
    const uDisability = !!userProfile.disability;
    const uState = normalizeState(userProfile.state);
    const uCategories = Array.isArray(userProfile.categories) ? userProfile.categories.map(c => cleanString(c)) : [];

    for (const scheme of this.schemes) {
      // 1. Check State Match (Fast fail)
      if (scheme.source_type === 'state') {
        if (!uState) continue; // If user hasn't provided a state, they can't match state schemes
        if (scheme.state !== uState) {
          continue;
        }
      }

      const crit = scheme.eligibility_criteria;
      const failures = [];
      const missing_info = [];

      // 2. Age
      if (crit.age_min !== null || crit.age_max !== null) {
        if (uAge === null) {
          missing_info.push({ type: 'age_missing', expected: `Age information required`, actual: "Not provided" });
        } else if (crit.age_min === 'UNPARSEABLE' || crit.age_max === 'UNPARSEABLE') {
          failures.push({ type: 'age_unparseable', expected: `Valid numerical age limit`, actual: `Scheme data unparseable` });
        } else {
          if (crit.age_min !== null && uAge < crit.age_min) failures.push({ type: 'age_min', expected: `Minimum age ${crit.age_min}`, actual: `${uAge}` });
          if (crit.age_max !== null && uAge > crit.age_max) failures.push({ type: 'age_max', expected: `Maximum age ${crit.age_max}`, actual: `${uAge}` });
        }
      }

      // 3. Gender
      if (crit.gender !== 'all') {
        if (uGender === 'all') {
          missing_info.push({ type: 'gender_missing', expected: `Gender (${crit.gender}) required`, actual: "Not provided" });
        } else if (crit.gender !== uGender) {
          failures.push({ type: 'gender', expected: crit.gender, actual: uGender });
        }
      }

      // 4. Caste
      if (crit.caste && crit.caste.length > 0) {
        if (!uCaste || uCaste.length === 0) {
          missing_info.push({ type: 'caste_missing', expected: `Caste information required`, actual: "Not provided" });
        } else {
          const hasMatch = crit.caste.some(c => uCaste.includes(c));
          if (!hasMatch) {
            failures.push({ type: 'caste', expected: `One of ${crit.caste.join(', ')}`, actual: uCaste.join(', ') });
          }
        }
      }

      // 5. Income
      if (crit.income_max !== null) {
        if (uIncome === null) {
          missing_info.push({ type: 'income_missing', expected: `Income information required`, actual: "Not provided" });
        } else if (crit.income_max === 'UNPARSEABLE') {
          failures.push({ type: 'income_unparseable', expected: `Valid numerical income limit`, actual: `Scheme data unparseable` });
        } else if (uIncome > crit.income_max) {
          failures.push({ 
            type: 'income_max', 
            expected: `Maximum income ₹${crit.income_max}`, 
            actual: `₹${uIncome}`,
            difference: uIncome - crit.income_max 
          });
        }
      }

      // 6. BPL
      if (crit.bpl_required && !uBpl) {
        failures.push({ type: 'bpl', expected: "BPL Status Required", actual: "Not BPL" });
      }

      // 7. Disability
      if (crit.disability_required && !uDisability) {
        failures.push({ type: 'disability', expected: "Disability Status Required", actual: "No Disability" });
      }

      // 8. Category Interest Ranking & Filtering
      if (scheme.category && scheme.category.length > 0) {
        // Only strictly filter by category if the user actually provided categories
        if (uCategories.length > 0) {
          let categoryMatch = false;
          for (const cat of scheme.category) {
            if (uCategories.includes(cleanString(cat))) {
              categoryMatch = true;
              break;
            }
          }
          if (!categoryMatch) {
            failures.push({ type: 'category', expected: `One of ${scheme.category.join(', ')}`, actual: uCategories.join(', ') });
          }
        }
      }

      // 8b. Beneficiary Type / Occupation Strict Filtering
      // We don't have an "occupation" field on userProfile yet, but if the scheme specifically targets certain groups (excluding "Individual" or "All"),
      // and we cannot verify the user belongs to it, they must fail. (Strict Filtering)
      if (scheme.beneficiary_type && scheme.beneficiary_type.length > 0) {
        const isGeneric = scheme.beneficiary_type.some(bt => {
          const lower = bt.toLowerCase();
          return lower === 'individual' || lower === 'all' || lower === 'citizens';
        });
        
        if (!isGeneric) {
          // The scheme targets a specific group (e.g. "Institution", "Farmer", "Business Entity")
          // Since our profile doesn't support these specific tags yet, we safely fail them.
          failures.push({ type: 'beneficiary_type_missing', expected: `Targeted group: ${scheme.beneficiary_type.join(', ')}`, actual: "Profile does not verify this occupation/entity type" });
        }
      }

      // 9. AI Keyword Strict Filtering
      if (extractedKeywords && extractedKeywords.length > 0) {
        const textToSearch = [
          scheme.scheme_name,
          scheme.description,
          scheme.ministry,
          scheme.department,
          ...scheme.category,
          ...scheme.beneficiary_type
        ].join(' ').toLowerCase();

        const hasKeywordMatch = extractedKeywords.some(kw => textToSearch.includes(kw));
        if (!hasKeywordMatch) {
          continue; 
        }
      }

      const hasCriteria = (crit.age_min !== null || crit.age_max !== null) ||
                          (crit.gender !== 'all') ||
                          (crit.caste && crit.caste.length > 0) ||
                          (crit.income_max !== null) ||
                          (crit.bpl_required) ||
                          (crit.disability_required) ||
                          (scheme.source_type === 'state' && scheme.state !== null);

      if (!hasCriteria) {
        missing_info.push({ type: 'scheme_data_missing', expected: 'Structured criteria', actual: 'Not available in dataset' });
      }

      // Format scheme object for response
      const schemeFormatted = {
        id: scheme.id,
        scheme_name: scheme.scheme_name,
        source_type: scheme.source_type,
        state: scheme.state,
        ministry: scheme.ministry,
        department: scheme.department,
        description: scheme.description,
        benefits: scheme.benefits,
        official_url: scheme.official_url,
        apply_url: scheme.apply_url,
        category: scheme.category,
        tags: scheme.tags,
        beneficiary_type: scheme.beneficiary_type
      };

      // Classify the result
      if (failures.length === 0 && missing_info.length === 0) {
        eligible.push(schemeFormatted);
      } else if (failures.length === 1 && missing_info.length === 0) {
        almost_eligible.push({
          ...schemeFormatted,
          blocking_criterion: failures[0]
        });
      } else if (failures.length === 0 && missing_info.length > 0) {
        needs_verification.push({
          ...schemeFormatted,
          missing_info: missing_info
        });
      }
    }

    return {
      summary: {
        eligible_count: eligible.length,
        almost_eligible_count: almost_eligible.length,
        needs_verification_count: needs_verification.length
      },
      eligible,
      almost_eligible,
      needs_verification
    };
  }
}

const schemeService = new SchemeService();
export default schemeService;
