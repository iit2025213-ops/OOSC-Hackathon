import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const quickProblems = [
  { icon: 'home_repair_service', title: 'Security Deposit', desc: 'Landlord refusing to return deposit after move out.' },
  { icon: 'shopping_cart', title: 'Consumer Complaint', desc: 'Defective product or unfair service practices.' },
  { icon: 'policy', title: 'RTI Application', desc: 'Draft a Right to Information request for public data.' },
  { icon: 'family_restroom', title: 'Domestic Dispute', desc: 'Information on legal rights and protective measures.' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (query.trim() || selectedFile) {
      navigate('/dashboard/intake', { 
        state: { 
          initialQuery: query.trim() || "I want to analyze this document.", 
          initialFile: selectedFile,
          isNewConversation: true,
          autoSubmit: true
        } 
      });
    }
  };

  const handleQuickProblem = (title) => {
    navigate('/dashboard/intake', { state: { initialQuery: title, isNewConversation: true, autoSubmit: true } });
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

      {/* Premium AI Consultation Interface */}
      <div className="bg-surface-container-low rounded-2xl p-1 relative mb-16 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/5 ring-1 ring-white/10">
        {/* Soft Inner Highlight */}
        <div className="absolute inset-0 rounded-2xl border-t border-white/10 pointer-events-none z-10"></div>
        
        <div className="bg-surface-container rounded-xl p-5 md:p-6 flex flex-col gap-5 relative z-20">
          
          {/* Primary Input Section */}
          <div>
            <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/70 mb-2 block ml-1">
              Tell us what happened
            </label>
            <div className="relative bg-surface-container-lowest border border-white/5 rounded-xl transition-colors focus-within:border-primary/30 focus-within:bg-surface-container-low">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-none p-4 pb-14 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-0 focus:outline-none resize-none custom-scrollbar"
                placeholder="Describe your problem in your own words..."
                rows="2"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); } }}
              />
              
              {/* Bottom bar of textarea */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-[10px] text-on-surface-variant/40 font-mono pl-2">
                  {query.length > 0 ? `${query.length} chars` : ''}
                </span>
                
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:text-primary hover:bg-primary/10 transition-colors" title="Voice Input">
                    <span className="material-symbols-outlined text-[20px]">mic</span>
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={!query.trim() && !selectedFile}
                    className="bg-primary/90 text-on-primary-fixed px-5 py-2 rounded-lg font-label-sm text-sm font-semibold flex items-center gap-2 hover:bg-primary hover:-translate-y-0.5 transition-all shadow-[0_0_15px_rgba(255,180,161,0.15)] hover:shadow-[0_0_20px_rgba(255,180,161,0.3)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    Analyze
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Elegant Divider */}
          <div className="flex items-center gap-3 opacity-60">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">or</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>

          {/* Secondary Upload Zone */}
          {!selectedFile ? (
            <label 
              className={`w-full py-4 px-6 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-all duration-300 ${isDragging ? 'bg-primary/5 border-primary/40' : 'bg-surface-container-low border-dashed border-white/10 hover:bg-surface-container-highest hover:border-white/20'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
              }}
            >
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files[0]) setSelectedFile(e.target.files[0]);
                }}
                accept="image/*,.pdf"
              />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">upload_file</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-body-md text-sm text-on-surface font-medium">Upload a document</span>
                  <span className="font-label-sm text-xs text-on-surface-variant/60">PDF, JPG or PNG &middot; Max 10 MB</span>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-md bg-surface-container border border-white/5 font-label-sm text-xs text-on-surface-variant hover:text-on-surface transition-colors w-full sm:w-auto text-center">
                Browse files
              </div>
            </label>
          ) : (
            <div className="w-full p-3 pl-4 rounded-xl bg-surface-container-highest border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-body-md text-sm text-on-surface truncate max-w-[200px] md:max-w-[400px]">{selectedFile.name}</span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant/60">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                title="Remove File"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

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
