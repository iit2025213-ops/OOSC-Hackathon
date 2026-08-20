import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const quickProblems = [
  { icon: 'home_repair_service', title: 'Security Deposit', desc: 'Landlord refusing to return deposit after move out.' },
  { icon: 'shopping_cart', title: 'Consumer Complaint', desc: 'Defective product or unfair service practices.' },
  { icon: 'policy', title: 'RTI Application', desc: 'Draft a Right to Information request for public data.' },
  { icon: 'family_restroom', title: 'Domestic Dispute', desc: 'Information on legal rights and protective measures.' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (query.trim()) {
      navigate('/dashboard/intake', { state: { initialQuery: query } });
    }
  };

  const handleQuickProblem = (title) => {
    navigate('/dashboard/intake', { state: { initialQuery: title } });
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-margin-mobile md:px-margin-desktop max-w-[1000px] w-full mx-auto py-12 md:py-0">
      <div className="space-y-6 mb-12">
        <h2 className="font-display-md md:font-display-lg text-display-md md:text-display-lg text-on-surface tracking-tight leading-tight">
          What can we help you with?
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
          Describe your legal or civic issue naturally. We'll guide you to the right forms, next steps, and action plans tailored to your situation.
        </p>
      </div>

      {/* Primary Interaction Zone */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 relative mb-16 shadow-[0_20px_50px_rgba(0,0,0,0.4)] group hover:border-primary/20 transition-all duration-500">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500 -z-10"></div>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <textarea
              className="w-full bg-surface-container/30 border-0 border-b-2 border-white/10 rounded-t-lg p-4 pb-12 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 focus:border-primary resize-none transition-colors"
              placeholder="Describe your problem in your own words..."
              rows="3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); } }}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-white/5" title="Voice Input">
                <span className="material-symbols-outlined">mic</span>
              </button>
              <button
                onClick={handleAnalyze}
                className="bg-primary text-on-primary-fixed px-4 py-2 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-2 hover:bg-primary-fixed hover:scale-95 transition-all shadow-lg disabled:opacity-50"
                disabled={!query.trim()}
              >
                Analyze
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <div className="h-[1px] flex-1 bg-white/5"></div>
            <span className="font-label-sm text-label-sm uppercase tracking-widest opacity-50">OR</span>
            <div className="h-[1px] flex-1 bg-white/5"></div>
          </div>
          <label className="w-full py-4 border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files[0]) {
                  // Pass the selected file to the intake page
                  navigate('/dashboard/intake', { state: { initialFile: e.target.files[0], initialQuery: "I want to analyze this document." } });
                }
              }}
              accept="image/*,.pdf"
            />
            <span className="material-symbols-outlined text-2xl">upload_file</span>
            <span className="font-body-md text-body-md">Upload a document for analysis</span>
            <span className="font-label-sm text-label-sm opacity-50">PDF, JPG, PNG (Max 10MB)</span>
          </label>
        </div>
      </div>

      {/* Quick Start Grid */}
      <div>
        <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">bolt</span>
          Common Problems
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickProblems.map((p) => (
            <button
              key={p.title}
              onClick={() => handleQuickProblem(p.title)}
              className="glass-panel p-6 rounded-xl hover:-translate-y-1 transition-transform group relative overflow-hidden border border-white/5 hover:border-primary/30 text-left"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-4xl">{p.icon}</span>
              </div>
              <h4 className="font-body-lg text-body-lg font-semibold text-on-surface mb-2 group-hover:text-primary transition-colors">{p.title}</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
