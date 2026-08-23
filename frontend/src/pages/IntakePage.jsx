import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function IntakePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = location.state?.isNewConversation || false;
  const autoSubmit = location.state?.autoSubmit || false;
  const initialQuery = location.state?.initialQuery || '';
  const initialFile = location.state?.initialFile || null;

  const [chatHistory, setChatHistory] = useState(() => {
    if (isNew) {
      sessionStorage.removeItem('adhikaar_intake_chatHistory');
      sessionStorage.removeItem('adhikaar_intake_pendingAnalysis');
    }
    const saved = !isNew ? sessionStorage.getItem('adhikaar_intake_chatHistory') : null;
    if (saved) return JSON.parse(saved);
    
    const initialHistory = [{ role: 'ai', content: "Hello! I am your Legal AI Assistant. Please describe your situation in as much detail as possible. You can also upload any relevant documents, contracts, or notices." }];
    
    if (isNew && autoSubmit && (initialQuery || initialFile)) {
      let userMessage = initialQuery.trim() || "I want to analyze this document.";
      if (initialFile) {
        userMessage += `\n[Attached 1 file(s)]`;
      }
      initialHistory.push({ role: 'user', content: userMessage, isFirstNewMessage: true });
    }
    
    return initialHistory;
  });

  const [chatInput, setChatInput] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState(!autoSubmit && initialFile ? [initialFile] : []);
  const [isSubmitting, setIsSubmitting] = useState(isNew && autoSubmit);
  const [loadingText, setLoadingText] = useState("Analyzing...");
  const [isListening, setIsListening] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(() => {
    const saved = !isNew ? sessionStorage.getItem('adhikaar_intake_pendingAnalysis') : null;
    return saved ? JSON.parse(saved) : null;
  });
  
  const hasAutoSubmitted = useRef(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const triggerBackendRequest = async (userMessage, files, historyForBackend) => {
    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('query', userMessage);
      submitData.append('history', JSON.stringify(historyForBackend));
      
      files.forEach((file) => {
        submitData.append('evidence', file);
      });

      const token = localStorage.getItem('adhikaar_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'}/legal/analyze`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
        body: submitData
      });
      
      if (!response.ok) throw new Error('Failed to analyze case');
      
      const data = await response.json();
      
      if (data.response_type === 'question') {
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'ai', 
            content: data.ai_message,
            sources: data.sources || data.analysis?.sources || []
          }
        ]);
      } else {
        setPendingAnalysis(data);
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'ai', 
            content: "I have gathered enough information to generate your comprehensive legal report. You can generate the final report now, or continue asking me questions if you have more details to add.",
            isSystem: true
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit effect on first load if required
  useEffect(() => {
    if (isNew && autoSubmit && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      let userMsg = initialQuery.trim() || "I want to analyze this document.";
      const files = initialFile ? [initialFile] : [];
      if (initialFile) {
        userMsg += `\n[Attached 1 file(s)]`;
      }
      
      // Since it's a new conversation, history is just the AI's first greeting.
      // We pass an empty history to the backend for the *very first* message to keep it clean.
      triggerBackendRequest(userMsg, files, []);
      
      // Clear location state so refresh doesn't auto-submit again
      window.history.replaceState({}, document.title);
    }
  }, [isNew, autoSubmit, initialQuery, initialFile]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, pendingAnalysis, isSubmitting]);

  // Persist session
  useEffect(() => {
    sessionStorage.setItem('adhikaar_intake_chatHistory', JSON.stringify(chatHistory));
    if (pendingAnalysis) {
      sessionStorage.setItem('adhikaar_intake_pendingAnalysis', JSON.stringify(pendingAnalysis));
    } else {
      sessionStorage.removeItem('adhikaar_intake_pendingAnalysis');
    }
  }, [chatHistory, pendingAnalysis]);

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
      const texts = [
        "Reading documents...", 
        "Extracting key facts...", 
        "Analyzing legal precedents...", 
        "Consulting state laws...", 
        "Synthesizing response..."
      ];
      let i = 0;
      setLoadingText(texts[0]);
      interval = setInterval(() => {
        i = (i + 1) % texts.length;
        setLoadingText(texts[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() && evidenceFiles.length === 0) return;
    
    if (pendingAnalysis) setPendingAnalysis(null);

    let userMessage = chatInput.trim();
    if (evidenceFiles.length > 0) {
      userMessage += `\n[Attached ${evidenceFiles.length} file(s)]`;
    }

    const updatedHistory = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(updatedHistory);
    setChatInput('');
    setEvidenceFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const backendHistory = updatedHistory.slice(1, -1);
    await triggerBackendRequest(userMessage, evidenceFiles, backendHistory);
  };

  const handleGenerateReport = () => {
    if (!pendingAnalysis) return;
    sessionStorage.removeItem('adhikaar_intake_chatHistory');
    sessionStorage.removeItem('adhikaar_intake_pendingAnalysis');
    navigate(`/dashboard/case/${pendingAnalysis.id || 'demo'}`, { state: { caseData: pendingAnalysis } });
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
      alert("Your browser does not support Voice to Text. Please use Google Chrome or Microsoft Edge.");
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
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      currentSessionTranscript += finalTranscript;
      setChatInput(startText + (startText ? ' ' : '') + currentSessionTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (recognitionRef.current && !recognitionRef.current.manualStop) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative h-[calc(100vh-96px)] flex flex-col bg-background animate-page-enter">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      {/* Header */}
      <header className="z-10 px-margin-mobile md:px-margin-desktop py-4 border-b border-white/5 bg-surface/50 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center justify-between w-full max-w-container-max mx-auto">
          <div>
            <h1 className="font-display-sm text-display-sm text-on-surface">Legal Assistant</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Confidential AI Intake</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-margin-mobile md:px-margin-desktop py-8 z-10 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          {chatHistory.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.isFirstNewMessage ? 'animate-fade-in-up' : 'animate-fade-in'}`}
            >
              <div className="flex gap-4 max-w-[85%]">
                {msg.role === 'ai' && (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 text-primary">
                    <span className="material-symbols-outlined text-sm">robot_2</span>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <div className={`p-4 rounded-2xl whitespace-pre-wrap font-body-md text-body-md ${
                    msg.role === 'user' 
                      ? 'bg-primary text-on-primary-fixed rounded-tr-none' 
                      : msg.isSystem 
                        ? 'bg-tertiary/20 text-tertiary border border-tertiary/30 rounded-tl-none font-medium'
                        : 'bg-surface-container-high text-on-surface rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>

                  {/* Render Sources if AI provided them */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.sources.map((src, i) => (
                        <div key={i} className="px-3 py-1.5 bg-surface-container border border-white/10 rounded-lg flex items-center gap-2 max-w-[300px]">
                          <span className="material-symbols-outlined text-tertiary text-sm">menu_book</span>
                          <span className="font-label-sm text-[11px] text-on-surface-variant truncate">{src.title || src.section || 'Legal Reference'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render Generate Report button if this is the system prompt */}
                  {msg.isSystem && pendingAnalysis && (
                    <div className="mt-2">
                      <button
                        onClick={handleGenerateReport}
                        className="px-6 py-3 rounded-lg bg-tertiary text-on-primary-fixed font-bold font-label-sm uppercase tracking-wide hover:bg-tertiary/90 transition-colors shadow-[0_4px_14px_rgba(255,180,161,0.2)]"
                      >
                        Generate Final Report
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 border border-white/10">
                    <span className="material-symbols-outlined text-on-surface text-sm">person</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isSubmitting && (
            <div className="flex justify-start animate-fade-in delay-300">
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 text-primary">
                  <span className="material-symbols-outlined text-sm">robot_2</span>
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-surface-container-high text-on-surface-variant font-body-sm flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                  <span className="animate-pulse">{loadingText}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="z-10 bg-surface-container p-margin-mobile md:p-6 border-t border-white/5 shrink-0">
        <div className="max-w-4xl mx-auto">
          {evidenceFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {evidenceFiles.map((file, idx) => (
                <div key={idx} className="bg-surface-container-highest border border-white/10 rounded-lg pl-3 pr-2 py-1.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">description</span>
                  <span className="font-label-sm text-xs text-on-surface truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="text-on-surface-variant hover:text-error ml-1 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-tertiary/30 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative flex items-end gap-3 bg-surface-container-lowest rounded-2xl p-2 border border-white/10 focus-within:border-primary/50 transition-colors">
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                title="Attach Document"
              >
                <span className="material-symbols-outlined text-[22px]">attach_file</span>
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
                placeholder={isListening ? "Listening..." : "Type your message or press Enter to send..."}
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface font-body-lg placeholder-on-surface-variant/50 resize-none py-2.5 max-h-[200px] custom-scrollbar"
                rows="1"
              />
              
              <div className="flex items-center gap-2 shrink-0 pr-1 pb-1">
                <button 
                  onClick={toggleListening}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isListening ? 'bg-error/20 text-error animate-pulse' : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'
                  }`}
                  title="Voice Input"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <button 
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() && evidenceFiles.length === 0}
                  className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary-fixed transition-colors disabled:opacity-50 disabled:hover:bg-primary/20 disabled:hover:text-primary"
                  title="Send Message"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
