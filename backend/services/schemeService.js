import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
        scheme_name: scheme.scheme_name || "Unknown Scheme",
        description: scheme.description || "",
        ministry: scheme.ministry || "N/A",
        department: scheme.department || "N/A",
        category: this.normalizeArray(scheme.category),
        beneficiary_type: this.normalizeArray(scheme.beneficiary_type),
        benefits: scheme.benefits || "",
        eligibility: scheme.eligibility || "",
        application_process: scheme.application_process || "",
        documents_required: scheme.documents_required || "",
        apply_url: scheme.apply_url || "",
        official_url: scheme.official_url || "",
        eligibility_criteria: this.normalizeCriteria(scheme.eligibility_criteria)
      }));

      // Normalize state schemes
      const normalizedState = stateData.map((scheme, index) => ({
        id: `state_${index}`,
        source_type: 'state',
        state: scheme.state || "Unknown State",
        scheme_name: scheme.scheme_name || "Unknown Scheme",
        description: scheme.description || "",
        ministry: scheme.ministry || "N/A",
        department: scheme.department || "N/A",
        category: this.normalizeArray(scheme.category),
        beneficiary_type: this.normalizeArray(scheme.beneficiary_type),
        benefits: scheme.benefits || "",
        eligibility: scheme.eligibility || "",
        application_process: scheme.application_process || "",
        documents_required: scheme.documents_required || "",
        apply_url: scheme.apply_url || "",
        official_url: scheme.official_url || "",
        eligibility_criteria: this.normalizeCriteria(scheme.eligibility_criteria)
      }));

      this.schemes = [...normalizedCentral, ...normalizedState];
      this.isLoaded = true;
      console.log(`[SchemeService] Successfully loaded ${normalizedCentral.length} central and ${normalizedState.length} state schemes.`);
    } catch (error) {
      console.error("[SchemeService] Failed to load schemes:", error);
    }
  }

  normalizeArray(value) {
    if (!value || value === "N/A") return [];
    if (Array.isArray(value)) return value;
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
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

    if (criteria.gender) norm.gender = criteria.gender.toLowerCase();
    
    if (criteria.age_min !== undefined && criteria.age_min !== null && criteria.age_min !== "") {
      norm.age_min = parseFloat(criteria.age_min);
    }
    
    if (criteria.age_max !== undefined && criteria.age_max !== null && criteria.age_max !== "") {
      norm.age_max = parseFloat(criteria.age_max);
    }

    if (criteria.income_max !== undefined && criteria.income_max !== null && criteria.income_max !== "") {
      // Some datasets might store it as a string "200000" or integer
      const inc = parseInt(criteria.income_max);
      if (!isNaN(inc)) norm.income_max = inc;
    }

    if (criteria.caste) {
      if (Array.isArray(criteria.caste)) norm.caste = criteria.caste;
      else norm.caste = criteria.caste.split(',').map(c => c.trim().toUpperCase());
    }

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
    const uGender = userProfile.gender ? userProfile.gender.toLowerCase() : null;
    const uCaste = userProfile.caste ? userProfile.caste.toUpperCase() : null;
    const uIncome = userProfile.annual_income ? parseInt(userProfile.annual_income) : null;
    const uBpl = !!userProfile.bpl;
    const uDisability = !!userProfile.disability;
    const uState = userProfile.state ? userProfile.state.toLowerCase() : null;

    const crit = scheme.eligibility_criteria;
    const passed = [];
    const failed = [];
    const missing = [];

    // State
    if (scheme.source_type === 'state') {
      const sState = scheme.state.toLowerCase();
      if (!uState) {
        missing.push("State/UT");
      } else if (!sState.includes(uState) && !uState.includes(sState)) {
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
        if (crit.age_min !== null && uAge < crit.age_min) {
          failed.push({ criterion: "Minimum Age", details: `Required: ${crit.age_min}, You: ${uAge}` });
          ageFailed = true;
        }
        if (crit.age_max !== null && uAge > crit.age_max) {
          failed.push({ criterion: "Maximum Age", details: `Required: ${crit.age_max}, You: ${uAge}` });
          ageFailed = true;
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
      if (!uGender) {
        missing.push("Gender");
      } else if (crit.gender !== uGender) {
        failed.push({ criterion: "Gender", details: `Required: ${crit.gender}, You: ${uGender}` });
      } else {
        passed.push({ criterion: "Gender", details: `Matched: ${crit.gender}` });
      }
    }

    // Caste
    if (crit.caste && crit.caste.length > 0) {
      if (!uCaste) {
        missing.push("Caste/Category");
      } else if (!crit.caste.includes(uCaste)) {
        failed.push({ criterion: "Caste", details: `Required: one of ${crit.caste.join(', ')}, You: ${uCaste}` });
      } else {
        passed.push({ criterion: "Caste", details: `Matched: ${uCaste}` });
      }
    }

    // Income
    if (crit.income_max !== null) {
      if (uIncome === null) {
        missing.push("Annual Income");
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
    if (passed.length === 0 && failed.length === 0 && missing.length === 0) {
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
    if (!this.isLoaded) return { eligible: [], almost_eligible: [], summary: { eligible_count: 0, almost_eligible_count: 0 } };

    const eligible = [];
    const almost_eligible = [];

    // Normalize user profile for easier comparison
    const uAge = userProfile.age ? parseInt(userProfile.age) : null;
    const uGender = userProfile.gender ? userProfile.gender.toLowerCase() : null;
    const uCaste = userProfile.caste ? userProfile.caste.toUpperCase() : null;
    const uIncome = userProfile.annual_income ? parseInt(userProfile.annual_income) : null;
    const uBpl = !!userProfile.bpl;
    const uDisability = !!userProfile.disability;
    const uState = userProfile.state ? userProfile.state.toLowerCase() : null;
    const uCategories = Array.isArray(userProfile.categories) ? userProfile.categories.map(c => c.toLowerCase()) : [];

    for (const scheme of this.schemes) {
      // 1. Check State Match (Fast fail)
      if (scheme.source_type === 'state') {
        if (!uState) continue; // If user hasn't provided a state, they can't match state schemes
        // Normalize scheme state
        const sState = scheme.state.toLowerCase();
        // A very basic check. E.g. "uttar pradesh" includes "uttar pradesh"
        if (!sState.includes(uState) && !uState.includes(sState)) {
          continue;
        }
      }

      const crit = scheme.eligibility_criteria;
      const failures = [];

      // 2. Age
      if (crit.age_min !== null || crit.age_max !== null) {
        if (uAge === null) {
          failures.push({ type: 'age_missing', expected: `Age information required`, actual: "Not provided" });
        } else {
          if (crit.age_min !== null && uAge < crit.age_min) failures.push({ type: 'age_min', expected: `Minimum age ${crit.age_min}`, actual: `${uAge}` });
          if (crit.age_max !== null && uAge > crit.age_max) failures.push({ type: 'age_max', expected: `Maximum age ${crit.age_max}`, actual: `${uAge}` });
        }
      }

      // 3. Gender
      if (crit.gender !== 'all') {
        if (uGender === null) {
          failures.push({ type: 'gender_missing', expected: `Gender (${crit.gender}) required`, actual: "Not provided" });
        } else if (crit.gender !== uGender) {
          failures.push({ type: 'gender', expected: crit.gender, actual: uGender });
        }
      }

      // 4. Caste
      if (crit.caste && crit.caste.length > 0) {
        if (uCaste === null) {
          failures.push({ type: 'caste_missing', expected: `Caste information required`, actual: "Not provided" });
        } else if (!crit.caste.includes(uCaste)) {
          failures.push({ type: 'caste', expected: `One of ${crit.caste.join(', ')}`, actual: uCaste });
        }
      }

      // 5. Income
      if (crit.income_max !== null) {
        if (uIncome === null) {
          failures.push({ type: 'income_missing', expected: `Income information required`, actual: "Not provided" });
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

      // 8. Category Interest Ranking (Optional, but if user provided interests, we can boost/filter)
      let categoryMatch = false;
      if (uCategories.length > 0) {
        for (const cat of scheme.category) {
          if (uCategories.includes(cat.toLowerCase())) {
            categoryMatch = true;
            break;
          }
        }
        // If user selected categories and this scheme matches NONE of them, skip it
        if (!categoryMatch && scheme.category.length > 0) {
          continue; 
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

        // Strict filtering: We want AT LEAST ONE keyword to match perfectly within the text.
        const hasKeywordMatch = extractedKeywords.some(kw => textToSearch.includes(kw));
        if (!hasKeywordMatch) {
          continue; 
        }
      }

      // Classify the result
      if (failures.length === 0) {
        eligible.push({
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
          match_reasons: []
        });
      } else if (failures.length === 1) {
        almost_eligible.push({
          id: scheme.id,
          scheme_name: scheme.scheme_name,
          source_type: scheme.source_type,
          state: scheme.state,
          ministry: scheme.ministry,
          department: scheme.department,
          description: scheme.description,
          blocking_criterion: failures[0],
          official_url: scheme.official_url,
          apply_url: scheme.apply_url
        });
      }
    }

    return {
      summary: {
        eligible_count: eligible.length,
        almost_eligible_count: almost_eligible.length
      },
      eligible,
      almost_eligible
    };
  }
}

const schemeService = new SchemeService();
export default schemeService;
