import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

const SchemeNavigatorPage = () => {
  const { authFetch } = useAuth();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [activeMode, setActiveMode] = useState('find'); // 'find' or 'check'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    age: '',
    gender: 'all',
    annual_income: '',
    caste: '',
    state: '',
    bpl: false,
    disability: false,
    categories: [],
    search_query: ''
  });

  const [results, setResults] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [draftingLetter, setDraftingLetter] = useState(false);
  
  // States for Check A Scheme mode
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [checkSelectedScheme, setCheckSelectedScheme] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [checkExplanation, setCheckExplanation] = useState(null);
  const [chatQuery, setChatQuery] = useState('');
  const [chatAnswer, setChatAnswer] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Results Tab for Find mode
  const [resultTab, setResultTab] = useState('all'); // all, central, state

  const categoriesList = [
    "Education & Learning",
    "Health & Wellness",
    "Agriculture,Rural & Environment",
    "Business & Entrepreneurship",
    "Social welfare & Empowerment",
    "Housing & Shelter",
    "Skills & Employment",
    "Women and Child"
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleCategory = (cat) => {
    setFormData(prev => {
      const isSelected = prev.categories.includes(cat);
      if (isSelected) {
        return { ...prev, categories: prev.categories.filter(c => c !== cat) };
      } else {
        return { ...prev, categories: [...prev.categories, cat] };
      }
    });
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await authFetch('/schemes/match', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      setResults(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSchemeDetails = (scheme, isAlmostEligible = false) => {
    setSelectedScheme({ ...scheme, isAlmostEligible });
    setExplanation(null);
    setExplanationLoading(false);
  };

  const fetchExplanation = async () => {
    if (!selectedScheme) return;
    setExplanationLoading(true);
    try {
      const res = await authFetch(`/schemes/${selectedScheme.id}/explain`, {
        method: 'POST',
        body: JSON.stringify({ profile: formData, language: 'en' })
      });
      if (!res.ok) throw new Error('Failed to fetch explanation');
      const data = await res.json();
      setExplanation(data);
    } catch (err) {
      console.error(err);
      setExplanation({ error: "Failed to generate simple explanation. Please rely on the official information." });
    } finally {
      setExplanationLoading(false);
    }
  };

  const draftApplication = async () => {
    if (!selectedScheme) return;
    setDraftingLetter(true);
    try {
      // Create a temporary case for this application or ask the user to pick one?
      // Since we don't have a case picker, let's just create a new case named after the scheme!
      const caseRes = await authFetch('/cases/new', {
        method: 'POST',
        body: JSON.stringify({ title: `Application: ${selectedScheme.scheme_name}` })
      });
      if (!caseRes.ok) throw new Error('Failed to create case container');
      const caseData = await caseRes.json();

      const res = await authFetch(`/schemes/${selectedScheme.id}/draft_application`, {
        method: 'POST',
        body: JSON.stringify({ profile: formData, caseId: caseData.id })
      });
      
      if (!res.ok) throw new Error('Failed to draft application');
      alert(`Success! Application drafted and saved to your cases. Go to "My Cases" -> "Application: ${selectedScheme.scheme_name}" to view/download the PDF.`);
    } catch (err) {
      console.error(err);
      alert("Failed to draft application letter.");
    } finally {
      setDraftingLetter(false);
    }
  };

  const getFilteredSchemes = (type) => { // 'eligible', 'almost', 'needs_verification'
    if (!results) return [];
    let list = [];
    if (type === 'eligible') list = results.eligible || [];
    else if (type === 'almost') list = results.almost_eligible || [];
    else if (type === 'needs_verification') list = results.needs_verification || [];
    
    if (resultTab === 'central') return list.filter(s => s.source_type === 'central');
    if (resultTab === 'state') return list.filter(s => s.source_type === 'state');
    return list;
  };

  // CHECK A SCHEME FUNCTIONS
  const handleSchemeSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await authFetch(`/schemes/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error("Scheme search failed", err);
    }
  };

  const handleSelectSchemeForCheck = (scheme) => {
    setCheckSelectedScheme(scheme);
    setSearchResults([]);
    setSearchQuery('');
    setCheckResult(null);
    setCheckExplanation(null);
    setChatAnswer(null);
    setChatQuery('');
  };

  const handleCheckEligibility = async (e) => {
    e.preventDefault();
    if (!checkSelectedScheme) return;
    setLoading(true);
    setError('');
    
    try {
      const res = await authFetch(`/schemes/${checkSelectedScheme.id}/check`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to check eligibility');
      const data = await res.json();
      setCheckResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckExplanation = async () => {
    if (!checkSelectedScheme || !checkResult) return;
    setExplanationLoading(true);
    try {
      const res = await authFetch(`/schemes/${checkSelectedScheme.id}/explain_eligibility`, {
        method: 'POST',
        body: JSON.stringify({ profile: formData, result: checkResult })
      });
      if (!res.ok) throw new Error('Failed to fetch explanation');
      const data = await res.json();
      setCheckExplanation(data.explanation);
    } catch (err) {
      console.error(err);
      setCheckExplanation("Failed to generate simple explanation. Please rely on the official information.");
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleSchemeChat = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim() || !checkSelectedScheme) return;
    setChatLoading(true);
    try {
      const res = await authFetch(`/schemes/${checkSelectedScheme.id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ query: chatQuery, result: checkResult })
      });
      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();
      setChatAnswer(data.answer);
      setChatQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Background blobs matching the rest of the app */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-tertiary/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="flex-1 overflow-y-auto px-margin-mobile md:px-6 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display-md text-[28px] text-on-surface font-semibold tracking-tight">{t('schemes.title')}</h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-1">{t('schemes.subtitle')}</p>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setActiveMode('find')}
                  className={`px-4 py-2 rounded-md font-label-sm text-xs transition-colors ${activeMode === 'find' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {t('schemes.tab_find')}
                </button>
                <button 
                  onClick={() => setActiveMode('check')}
                  className={`px-4 py-2 rounded-md font-label-sm text-xs transition-colors ${activeMode === 'check' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {t('schemes.tab_check')}
                </button>
              </div>
            </div>

            {activeMode === 'find' && step === 2 && (
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-surface-container rounded-lg font-label-md hover:bg-surface-container-high transition"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {activeMode === 'find' && step === 1 && (
            <div className="glass-card rounded-2xl p-6 md:p-10">
              <form onSubmit={handleMatch} className="space-y-8">
                
                {/* Step 1: About You */}
                <section>
                  <div className="mb-6">
                    <h3 className="font-body-lg text-[15px] font-semibold text-on-surface flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-secondary text-[18px]">person</span> {t('schemes.about_you')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">{t('schemes.age')}</label>
                        <input type="number" name="age" required value={formData.age} onChange={handleInputChange} className="w-full bg-surface-container border border-white/10 rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/40" placeholder="e.g. 25" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">{t('schemes.gender')}</label>
                        <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-surface-container border border-white/10 rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary">
                          <option value="all">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">{t('schemes.caste')}</label>
                        <select name="caste" value={formData.caste} onChange={handleInputChange} className="w-full bg-surface-container border border-white/10 rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary">
                          <option value="">Select Category</option>
                          <option value="GENERAL">General</option>
                          <option value="OBC">OBC</option>
                          <option value="SC">SC</option>
                          <option value="ST">ST</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">{t('schemes.income')}</label>
                        <input type="number" name="annual_income" value={formData.annual_income} onChange={handleInputChange} placeholder="e.g. 250000" className="w-full bg-surface-container border border-white/10 rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/40" />
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="border-white/5" />

                {/* Step 2: Location */}
                <section>
                  <div className="mb-6 pt-6 border-t border-white/5">
                    <h3 className="font-body-lg text-[15px] font-semibold text-on-surface flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-secondary text-[18px]">location_on</span> {t('schemes.location')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">{t('schemes.state')}</label>
                        <select name="state" required value={formData.state} onChange={handleInputChange} className="w-full bg-surface-container border border-white/10 rounded-md px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary">
                          <option value="">Select State</option>
                          <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Assam">Assam</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Chandigarh">Chandigarh</option>
                          <option value="Delhi">Delhi</option>
                          <option value="Gujarat">Gujarat</option>
                          <option value="Haryana">Haryana</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Kerala">Kerala</option>
                          <option value="Madhya Pradesh">Madhya Pradesh</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Odisha">Odisha</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="West Bengal">West Bengal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="border-white/5" />

                {/* Step 3: Specific Eligibility */}
                <section>
                  <div className="mb-6 pt-6 border-t border-white/5">
                    <h3 className="font-body-lg text-[15px] font-semibold text-on-surface flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-secondary text-[18px]">verified</span> {t('schemes.eligibility')}
                    </h3>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${formData.bpl ? 'bg-primary border-primary text-on-primary' : 'border-white/20 group-hover:border-white/40'}`}>
                          {formData.bpl && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                        </div>
                        <input type="checkbox" name="bpl" checked={formData.bpl} onChange={handleInputChange} className="hidden" />
                        <span className="font-body-md text-sm text-on-surface-variant group-hover:text-on-surface">{t('schemes.bpl')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${formData.disability ? 'bg-primary border-primary text-on-primary' : 'border-white/20 group-hover:border-white/40'}`}>
                          {formData.disability && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                        </div>
                        <input type="checkbox" name="disability" checked={formData.disability} onChange={handleInputChange} className="hidden" />
                        <span className="font-body-md text-sm text-on-surface-variant group-hover:text-on-surface">{t('schemes.disability')}</span>
                      </label>
                    </div>
                  </div>
                </section>

                <hr className="border-white/5" />

                {/* Step 4: AI Smart Search */}
                <section>
                  <div className="mb-6 pt-6 border-t border-white/5">
                    <h3 className="font-body-lg text-[15px] font-semibold text-on-surface flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">auto_awesome</span> {t('schemes.help_with')}
                    </h3>
                    <p className="text-xs text-on-surface-variant mb-3">{t('schemes.help_placeholder')}</p>
                    <div>
                      <textarea 
                        name="search_query" 
                        value={formData.search_query} 
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary transition resize-none"
                        placeholder="Type your needs here..."
                      ></textarea>
                    </div>
                  </div>
                </section>

                <hr className="border-white/5" />

                {/* Step 5: Interests */}
                <section>
                  <h3 className="text-xl font-display font-medium text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">category</span>
                    Areas of Interest (Optional)
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {categoriesList.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm transition-colors border ${
                          formData.categories.includes(cat) 
                            ? 'bg-primary/20 border-primary text-primary' 
                            : 'bg-transparent border-white/10 text-on-surface-variant hover:border-white/30'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </section>

                {error && <div className="p-4 bg-error/10 text-error rounded-xl text-sm">{error}</div>}

                <div className="pt-6">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary text-on-primary-fixed py-3 rounded-md font-label-sm text-sm font-semibold hover:bg-primary-fixed transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> {t('schemes.matching_btn')}</>
                    ) : (
                      <>{t('schemes.match_btn')} <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && results && (
            <div className="space-y-8 animate-fade-in">
              {/* Summary Stats */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 glass-card p-6 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-semibold text-on-surface">{results.summary.eligible_count}</div>
                    <div className="text-on-surface-variant text-sm uppercase tracking-wider font-medium">Eligible Schemes</div>
                  </div>
                </div>
                <div className="flex-1 glass-card p-6 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-tertiary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary text-2xl">info</span>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-semibold text-on-surface">{results.summary.almost_eligible_count}</div>
                    <div className="text-on-surface-variant text-sm uppercase tracking-wider font-medium">Almost Eligible</div>
                  </div>
                </div>
                {results.summary.needs_verification_count > 0 && (
                  <div className="flex-1 glass-card p-6 rounded-2xl flex items-center gap-4 border border-warning/20">
                    <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-warning text-2xl">help_center</span>
                    </div>
                    <div>
                      <div className="text-3xl font-display font-semibold text-on-surface">{results.summary.needs_verification_count}</div>
                      <div className="text-on-surface-variant text-sm uppercase tracking-wider font-medium">Needs Verification</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-surface-container rounded-xl inline-flex">
                {['all', 'central', 'state'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setResultTab(tab)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium capitalize transition ${
                      resultTab === tab ? 'bg-surface text-primary shadow' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {tab} Schemes
                  </button>
                ))}
              </div>

              {/* Eligible List */}
              {getFilteredSchemes('eligible').length > 0 && (
                <section>
                  <h3 className="text-xl font-display font-medium text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">task_alt</span>
                    Eligible For You
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getFilteredSchemes('eligible').map(scheme => (
                      <div key={scheme.id} className="glass-card rounded-xl p-5 flex flex-col hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => openSchemeDetails(scheme, false)}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold ${scheme.source_type === 'central' ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>
                            {scheme.source_type} {scheme.source_type === 'state' && scheme.state ? `• ${scheme.state}` : ''}
                          </span>
                        </div>
                        <h4 className="font-display text-lg text-on-surface font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors">{scheme.scheme_name}</h4>
                        <p className="text-sm text-on-surface-variant line-clamp-2 mb-4 flex-1">{scheme.description}</p>
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-sm">
                          <span className="text-on-surface-variant/60 truncate mr-2">{scheme.ministry}</span>
                          <span className="text-primary flex items-center gap-1 font-medium whitespace-nowrap">View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Almost Eligible List */}
              {getFilteredSchemes('almost').length > 0 && (
                <section>
                  <h3 className="text-xl font-display font-medium text-on-surface mb-4 flex items-center gap-2 mt-8">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">warning</span>
                    Almost Eligible
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getFilteredSchemes('almost').map(scheme => (
                      <div key={scheme.id} className="glass-card rounded-xl p-5 flex flex-col hover:border-tertiary/30 transition-colors cursor-pointer group" onClick={() => openSchemeDetails(scheme, true)}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold ${scheme.source_type === 'central' ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>
                            {scheme.source_type} {scheme.source_type === 'state' && scheme.state ? `• ${scheme.state}` : ''}
                          </span>
                        </div>
                        <h4 className="font-display text-lg text-on-surface font-semibold line-clamp-2 mb-2 group-hover:text-tertiary transition-colors">{scheme.scheme_name}</h4>
                        
                        <div className="bg-error/10 border border-error/20 rounded-lg p-3 mb-4 mt-auto">
                          <p className="text-[11px] text-error/80 uppercase tracking-wider font-bold mb-1">Missing Requirement</p>
                          <p className="text-sm text-on-surface">{scheme.blocking_criterion.expected}</p>
                          <p className="text-xs text-on-surface-variant mt-1">Your Profile: {scheme.blocking_criterion.actual}</p>
                        </div>
                        
                        <div className="pt-2 flex items-center justify-end text-sm">
                          <span className="text-tertiary flex items-center gap-1 font-medium whitespace-nowrap">View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Needs Verification List */}
              {getFilteredSchemes('needs_verification').length > 0 && (
                <section>
                  <h3 className="text-xl font-display font-medium text-on-surface mb-4 flex items-center gap-2 mt-8">
                    <span className="material-symbols-outlined text-warning text-[20px]">help_center</span>
                    Needs Manual Verification
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getFilteredSchemes('needs_verification').map(scheme => (
                      <div key={scheme.id} className="glass-card rounded-xl p-5 flex flex-col hover:border-warning/30 transition-colors cursor-pointer group" onClick={() => openSchemeDetails(scheme, true)}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold ${scheme.source_type === 'central' ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>
                            {scheme.source_type} {scheme.source_type === 'state' && scheme.state ? `• ${scheme.state}` : ''}
                          </span>
                        </div>
                        <h4 className="font-display text-lg text-on-surface font-semibold line-clamp-2 mb-2 group-hover:text-warning transition-colors">{scheme.scheme_name}</h4>
                        
                        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4 mt-auto">
                          <p className="text-[11px] text-warning/80 uppercase tracking-wider font-bold mb-1">Government Data Missing</p>
                          <p className="text-xs text-on-surface-variant mt-1">Please open details and read the full description to manually verify if you are eligible for this scheme.</p>
                        </div>
                        
                        <div className="pt-2 flex items-center justify-end text-sm">
                          <span className="text-warning flex items-center gap-1 font-medium whitespace-nowrap">View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {getFilteredSchemes('eligible').length === 0 && getFilteredSchemes('almost').length === 0 && getFilteredSchemes('needs_verification').length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-2xl">
                  <span className="material-symbols-outlined text-on-surface-variant/20 text-6xl mb-4">search_off</span>
                  <h3 className="font-display text-xl text-on-surface mb-2">No Schemes Found</h3>
                  <p className="text-on-surface-variant max-w-md">
                    We couldn't find any {resultTab !== 'all' ? resultTab : ''} schemes matching your profile criteria perfectly. Try adjusting your optional categories or check back later.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeMode === 'check' && (
            <div className="space-y-6">
              {!checkSelectedScheme ? (
                <div className="glass-card rounded-2xl p-6 md:p-10">
                  <h3 className="text-xl font-display font-medium text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">search</span>
                    Check Your Eligibility
                  </h3>
                  <p className="text-on-surface-variant text-sm mb-6">
                    Already have a government scheme in mind? Search for the scheme below and we'll check whether you qualify based on your profile.
                  </p>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => handleSchemeSearch(e.target.value)}
                      placeholder="Search scheme (e.g. PM-KISAN, PMAY)..."
                      className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-on-surface focus:outline-none focus:border-primary transition"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-2 w-full bg-surface border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                        {searchResults.map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => handleSelectSchemeForCheck(s)}
                            className="p-4 hover:bg-surface-container cursor-pointer border-b border-white/5 last:border-0"
                          >
                            <h4 className="text-on-surface font-medium">{s.scheme_name}</h4>
                            <p className="text-xs text-on-surface-variant">{s.ministry} • {s.source_type}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-6 md:p-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold mb-2 ${checkSelectedScheme.source_type === 'central' ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>
                        {checkSelectedScheme.source_type}
                      </span>
                      <h2 className="text-2xl font-display font-semibold text-on-surface">{checkSelectedScheme.scheme_name}</h2>
                      <p className="text-sm text-on-surface-variant mt-1">{checkSelectedScheme.ministry}</p>
                    </div>
                    <button 
                      onClick={() => handleSelectSchemeForCheck(null)}
                      className="text-sm text-primary hover:underline"
                    >
                      Change Scheme
                    </button>
                  </div>

                  {!checkResult ? (
                    <form onSubmit={handleCheckEligibility} className="space-y-6">
                      <div className="bg-surface-container/50 p-4 rounded-xl border border-white/5">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Your Profile Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-on-surface-variant mb-1">Age</label>
                            <input type="number" name="age" value={formData.age} onChange={handleInputChange} className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-on-surface" placeholder="e.g. 25" />
                          </div>
                          <div>
                            <label className="block text-xs text-on-surface-variant mb-1">Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-on-surface">
                              <option value="all">Select</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-on-surface-variant mb-1">Income (₹)</label>
                            <input type="number" name="annual_income" value={formData.annual_income} onChange={handleInputChange} className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-on-surface" placeholder="e.g. 250000" />
                          </div>
                          <div>
                            <label className="block text-xs text-on-surface-variant mb-1">State</label>
                            <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-on-surface" placeholder="e.g. Bihar" />
                          </div>
                        </div>
                      </div>
                      
                      {error && <div className="text-error text-sm">{error}</div>}

                      <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition flex justify-center items-center gap-2">
                        {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">fact_check</span>}
                        Check My Eligibility
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-8 animate-fade-in">
                      {/* Status Banner */}
                      <div className={`p-6 rounded-xl border ${
                        checkResult.status === 'ELIGIBLE' ? 'bg-primary/10 border-primary/30' :
                        checkResult.status === 'ALMOST_ELIGIBLE' ? 'bg-tertiary/10 border-tertiary/30' :
                        checkResult.status === 'NOT_ELIGIBLE' ? 'bg-error/10 border-error/30' :
                        'bg-surface-container border-white/10'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`material-symbols-outlined text-3xl ${
                            checkResult.status === 'ELIGIBLE' ? 'text-primary' :
                            checkResult.status === 'ALMOST_ELIGIBLE' ? 'text-tertiary' :
                            checkResult.status === 'NOT_ELIGIBLE' ? 'text-error' :
                            'text-on-surface-variant'
                          }`}>
                            {checkResult.status === 'ELIGIBLE' ? 'check_circle' :
                             checkResult.status === 'ALMOST_ELIGIBLE' ? 'warning' :
                             checkResult.status === 'NOT_ELIGIBLE' ? 'cancel' : 'help'}
                          </span>
                          <h3 className={`text-xl font-bold ${
                            checkResult.status === 'ELIGIBLE' ? 'text-primary' :
                            checkResult.status === 'ALMOST_ELIGIBLE' ? 'text-tertiary' :
                            checkResult.status === 'NOT_ELIGIBLE' ? 'text-error' :
                            'text-on-surface'
                          }`}>
                            {checkResult.status === 'ELIGIBLE' ? 'You appear eligible' :
                             checkResult.status === 'ALMOST_ELIGIBLE' ? 'You are almost eligible' :
                             checkResult.status === 'NOT_ELIGIBLE' ? 'You are currently not eligible' :
                             'We need more information'}
                          </h3>
                        </div>
                        <p className="text-on-surface-variant">
                          {checkResult.status === 'ELIGIBLE' && `${checkResult.passed.length} requirements satisfied.`}
                          {checkResult.status === 'ALMOST_ELIGIBLE' && `You meet most requirements, but miss ${checkResult.failed.length}.`}
                          {checkResult.status === 'NOT_ELIGIBLE' && `You do not meet ${checkResult.failed.length} requirement(s).`}
                          {checkResult.status === 'UNKNOWN' && `We couldn't determine eligibility because you are missing ${checkResult.missing.length} details.`}
                        </p>
                      </div>

                      {/* Breakdown */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-on-surface uppercase tracking-wider text-sm">Eligibility Breakdown</h4>
                        <div className="bg-surface-container rounded-xl overflow-hidden border border-white/5">
                          {checkResult.passed.map((p, i) => (
                            <div key={`p-${i}`} className="p-4 flex items-start gap-3 border-b border-white/5 last:border-0">
                              <span className="material-symbols-outlined text-primary text-[20px]">check</span>
                              <div>
                                <p className="text-sm font-medium text-on-surface">{p.criterion}</p>
                                <p className="text-xs text-on-surface-variant mt-1">{p.details}</p>
                              </div>
                            </div>
                          ))}
                          {checkResult.failed.map((f, i) => (
                            <div key={`f-${i}`} className="p-4 flex items-start gap-3 border-b border-white/5 bg-error/5 last:border-0">
                              <span className="material-symbols-outlined text-error text-[20px]">close</span>
                              <div>
                                <p className="text-sm font-medium text-error">{f.criterion}</p>
                                <p className="text-xs text-on-surface-variant mt-1">{f.details}</p>
                              </div>
                            </div>
                          ))}
                          {checkResult.missing.map((m, i) => (
                            <div key={`m-${i}`} className="p-4 flex items-start gap-3 border-b border-white/5 last:border-0 opacity-70">
                              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">help</span>
                              <div>
                                <p className="text-sm font-medium text-on-surface">{m}</p>
                                <p className="text-xs text-on-surface-variant mt-1">Not provided in your profile.</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Explain */}
                      <div className="bg-surface border border-white/10 rounded-xl p-6">
                        <h4 className="font-display font-medium text-lg flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-primary">auto_awesome</span> Explain My Eligibility
                        </h4>
                        {checkExplanation ? (
                          <div className="bg-surface-container p-4 rounded-xl text-sm leading-relaxed text-on-surface font-body border border-primary/20">
                            {checkExplanation}
                          </div>
                        ) : (
                          <button 
                            onClick={fetchCheckExplanation}
                            disabled={explanationLoading}
                            className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm hover:bg-primary/30 transition flex items-center gap-2"
                          >
                            {explanationLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">psychology</span>}
                            Generate simple explanation
                          </button>
                        )}
                      </div>

                      {/* AI Chat */}
                      <div className="bg-surface border border-white/10 rounded-xl p-6">
                        <h4 className="font-display font-medium text-lg flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-tertiary">chat</span> Ask Adhikaar
                        </h4>
                        <p className="text-sm text-on-surface-variant mb-4">Ask anything about this scheme (documents, benefits, application process).</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {['Why am I eligible?', 'What documents do I need?', 'What benefits do I get?', 'How do I apply?'].map(q => (
                            <button 
                              key={q} 
                              onClick={() => { setChatQuery(q); }} 
                              className="px-3 py-1 bg-surface-container rounded-full text-xs hover:bg-surface-container-high transition"
                            >
                              {q}
                            </button>
                          ))}
                        </div>

                        {chatAnswer && (
                          <div className="bg-tertiary/10 border border-tertiary/20 p-4 rounded-xl text-sm text-on-surface mb-4 prose prose-invert prose-sm max-w-none">
                            <Markdown>{chatAnswer}</Markdown>
                          </div>
                        )}

                        <form onSubmit={handleSchemeChat} className="flex gap-2">
                          <input 
                            type="text" 
                            value={chatQuery} 
                            onChange={(e) => setChatQuery(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 bg-surface-container border border-white/5 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-tertiary transition"
                          />
                          <button type="submit" disabled={chatLoading || !chatQuery.trim()} className="bg-tertiary text-on-tertiary px-4 py-2 rounded-lg disabled:opacity-50 flex items-center">
                            {chatLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <span className="material-symbols-outlined text-[20px]">send</span>}
                          </button>
                        </form>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-white/10">
                        <div>
                          <p className="text-xs text-on-surface-variant mb-1">Official Source</p>
                          <a href={checkSelectedScheme.official_url || '#'} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                            View Official Scheme Information ↗
                          </a>
                        </div>
                        {checkResult.status === 'ELIGIBLE' && checkSelectedScheme.apply_url && (
                          <a href={checkSelectedScheme.apply_url} target="_blank" rel="noreferrer" className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition">
                            Apply on Official Website ↗
                          </a>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scheme Details Modal */}
      {selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-3xl max-h-full flex flex-col shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-start sticky top-0 bg-surface z-10 rounded-t-2xl">
              <div>
                <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold mb-2 ${selectedScheme.source_type === 'central' ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'}`}>
                  {selectedScheme.source_type} Scheme {selectedScheme.state ? `• ${selectedScheme.state}` : ''}
                </span>
                <h2 className="text-2xl font-display font-semibold text-on-surface leading-tight pr-8">{selectedScheme.scheme_name}</h2>
              </div>
              <button onClick={() => setSelectedScheme(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant absolute top-6 right-6 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              
              {/* Personalized Match Reasoning */}
              <div className={`mb-6 p-4 rounded-xl border ${selectedScheme.isAlmostEligible ? 'bg-error/10 border-error/20' : 'bg-primary/10 border-primary/20'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${selectedScheme.isAlmostEligible ? 'text-error' : 'text-primary'}`}>
                  <span className="material-symbols-outlined text-[18px]">{selectedScheme.isAlmostEligible ? 'warning' : 'check_circle'}</span>
                  {selectedScheme.isAlmostEligible ? 'Almost Eligible' : 'Eligible For You'}
                </h3>
                {selectedScheme.isAlmostEligible ? (
                  <>
                    <p className="text-sm text-on-surface mb-2">You meet most requirements, except:</p>
                    <div className="bg-surface/50 p-3 rounded border border-white/5 text-sm">
                      <span className="text-on-surface font-medium">{selectedScheme.blocking_criterion.expected}</span>
                      <br/><span className="text-on-surface-variant">Your Profile: {selectedScheme.blocking_criterion.actual}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-on-surface">Based on your provided profile, you appear to meet the listed requirements for this scheme.</p>
                )}
              </div>

              {!explanation ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-surface-container rounded-xl border border-white/5 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary relative overflow-hidden">
                    {explanationLoading ? (
                      <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                    )}
                  </div>
                  <h3 className="text-xl font-display font-medium text-on-surface mb-2">Simplify Government Language</h3>
                  <p className="text-sm text-on-surface-variant max-w-md mb-6">
                    Our AI can read the official government documents and explain the benefits and application steps in simple, plain English.
                  </p>
                  <button 
                    onClick={fetchExplanation} 
                    disabled={explanationLoading}
                    className="btn-primary disabled:opacity-50 flex items-center gap-2"
                  >
                    {explanationLoading ? 'Preparing simple explanation...' : 'Explain this simply'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 mb-8 animate-fade-in">
                  {explanation.error ? (
                    <div className="p-4 bg-error/10 text-error rounded-xl text-sm">{explanation.error}</div>
                  ) : (
                    <>
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                        <h3 className="font-display text-lg font-medium text-primary mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                          Simple Summary
                        </h3>
                        <p className="text-on-surface">{explanation.summary}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">What You Get</h3>
                        <div className="bg-surface-container p-4 rounded-xl text-on-surface">
                          {explanation.benefits_simplified}
                        </div>
                      </div>

                      {explanation.steps && explanation.steps.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">How to Apply</h3>
                          <ol className="list-decimal pl-5 space-y-2 text-on-surface bg-surface-container p-4 rounded-xl">
                            {explanation.steps.map((step, idx) => (
                              <li key={idx} className="pl-2">{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {explanation.documents && explanation.documents.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-3">Required Documents</h3>
                          <ul className="list-disc pl-5 space-y-1 text-on-surface bg-surface-container p-4 rounded-xl">
                            {explanation.documents.map((doc, idx) => (
                              <li key={idx} className="pl-2">{doc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {explanation.important_note && (
                        <div className="bg-tertiary/10 border-l-4 border-tertiary p-4 rounded-r-xl">
                          <p className="text-sm text-tertiary/90 font-medium">{explanation.important_note}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Official Information Details */}
              <div className="mt-8 border-t border-white/10 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Official Scheme Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs text-on-surface-variant/60 font-semibold uppercase mb-1">Description</h4>
                    <p className="text-sm text-on-surface leading-relaxed">{selectedScheme.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs text-on-surface-variant/60 font-semibold uppercase mb-1">Ministry</h4>
                      <p className="text-sm text-on-surface">{selectedScheme.ministry}</p>
                    </div>
                    <div>
                      <h4 className="text-xs text-on-surface-variant/60 font-semibold uppercase mb-1">Department</h4>
                      <p className="text-sm text-on-surface">{selectedScheme.department}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs text-on-surface-variant/60 font-semibold uppercase mb-1">Raw Benefits Text</h4>
                    <div className="text-sm text-on-surface prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0">
                      <Markdown>{selectedScheme.benefits}</Markdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-white/5 bg-surface rounded-b-2xl flex flex-wrap gap-3 items-center justify-between sticky bottom-0">
              <div className="flex gap-3 w-full sm:w-auto">
                {selectedScheme.apply_url && selectedScheme.apply_url !== 'N/A' && (
                  <a href={selectedScheme.apply_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-sm font-medium transition text-center flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Apply Online
                  </a>
                )}
                {selectedScheme.official_url && selectedScheme.official_url !== 'N/A' && (
                  <a href={selectedScheme.official_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none px-4 py-2 border border-white/10 text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-lg text-sm font-medium transition text-center flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">public</span>
                    Official Info
                  </a>
                )}
              </div>
              
              <button 
                onClick={draftApplication}
                disabled={draftingLetter}
                className="w-full sm:w-auto px-5 py-2 bg-tertiary text-on-tertiary hover:bg-tertiary/90 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {draftingLetter ? (
                  <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Drafting...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">edit_document</span> Draft Application Letter</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SchemeNavigatorPage;
