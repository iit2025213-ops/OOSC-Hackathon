import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const quickProblems = [
  { icon: 'home_repair_service', titleKey: 'home.quick_deposit' },
  { icon: 'shopping_cart', titleKey: 'home.quick_consumer' },
  { icon: 'policy', titleKey: 'home.quick_rti' },
  { icon: 'family_restroom', titleKey: 'home.quick_domestic' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recentCases, setRecentCases] = useState([]);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const { t, i18n } = useTranslation();

  // Fetch recent cases
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await authFetch('/cases');
        if (res.ok) {
          const data = await res.json();
          setRecentCases(data.slice(0, 3));
        }
      } catch (e) { /* silent */ }
    };
    fetchRecent();
  }, [authFetch]);

  const createCaseAndNavigate = async (problemText) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const token = localStorage.getItem('adhikaar_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'}/cases/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ initial_query: problemText })
      });

      if (!res.ok) throw new Error('Failed to create case');
      const newCase = await res.json();

      navigate(`/dashboard/case/${newCase.id}`, {
        state: {
          isNewCase: true,
          autoSubmit: true,
          initialQuery: problemText,
          initialFile: selectedFile
        }
      });
    } catch (err) {
      console.error('Failed to create case:', err);
      alert('Failed to start a new case. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.manualStop = true;
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice to Text.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.manualStop = false;
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Sync voice recognition language with the i18n selected language
    recognition.lang = i18n.language === 'en' ? 'en-IN' : 'hi-IN';
    
    recognition.onstart = () => setIsListening(true);
    let currentSessionTranscript = '';
    const startText = query;
    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      currentSessionTranscript += final;
      const newQuery = startText + (startText ? ' ' : '') + currentSessionTranscript + interim;
      setQuery(newQuery);
      if (textareaRef.current) {
         textareaRef.current.style.height = 'auto';
         textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      if (recognitionRef.current && !recognitionRef.current.manualStop) {
        try { recognitionRef.current.start(); } catch(e) { setIsListening(false); }
      } else { setIsListening(false); }
    };
    recognition.start();
  };

  const handleAnalyze = () => {
    if (query.trim() || selectedFile) {
      createCaseAndNavigate(query.trim() || "I want to analyze this document.");
    }
  };

  const handleQuickProblem = (title) => {
    createCaseAndNavigate(title);
  };

  function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = (now - d) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex flex-col px-6 md:px-8 max-w-[720px] w-full mx-auto min-h-screen md:min-h-[100vh] py-4 md:py-8">
      
      {/* Top Spacer for Optical Centering */}
      <div className="flex-1 min-h-[40px]"></div>
      
      {/* Main Content */}
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col items-center text-center space-y-3 mb-10 w-full">
          <h2 className="font-display-md text-[32px] text-on-surface tracking-tight font-semibold">
            {t('home.welcome_title')}
          </h2>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-xl mx-auto leading-relaxed notranslate">
            {t('home.welcome_subtitle')}
          </p>
        </div>

        {/* Premium AI Consultation Interface */}
        <div className="w-full bg-surface-container-low rounded-[20px] p-5 relative mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-white/5 ring-1 ring-white/10 flex flex-col gap-3">
          <div className="relative flex flex-col gap-3 z-20">
            <textarea
              ref={textareaRef}
              className="w-full bg-transparent border-none px-2 py-1 font-body-md text-[15px] text-on-surface placeholder:text-on-surface-variant/40 focus:ring-0 focus:outline-none resize-none custom-scrollbar min-h-[60px]"
              placeholder={t('home.input_placeholder')}
              rows="1"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); } }}
              disabled={isCreating}
            />

            {/* Uploaded File Preview */}
            {selectedFile && (
              <div className="flex items-center justify-between bg-surface-container-highest border border-white/10 rounded-lg p-2 px-3 w-max">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">description</span>
                  <span className="font-body-md text-[13px] text-on-surface truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant/60 ml-2">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="ml-4 text-on-surface-variant hover:text-error">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="file" className="hidden" onChange={(e) => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }} accept="image/*,.pdf" />
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-white/10 group-hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </div>
                  <span className="font-label-sm text-[11px] text-on-surface-variant/50 hidden sm:block tracking-wider">{t('home.upload_hint')}</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-on-surface-variant/40 font-mono pr-2">
                  {query.length > 0 ? `${query.length} chars` : ''}
                </span>
                <button 
                  onClick={toggleListening}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isListening ? 'bg-error/20 text-error animate-pulse' : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'
                  }`}
                  title="Voice Input"
                >
                  <span className="material-symbols-outlined text-[18px]">mic</span>
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={(!query.trim() && !selectedFile) || isCreating}
                  className="bg-primary/90 text-on-primary-fixed px-4 py-1.5 rounded-full font-label-sm text-[13px] font-semibold flex items-center gap-1.5 hover:bg-primary transition-all disabled:opacity-50"
                >
                  {isCreating ? (
                    <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span></>
                  ) : (
                    <>{t('home.analyze_btn')} <span className="material-symbols-outlined text-[16px]">arrow_upward</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {quickProblems.map((p) => (
            <button
              key={p.titleKey}
              onClick={() => handleQuickProblem(t(p.titleKey))}
              disabled={isCreating}
              className="flex items-center gap-2 px-4 py-2 rounded-[20px] border border-white/10 bg-surface-container-low hover:bg-surface-container hover:border-primary/30 transition-all text-on-surface-variant hover:text-on-surface disabled:opacity-50 max-w-[200px]"
            >
              <span className="material-symbols-outlined text-[16px] text-primary/80 shrink-0">{p.icon}</span>
              <span className="font-body-sm text-[13px] leading-tight break-words text-left">{t(p.titleKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Spacer */}
      <div className="flex-[1.5] min-h-[40px]"></div>

      {/* Recent Cases (Pushed to bottom) */}
      {recentCases.length > 0 && (
        <div className="w-full shrink-0 mb-8 border-t border-white/5 pt-8 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-body-lg text-[14px] font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[16px]">history</span>
              {t('home.recent_cases')}
            </h3>
            <button onClick={() => navigate('/dashboard/cases')} className="font-label-sm text-xs text-primary hover:underline flex items-center gap-1">
              {t('home.view_all')} <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
          <div className="space-y-2">
            {recentCases.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/dashboard/case/${c.id}`)}
                className="w-full glass-card rounded-lg p-4 flex items-center justify-between hover:border-primary/20 transition-all group text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0">description</span>
                  <span className="font-body-md text-sm text-on-surface truncate group-hover:text-primary transition-colors">{c.title || t('home.untitled_case')}</span>
                </div>
                <span className="font-label-sm text-[10px] text-on-surface-variant shrink-0">{timeAgo(c.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
