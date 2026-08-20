import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const steps = [
  { num: '01', label: 'Situation' },
  { num: '02', label: 'People' },
  { num: '03', label: 'Location' },
  { num: '04', label: 'Documents' },
  { num: '05', label: 'Goal' },
];

const suggestions = [
  { icon: 'lightbulb', color: 'text-primary', label: 'Suggestion', labelColor: 'text-primary/80', text: 'Mentioning dates and times can help establish a clearer timeline.' },
  { icon: 'group', color: 'text-tertiary', label: 'Prompt', labelColor: 'text-tertiary/80', text: 'Were there any witnesses present? Their names are helpful.' },
  { icon: 'warning', color: 'text-secondary', label: 'Safety Tip', labelColor: 'text-secondary/80', text: 'Do not share sensitive passwords or banking PINs here.' },
];

export default function IntakePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialQuery = location.state?.initialQuery || '';
  const initialFile = location.state?.initialFile || null;

  const [currentStep, setCurrentStep] = useState(0);
  const [evidenceFiles, setEvidenceFiles] = useState(initialFile ? [initialFile] : []);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef(null);
  const [formData, setFormData] = useState({
    situation: initialQuery,
    people: '',
    location: '',
    documents: '',
    goal: '',
  });

  const fieldKeys = ['situation', 'people', 'location', 'documents', 'goal'];
  const stepPrompts = [
    { title: 'Tell us what happened.', desc: "Describe the situation in your own words. Don't worry about legal jargon; our AI will help structure the details for your case file." },
    { title: 'Who is involved?', desc: 'List the people or organizations involved. Include names, roles, and any contact information you have.' },
    { title: 'Where did this happen?', desc: 'Provide the location details — city, state, and any relevant addresses or jurisdictions.' },
    { title: 'Do you have any documents?', desc: 'Mention any contracts, receipts, notices, or correspondence you have related to this issue.' },
    { title: 'What outcome do you want?', desc: 'Tell us your desired resolution — refund, legal notice, complaint filing, or just understanding your rights.' },
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final Step: Submit to Node.js Backend
      setIsSubmitting(true);
      try {
        const submitData = new FormData();
        submitData.append('query', formData.situation);
        submitData.append('details', JSON.stringify(formData));
        
        if (evidenceFiles.length > 0) {
          evidenceFiles.forEach((file) => {
            submitData.append('evidence', file);
          });
        }

        const token = localStorage.getItem('adhikaar_token');
        
        const response = await fetch('http://localhost:3000/api/legal/analyze', {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: submitData
        });
        
        if (!response.ok) throw new Error('Failed to analyze case');
        
        const data = await response.json();
        // Pass the backend response (Legal Brain JSON) to the overview page
        navigate(`/dashboard/case/${data.id || 'demo'}`, { state: { caseData: data } });
      } catch (err) {
        console.error(err);
        alert('Failed to connect to backend. Make sure the Node server is running on port 3000.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.manualStop = true; // Flag that the user intentionally stopped it
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
    
    // Continuous allows dictating an entire paragraph without stopping
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; 

    recognition.onstart = () => setIsListening(true);
    
    let currentSessionTranscript = '';
    const startText = formData[fieldKeys[currentStep]];

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
      
      if (finalTranscript) {
        currentSessionTranscript += finalTranscript;
      }

      setFormData(prev => ({
        ...prev,
        [fieldKeys[currentStep]]: (startText + ' ' + currentSessionTranscript + ' ' + interimTranscript).trim()
      }));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If the user didn't click stop, but the browser auto-stopped due to silence, restart it!
      if (!recognition.manualStop) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };
    
    recognition.start();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="md:px-margin-desktop px-4 pb-24 min-h-[calc(100vh-96px)] flex flex-col relative z-10">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen" style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255, 180, 161, 0.05) 0%, transparent 50%)' }}></div>

      {/* Progress Indicator */}
      <div className="max-w-4xl mx-auto w-full mb-12 mt-4 md:mt-8 relative z-20">
        <div className="flex justify-between items-center mb-4 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-white/5 -z-10"></div>
          {steps.map((step, i) => (
            <div key={step.num} className={`flex flex-col items-center gap-2 relative ${i > 3 ? 'hidden sm:flex' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm text-label-sm transition-all duration-300 ${
                i < currentStep
                  ? 'bg-primary/30 text-primary border border-primary/30'
                  : i === currentStep
                  ? 'bg-primary text-on-primary-fixed shadow-[0_0_15px_rgba(255,180,161,0.3)]'
                  : 'bg-surface-container border border-white/10 text-on-surface-variant'
              }`}>
                {i < currentStep ? (
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                ) : (
                  <span>{step.num}</span>
                )}
              </div>
              <span className={`font-label-sm text-label-sm uppercase tracking-wider absolute top-10 whitespace-nowrap transition-opacity ${
                i === currentStep ? 'text-primary' : 'text-on-surface-variant opacity-50'
              }`}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Area */}
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center relative z-20">
        <div className="mb-10 text-center md:text-left">
          <h2 className="font-display-md text-display-md font-bold text-on-surface mb-4">{stepPrompts[currentStep].title}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">{stepPrompts[currentStep].desc}</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 to-transparent rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
          <div className="glass-panel rounded-xl p-1 relative shadow-[0_0_20px_rgba(255,180,161,0.15)]">
            <textarea
              className={`w-full ${currentStep === 3 ? 'h-40 md:h-48' : 'h-64 md:h-80'} bg-surface/60 border border-white/10 rounded-lg p-6 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/40 resize-none focus:ring-0 focus:border-primary focus:outline-none transition-all`}
              placeholder={`Start typing here...`}
              value={formData[fieldKeys[currentStep]]}
              onChange={(e) => setFormData({ ...formData, [fieldKeys[currentStep]]: e.target.value })}
            />
            
            <div className="absolute bottom-6 right-6 flex items-center gap-3">
              {isListening && (
                <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider">Recording Locked</span>
                </div>
              )}
              <button 
                onClick={toggleListening}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-sm text-label-sm transition-all duration-300 ${
                  isListening 
                    ? 'bg-primary text-on-primary-fixed shadow-[0_4px_20px_rgba(255,180,161,0.4)] hover:bg-primary-fixed' 
                    : 'bg-surface-container-high text-on-surface hover:text-primary hover:bg-surface-container-highest border border-white/10 hover:border-primary/30 shadow-lg'
                }`}
                title={isListening ? "Stop Dictating" : "Start Dictating"}
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: isListening ? "'FILL' 1" : "'FILL' 0" }}>
                  {isListening ? 'mic_off' : 'mic'}
                </span> 
                {isListening ? 'Stop' : 'Dictate'}
              </button>
            </div>
          </div>
        </div>

        {currentStep === 3 && (
          <div className="mt-6 relative z-30">
            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden group">
              <input
                type="file"
                multiple
                onChange={(e) => setEvidenceFiles(Array.from(e.target.files))}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant group-hover:text-primary transition-colors">upload_file</span>
                {evidenceFiles.length > 0 ? (
                  <div className="text-primary font-body-md font-semibold text-center">
                    {evidenceFiles.map((f, i) => (
                      <div key={i}>{f.name}</div>
                    ))}
                    <div className="text-xs text-on-surface-variant mt-2">(Ready to upload)</div>
                  </div>
                ) : (
                  <>
                    <span className="font-body-md text-body-md text-on-surface">Click to browse or drag and drop</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Supports PDF, JPG, PNG (Max 5 files)</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {currentStep === 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestions.map((s) => (
              <div key={s.label} className="glass-panel rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`material-symbols-outlined ${s.color} text-sm group-hover:scale-110 transition-transform`}>{s.icon}</span>
                  <span className={`font-label-sm text-label-sm uppercase ${s.labelColor} tracking-wider`}>{s.label}</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm">{s.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="mt-12 flex justify-between items-center pt-8 border-t border-white/5">
          <button onClick={handleBack} className="text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm uppercase tracking-widest transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleContinue}
            disabled={isSubmitting}
            className={`bg-primary text-on-primary-fixed hover:bg-primary-fixed-dim px-8 py-4 rounded font-label-sm text-label-sm uppercase tracking-widest transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,180,161,0.4)] flex items-center gap-3 group ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
                Analyzing Case...
              </>
            ) : currentStep < steps.length - 1 ? (
              <>
                Continue
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </>
            ) : (
              <>
                Submit Case
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
