import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';

const LOADING_TEXTS = [
  "Reading documents...",
  "Extracting key facts...",
  "Analyzing legal precedents...",
  "Consulting state laws...",
  "Synthesizing response..."
];

export default function CasePage() {
  const navigate = useNavigate();
  const { caseId } = useParams();
  const location = useLocation();
  const { authFetch } = useAuth();

  const isNewCase = location.state?.isNewCase || false;
  const initialQuery = location.state?.initialQuery || '';
  const initialFile = location.state?.initialFile || null;

  const [caseData, setCaseData] = useState(null);
  const [messages, setMessages] = useState(() => {
    return location.state?.isNewCase ? [
      { role: 'ai', content: { text: "Hello! I am your Legal AI Assistant. Please describe your situation in detail. You can also upload relevant documents." }, id: 'welcome' }
    ] : [];
  });
  const [chatInput, setChatInput] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState('conversation');
  const [pageLoading, setPageLoading] = useState(!isNewCase);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [streamStatus, setStreamStatus] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});
  const [draftedDocuments, setDraftedDocuments] = useState([]);
  const [isDrafting, setIsDrafting] = useState(false);

  const hasAutoSubmitted = useRef(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Fetch existing case data on mount (if not a brand new case)
  useEffect(() => {
    if (isNewCase) {
      // For new cases, we already have the case from the creation step
      setCaseData({ id: caseId, title: initialQuery.substring(0, 60) || 'New Case', status: 'active' });
      setPageLoading(false);
      return;
    }

    const fetchCase = async () => {
      setPageLoading(true);
      setMessages([]);
      setError(null);
      try {
        const res = await authFetch(`/cases/${caseId}`);
        if (!res.ok) throw new Error('Failed to load case');
        const data = await res.json();
        setCaseData(data);
        
        // Transform DB messages to chat format
        const chatMessages = [];
        chatMessages.push({
          role: 'ai',
          content: { text: "Hello! I am your Legal AI Assistant. Please describe your situation in detail." },
          id: 'welcome'
        });
        (data.messages || []).forEach(m => {
          chatMessages.push({
            role: m.role === 'assistant' ? 'ai' : 'user',
            content: m.content,
            id: m.id,
            created_at: m.created_at,
            isAnalysis: m.content?.response_type === 'analysis'
          });
          // Extract analysis data if present
          if (m.role === 'assistant' && m.content?.response_type === 'analysis') {
            setAnalysisData(m.content.analysis || m.content);
          }
          // Extract drafted documents
          if (m.role === 'assistant' && m.content?.response_type === 'document_draft') {
            setDraftedDocuments(prev => [...prev, m.content]);
          }
          // Extract evidence URLs if present
          if (m.content?.evidence_provided?.length > 0) {
            setUploadedDocs(prev => [...prev, ...m.content.evidence_provided.map((url, i) => ({ url, name: `Document ${i + 1}` }))]);
          }
        });
        setMessages(chatMessages);
      } catch (err) {
        setError(err.message);
      } finally {
        setPageLoading(false);
      }
    };
    fetchCase();
  }, [caseId, isNewCase, authFetch]);

  // Auto-submit the first message for new cases
  useEffect(() => {
    if (isNewCase && !hasAutoSubmitted.current && initialQuery && !pageLoading) {
      hasAutoSubmitted.current = true;
      
      const userMsg = initialQuery.trim();
      setMessages(prev => [...prev, { role: 'user', content: { text: userMsg }, id: 'first-msg', isFirstNewMessage: true }]);
      
      sendToBackend(userMsg, initialFile ? [initialFile] : []);
      
      // Clear location state to prevent re-submit on refresh
      window.history.replaceState({}, document.title);
    }
  }, [isNewCase, initialQuery, initialFile, pageLoading]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [chatInput]);

  // Dynamic loading text
  useEffect(() => {
    let interval;
    if (isSubmitting) {
      let i = 0;
      setLoadingText(LOADING_TEXTS[0]);
      interval = setInterval(() => {
        i = (i + 1) % LOADING_TEXTS.length;
        setLoadingText(LOADING_TEXTS[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const sendToBackend = async (userMessage, files = []) => {
    setIsSubmitting(true);
    setStreamStatus(null);
    try {
      const submitData = new FormData();
      submitData.append('query', userMessage);

      // Build history from current messages (exclude welcome & current)
      const historyForBackend = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'ai' ? 'ai' : 'user',
          content: typeof m.content === 'string' ? m.content : (m.content?.text || m.content?.ai_message || m.content?.followup_answer || '')
        }));
      submitData.append('history', JSON.stringify(historyForBackend));

      if (analysisData) {
        submitData.append('previous_analysis', JSON.stringify(analysisData));
      }

      files.forEach(file => submitData.append('evidence', file));

      const token = localStorage.getItem('adhikaar_token');
      const response = await fetch(`http://localhost:3000/api/cases/${caseId}/message/stream`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        body: submitData
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(line => line.trim().startsWith('data: '));
        
        for (const line of lines) {
          try {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            const data = JSON.parse(dataStr);
            
            if (data.status) {
              setStreamStatus(data.status);
            } else if (data.final_response) {
              const aiData = data.final_response;
              if (aiData.response_type === 'question' || aiData.response_type === 'followup') {
                setMessages(prev => [...prev, {
                  role: 'ai',
                  content: aiData,
                  id: aiData.request_id || Date.now()
                }]);
              } else if (aiData.response_type === 'analysis') {
                setAnalysisData(aiData.analysis || aiData);
                setMessages(prev => [...prev, {
                  role: 'ai',
                  content: aiData,
                  id: aiData.request_id || Date.now(),
                  isAnalysis: true
                }]);
              } else {
                setMessages(prev => [...prev, {
                  role: 'ai',
                  content: aiData,
                  id: aiData.request_id || Date.now()
                }]);
              }
            }
          } catch(e) {
            console.error("Error parsing stream chunk:", e, line);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: { text: "Sorry, I couldn't connect to the server. Please try again." },
        id: Date.now()
      }]);
    } finally {
      setIsSubmitting(false);
      setStreamStatus(null);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() && evidenceFiles.length === 0) return;

    let userMessage = chatInput.trim();
    if (evidenceFiles.length > 0) {
      userMessage += `\n[Attached ${evidenceFiles.length} file(s)]`;
    }

    setMessages(prev => [...prev, { role: 'user', content: { text: userMessage }, id: Date.now() }]);
    setChatInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await sendToBackend(userMessage, evidenceFiles);
    setEvidenceFiles([]);
  };

  const handleFeedback = async (msgId, rating) => {
    setFeedbackState(prev => ({ ...prev, [msgId]: rating }));
    try {
      const token = localStorage.getItem('adhikaar_token');
      await fetch(`http://localhost:3000/api/cases/${caseId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ request_id: msgId, rating, comments: "" })
      });
    } catch(err) {
      console.error("Failed to send feedback:", err);
    }
  };

  const handleDraftDocument = async (instruction) => {
    setIsDrafting(true);
    try {
      const historyForBackend = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'ai' ? 'ai' : 'user',
          content: typeof m.content === 'string' ? m.content : (m.content?.text || m.content?.ai_message || m.content?.followup_answer || '')
        }));

      const token = localStorage.getItem('adhikaar_token');
      const res = await fetch(`http://localhost:3000/api/cases/${caseId}/draft_document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          instruction,
          history: historyForBackend,
          previous_analysis: analysisData || null
        })
      });

      if (!res.ok) throw new Error('Failed to draft document');
      const data = await res.json();
      setDraftedDocuments(prev => [...prev, data]);
      setActiveTab('documents');
    } catch (err) {
      console.error("Failed to draft document:", err);
      alert("Failed to draft document. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
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
    recognition.lang = 'en-IN';
    recognition.onstart = () => setIsListening(true);
    let currentSessionTranscript = '';
    const startText = chatInput;
    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      currentSessionTranscript += final;
      setChatInput(startText + (startText ? ' ' : '') + currentSessionTranscript + interim);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      if (recognitionRef.current && !recognitionRef.current.manualStop) {
        try { recognitionRef.current.start(); } catch(e) { setIsListening(false); }
      } else { setIsListening(false); }
    };
    recognition.start();
  };

  const handleFileChange = (e) => {
    if (e.target.files) setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getMessageText = (msg) => {
    const c = msg.content;
    if (!c) return '';
    if (typeof c === 'string') return c;
    if (c.text) return c.text;
    if (c.ai_message) return c.ai_message;
    if (c.followup_answer) return c.followup_answer;
    return '';
  };

  const renderAIContent = (msg) => {
    const c = msg.content;
    if (!c) return null;

    // Simple text response (question type, followup or welcome)
    const text = c.text || c.ai_message || c.followup_answer;
    if (text && !c.analysis) {
      return (
        <div className="whitespace-pre-wrap">{text}</div>
      );
    }

    // Rich analysis response
    if (c.analysis || c.response_type === 'analysis') {
      const a = c.analysis || c;
      return (
        <div className="space-y-4">
          {a.summary && (
            <div>
              <h4 className="font-label-sm text-[11px] uppercase tracking-wider text-primary mb-1">What Happened</h4>
              <p className="text-on-surface">{a.summary}</p>
            </div>
          )}
          {a.legal_position?.length > 0 && (
            <div>
              <h4 className="font-label-sm text-[11px] uppercase tracking-wider text-primary mb-2">Your Likely Rights</h4>
              {a.legal_position.map((pos, i) => (
                <div key={i} className="bg-surface-container-low p-3 rounded-lg mb-2 border border-white/5">
                  <div className="flex justify-between items-start">
                    <span className="font-body-md text-on-surface font-medium">{pos.issue || `Point ${i+1}`}</span>
                    {pos.confidence && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${pos.confidence === 'high' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {pos.confidence}
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-sm mt-1">{pos.explanation || pos}</p>
                </div>
              ))}
            </div>
          )}
          {a.next_steps?.length > 0 && (
            <div>
              <h4 className="font-label-sm text-[11px] uppercase tracking-wider text-primary mb-2">What You Should Do Next</h4>
              <ol className="space-y-2 list-none">
                {a.next_steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-on-surface">
                    <span className="font-mono text-primary shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {a.documents_required?.length > 0 && (
            <div>
              <h4 className="font-label-sm text-[11px] uppercase tracking-wider text-primary mb-2">Documents Needed</h4>
              <ul className="space-y-1">
                {a.documents_required.map((doc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] mt-0.5 text-primary">description</span>
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.relevant_contacts?.length > 0 && (
            <div>
              <h4 className="font-label-sm text-[11px] uppercase tracking-wider text-primary mb-2">Relevant Contacts</h4>
              {a.relevant_contacts.map((contact, i) => (
                <div key={i} className="bg-surface-container-low p-3 rounded-lg mb-2 border border-white/5">
                  <span className="font-body-md text-on-surface font-semibold text-sm">{contact.name}</span>
                  <span className="block text-[10px] text-on-surface-variant mb-1">{contact.description}</span>
                  <div className="flex gap-3">
                    {contact.phone && <a href={`tel:${contact.phone}`} className="text-xs text-primary flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">call</span>{contact.phone}</a>}
                    {contact.website && <a href={contact.website} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">language</span>Website</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {a.sources?.length > 0 && (
            <div>
              <h4 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-2">Sources Referenced</h4>
              <div className="flex flex-wrap gap-2">
                {a.sources.map((src, i) => (
                  <div key={i} className="px-3 py-1.5 bg-surface-container border border-white/10 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-sm">menu_book</span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant truncate max-w-[200px]">{src.act_title || src.title || 'Legal Reference'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {a.disclaimer && (
            <p className="text-[10px] text-on-surface-variant/40 italic border-t border-white/5 pt-3 mt-3">{a.disclaimer}</p>
          )}
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-end gap-3">
             <button 
               onClick={() => {
                 const instruction = `Draft a legal notice based on this analysis about ${a.domain || 'the case'}`;
                 handleDraftDocument(instruction);
               }}
               disabled={isDrafting}
               className="bg-tertiary/20 text-tertiary px-4 py-2 rounded-lg font-label-sm text-xs flex items-center gap-2 hover:bg-tertiary/30 transition-colors disabled:opacity-50"
             >
               {isDrafting ? (
                 <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> Drafting...</>
               ) : (
                 <><span className="material-symbols-outlined text-[14px]">draft</span> Draft Legal Document</>
               )}
             </button>
             <button onClick={() => setActiveTab('action-plan')} className="bg-primary/20 text-primary px-4 py-2 rounded-lg font-label-sm text-xs flex items-center gap-2 hover:bg-primary/30 transition-colors">
                View Full Action Plan <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
             </button>
          </div>
        </div>
      );
    }

    // Fallback
    return <div className="whitespace-pre-wrap">{JSON.stringify(c)}</div>;
  };

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-margin-mobile animate-page-enter">
        <div className="glass-card rounded-xl p-8 text-center max-w-md">
          <span className="material-symbols-outlined text-error text-4xl mb-4 block">error_outline</span>
          <h2 className="font-headline-lg text-xl text-on-surface mb-2">We couldn't load this case</h2>
          <p className="font-body-md text-sm text-on-surface-variant mb-6">Please try again. Your case has not been deleted.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-lg bg-primary text-on-primary-fixed font-label-sm text-sm">Try Again</button>
            <button onClick={() => navigate('/dashboard/cases')} className="px-5 py-2.5 rounded-lg border border-white/10 text-on-surface font-label-sm text-sm hover:bg-white/5">Back to My Cases</button>
          </div>
        </div>
      </div>
    );
  }

  // --- LOADING STATE ---
  if (pageLoading) {
    return (
      <div className="flex-1 flex flex-col h-[calc(100vh-96px)] animate-page-enter">
        <div className="px-margin-mobile md:px-6 py-4 border-b border-white/5">
          <div className="h-6 w-48 bg-surface-container-high rounded animate-pulse mb-2"></div>
          <div className="h-4 w-32 bg-surface-container rounded animate-pulse"></div>
        </div>
        <div className="flex-1 px-margin-mobile md:px-6 py-8 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`h-16 rounded-2xl bg-surface-container-high animate-pulse ${i % 2 === 0 ? 'w-1/3' : 'w-2/3'}`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen md:h-[100vh] animate-page-enter">
      {/* Case Header */}
      <header className="z-10 px-margin-mobile md:px-6 py-3 border-b border-white/5 bg-surface/80 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between max-w-container-max mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/dashboard/cases')} className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-body-lg text-on-surface font-semibold truncate">{caseData?.title || 'Case'}</h1>
              <p className="font-label-sm text-[10px] text-on-surface-variant">
                Case #{caseId?.substring(0, 8)} · {caseData?.status === 'active' ? (
                  <span className="text-green-400">Active</span>
                ) : (
                  <span className="text-primary capitalize">{caseData?.status}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-2 max-w-container-max mx-auto">
          {['conversation', 'documents', 'action-plan'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg font-label-sm text-[11px] uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? 'bg-surface-container-high text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content */}
      {activeTab === 'conversation' && (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-margin-mobile md:px-6 py-6 z-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-5">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.isFirstNewMessage ? 'animate-fade-in-up' : 'animate-fade-in'}`}
                >
                  <div className="flex gap-3 max-w-[85%]">
                    {msg.role === 'ai' && (
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
                        <span className="material-symbols-outlined text-[16px]">robot_2</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className={`p-4 rounded-2xl font-body-md text-[15px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-on-primary-fixed rounded-tr-sm'
                          : 'bg-surface-container-high text-on-surface rounded-tl-sm'
                      }`}>
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{getMessageText(msg)}</div>
                        ) : (
                          renderAIContent(msg)
                        )}
                      </div>

                      {msg.role === 'ai' && msg.id !== 'welcome' && (
                        <div className="flex items-center gap-2 px-2 mt-1">
                          <button 
                            onClick={() => handleFeedback(msg.id, 1)}
                            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition-colors ${feedbackState[msg.id] === 1 ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-white/5'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                            <span>Helpful</span>
                          </button>
                          <button 
                            onClick={() => handleFeedback(msg.id, -1)}
                            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition-colors ${feedbackState[msg.id] === -1 ? 'bg-error/20 text-error' : 'text-on-surface-variant hover:bg-white/5'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">thumb_down</span>
                            <span>Not Helpful</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 border border-white/10">
                        <span className="material-symbols-outlined text-on-surface text-[16px]">person</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSubmitting && (
                <div className="flex justify-start animate-fade-in delay-200">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
                      <span className="material-symbols-outlined text-[16px]">robot_2</span>
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-surface-container-high text-on-surface-variant font-body-sm flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: '16px' }}>progress_activity</span>
                      <span className="animate-pulse text-sm">{streamStatus || loadingText}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="z-10 bg-surface-container p-3 md:px-6 md:py-4 border-t border-white/5 shrink-0">
            <div className="max-w-4xl mx-auto">
              {evidenceFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {evidenceFiles.map((file, idx) => (
                    <div key={idx} className="bg-surface-container-highest border border-white/10 rounded-lg pl-3 pr-2 py-1 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">description</span>
                      <span className="font-label-sm text-[11px] text-on-surface truncate max-w-[120px]">{file.name}</span>
                      <button onClick={() => removeFile(idx)} className="text-on-surface-variant hover:text-error">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-xl blur opacity-0 group-focus-within:opacity-40 transition duration-500"></div>
                <div className="relative flex items-end gap-2 bg-surface-container-lowest rounded-xl p-2 border border-white/10 focus-within:border-primary/40 transition-colors">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Attach Document"
                  >
                    <span className="material-symbols-outlined text-[20px]">attach_file</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />

                  <textarea
                    ref={textareaRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Listening..." : "Ask anything about your case..."}
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface font-body-md text-[15px] placeholder-on-surface-variant/50 resize-none py-2 max-h-[200px] custom-scrollbar"
                    rows="1"
                    disabled={isSubmitting}
                  />

                  <div className="flex items-center gap-1 shrink-0 pr-1 pb-0.5">
                    <button
                      onClick={toggleListening}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                        isListening ? 'bg-error/20 text-error animate-pulse' : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'
                      }`}
                      title="Voice Input"
                    >
                      <span className="material-symbols-outlined text-[18px]">mic</span>
                    </button>
                    <button
                      onClick={handleChatSubmit}
                      disabled={(!chatInput.trim() && evidenceFiles.length === 0) || isSubmitting}
                      className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary-fixed transition-colors disabled:opacity-40"
                      title="Send Message"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-center text-[10px] text-on-surface-variant/40 mt-2 font-label-sm">
                Press <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-surface-container text-[9px]">Enter</kbd> to send · <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-surface-container text-[9px]">Shift + Enter</kbd> for a new line.
              </p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'documents' && (
        <div className="flex-1 overflow-y-auto px-margin-mobile md:px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Drafted Document Viewer */}
            {draftedDocuments.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[16px]">draft</span>
                    Generated Documents
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draftedDocuments.map((doc, idx) => (
                    <div key={idx} className="glass-card rounded-xl p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-tertiary text-[20px]">description</span>
                            <h4 className="font-body-md text-on-surface font-semibold line-clamp-1">{doc.document_type || 'Legal Document'}</h4>
                          </div>
                        </div>
                        <p className="font-label-sm text-[10px] text-on-surface-variant/60 mb-4">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Generated just now'}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {doc.pdf_url && (
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center py-2 bg-primary/20 text-primary font-label-sm text-[11px] rounded-lg hover:bg-primary/30 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px] align-middle mr-1">download</span>
                            Download PDF
                          </a>
                        )}
                        <button
                          onClick={() => {
                            const blob = new Blob([doc.markdown_content], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${doc.document_type || 'Legal_Document'}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex-1 text-center py-2 border border-white/10 text-on-surface-variant font-label-sm text-[11px] rounded-lg hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px] align-middle mr-1">markdown</span>
                          Raw Markdown
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadedDocs.length === 0 && !analysisData?.documents_required && draftedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 text-6xl mb-4">folder_open</span>
                <h3 className="font-body-lg text-on-surface mb-1">No Documents Yet</h3>
                <p className="font-label-sm text-on-surface-variant text-xs max-w-sm">
                  Documents you upload during your conversation and documents the AI recommends will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Uploaded Documents */}
                {uploadedDocs.length > 0 && (
                  <div>
                    <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-3">Uploaded Evidence</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {uploadedDocs.map((doc, i) => (
                        <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="glass-card rounded-lg p-4 flex items-center gap-3 hover:border-primary/20 transition-colors group">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-body-md text-sm text-on-surface font-medium truncate block group-hover:text-primary transition-colors">{doc.name}</span>
                            <span className="font-label-sm text-[10px] text-on-surface-variant">Uploaded during conversation</span>
                          </div>
                          <span className="material-symbols-outlined text-on-surface-variant text-[16px] group-hover:text-primary">open_in_new</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Documents */}
                {analysisData?.documents_required?.length > 0 && (
                  <div>
                    <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-3">Documents You Need to Gather</h3>
                    <div className="space-y-2">
                      {analysisData.documents_required.map((doc, i) => (
                        <div key={i} className="glass-card rounded-lg p-4 flex items-center gap-3">
                          <span className="material-symbols-outlined text-secondary text-[18px]">task</span>
                          <span className="font-body-md text-sm text-on-surface">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'action-plan' && (
        <div className="flex-1 overflow-y-auto px-margin-mobile md:px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {!analysisData ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/20 text-6xl mb-4">assignment</span>
                <h3 className="font-body-lg text-on-surface mb-2">No Action Plan Yet</h3>
                <p className="font-label-sm text-on-surface-variant text-xs max-w-sm mb-6">
                  Continue your conversation with the AI. Once it has enough information, it will generate a comprehensive legal analysis and action plan.
                </p>
                <button onClick={() => setActiveTab('conversation')} className="px-5 py-2.5 rounded-lg bg-primary/20 text-primary font-label-sm text-sm hover:bg-primary/30 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  Continue Conversation
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in">
                {/* Summary */}
                <section className="glass-card rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[20px]">summarize</span>
                    </div>
                    <div>
                      <h3 className="font-body-lg text-on-surface font-semibold">Case Summary</h3>
                      {analysisData.domain && <span className="font-label-sm text-[10px] text-primary">{analysisData.domain}{analysisData.subdomain ? ` · ${analysisData.subdomain}` : ''}</span>}
                    </div>
                  </div>
                  <p className="font-body-md text-on-surface-variant leading-relaxed">{analysisData.summary}</p>
                </section>

                {/* Next Steps */}
                {analysisData.next_steps?.length > 0 && (
                  <section>
                    <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">checklist</span>
                      Your Action Steps
                    </h3>
                    <div className="relative border-l-2 border-primary/20 ml-4 pl-8 space-y-6">
                      {analysisData.next_steps.map((step, i) => (
                        <div key={i} className="relative group">
                          <div className="absolute -left-[41px] w-8 h-8 rounded-full bg-surface-container-high border-2 border-primary/30 flex items-center justify-center text-primary font-mono text-xs group-hover:bg-primary group-hover:text-on-primary-fixed group-hover:border-primary transition-colors">
                            {i + 1}
                          </div>
                          <div className="glass-card rounded-lg p-5 hover:border-primary/20 transition-colors">
                            <p className="font-body-md text-on-surface">{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Legal Position */}
                {analysisData.legal_position?.length > 0 && (
                  <section>
                    <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[16px]">gavel</span>
                      Legal Position
                    </h3>
                    <div className="space-y-3">
                      {analysisData.legal_position.map((pos, i) => (
                        <div key={i} className="glass-card rounded-lg p-5">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-body-md text-on-surface font-semibold">{pos.issue || `Analysis Point ${i + 1}`}</h4>
                            {pos.confidence && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${pos.confidence === 'high' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {pos.confidence}
                              </span>
                            )}
                          </div>
                          <p className="font-body-sm text-on-surface-variant text-sm">{pos.explanation || pos}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Applicable Laws */}
                {analysisData.possible_laws?.length > 0 && (
                  <section>
                    <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary text-[16px]">menu_book</span>
                      Applicable Laws
                    </h3>
                    <div className="space-y-3">
                      {analysisData.possible_laws.map((law, i) => (
                        <div key={i} className="glass-card rounded-lg p-5">
                          <h4 className="font-body-md text-on-surface font-semibold mb-1">{law.name}</h4>
                          <p className="font-body-sm text-on-surface-variant text-sm mb-3">{law.simple_explanation}</p>
                          {law.sections?.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {law.sections.map((sec, j) => (
                                <span key={j} className="px-2 py-1 bg-surface-container-highest rounded text-[10px] text-on-surface font-mono">{sec}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Contacts & Deadlines */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysisData.relevant_contacts?.length > 0 && (
                    <section>
                      <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-3">Relevant Contacts</h3>
                      {analysisData.relevant_contacts.map((c, i) => (
                        <div key={i} className="glass-card rounded-lg p-4 mb-2">
                          <span className="font-body-md text-sm text-on-surface font-semibold block">{c.name}</span>
                          <span className="font-label-sm text-[10px] text-on-surface-variant block mb-2">{c.description}</span>
                          <div className="flex gap-3">
                            {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-primary flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-[12px]">call</span>{c.phone}</a>}
                            {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-[12px]">language</span>Website</a>}
                          </div>
                        </div>
                      ))}
                    </section>
                  )}

                  {analysisData.deadlines?.length > 0 && (
                    <section>
                      <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-3">Deadlines</h3>
                      {analysisData.deadlines.map((d, i) => (
                        <div key={i} className="glass-card rounded-lg p-4 mb-2 flex items-center gap-3">
                          <span className="material-symbols-outlined text-secondary text-[16px]">timer</span>
                          <span className="font-body-sm text-sm text-on-surface">{d}</span>
                        </div>
                      ))}
                    </section>
                  )}
                </div>

                {/* Disclaimer */}
                {analysisData.disclaimer && (
                  <p className="text-[10px] text-on-surface-variant/40 text-center italic border-t border-white/5 pt-4">{analysisData.disclaimer}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
