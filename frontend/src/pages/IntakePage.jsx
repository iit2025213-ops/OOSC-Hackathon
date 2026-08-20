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

  const [currentStep, setCurrentStep] = useState(0);
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

  const handleContinue = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit — navigate to case overview with mock data
      navigate('/dashboard/case/demo', { state: { formData } });
    }
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
              className="w-full h-64 md:h-80 bg-surface/60 border border-white/10 rounded-lg p-6 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/40 resize-none focus:ring-0 focus:border-primary focus:outline-none transition-colors"
              placeholder={`Start typing here...`}
              value={formData[fieldKeys[currentStep]]}
              onChange={(e) => setFormData({ ...formData, [fieldKeys[currentStep]]: e.target.value })}
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant opacity-70 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">mic</span> Voice Input
              </span>
            </div>
          </div>
        </div>

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
            className="bg-primary text-on-primary-fixed hover:bg-primary-fixed-dim px-8 py-4 rounded font-label-sm text-label-sm uppercase tracking-widest transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,180,161,0.4)] flex items-center gap-3 group"
          >
            {currentStep < steps.length - 1 ? 'Continue' : 'Submit Case'}
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
