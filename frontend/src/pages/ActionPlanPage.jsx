import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ActionPlanPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      if (caseId === 'demo') {
        setLoading(false);
        return;
      }
      try {
        const res = await authFetch(`/cases/${caseId}`);
        if (res.ok) {
          const data = await res.json();
          setCaseData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCaseDetails();
  }, [caseId, authFetch]);

  // Dynamically generate action steps from the Python API's next_steps array
  const rawSteps = caseData?.analysis?.next_steps || caseData?.next_steps || [
    "Consult a legal professional for exact instructions.",
    "Draft a formal complaint based on the legal position."
  ];

  const actionSteps = rawSteps.map((stepText, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    title: idx === 0 ? 'Initial Action' : `Follow-up Step ${idx}`,
    desc: stepText,
    status: idx === 0 ? 'active' : 'locked',
    details: idx === 0 ? [
      { done: true, text: 'Review AI Legal Position' },
      { done: false, text: 'Gather required documents' },
      { done: false, text: 'Execute this step' },
    ] : []
  }));

  const completedCount = actionSteps.filter(s => s.status === 'completed').length;
  const progress = Math.round((completedCount / actionSteps.length) * 100) || 0;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface">Loading Action Plan...</div>;
  }

  return (
    <div className="px-margin-mobile md:px-margin-desktop pb-24 pt-4 md:pt-8 min-h-[calc(100vh-96px)]">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/5 via-background to-background opacity-50"></div>
      </div>

      {/* Header */}
      <header className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-white/5 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Case #{caseData?.request_id || caseId || '4029'}</span>
            </div>
            <h2 className="font-display-md text-display-md text-on-surface">Your Action Plan</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Here is the exact strategy recommended by the AI.</p>
          </div>
          <div className="glass-panel px-6 py-4 rounded-xl flex items-center gap-6 min-w-[280px]">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Overall Progress</span>
                <span className="font-label-sm text-label-sm text-primary">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 text-right">{completedCount} of {actionSteps.length} actions completed</p>
            </div>
          </div>
        </div>
      </header>

      {/* Action Sequence Timeline */}
      <div className="max-w-4xl">
        <div className="relative border-l border-white/10 ml-6 md:ml-8 pl-8 md:pl-12 space-y-16 pb-12">
          {actionSteps.map((step) => {
            if (step.status === 'completed') {
              return (
                <div key={step.num} className="relative group">
                  <div className="absolute -left-[45px] md:-left-[61px] top-0 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border-2 border-primary/30 text-primary group-hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Step {step.num}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-label-sm bg-primary/10 text-primary border border-primary/20">Completed</span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg text-on-surface/50 mb-2">{step.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant/50 max-w-2xl">{step.desc}</p>
                </div>
              );
            }
            if (step.status === 'active') {
              return (
                <div key={step.num} className="relative">
                  <div className="absolute -left-[45px] md:-left-[61px] top-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center border-4 border-background shadow-[0_0_20px_rgba(255,180,161,0.3)]">
                    <span className="material-symbols-outlined text-on-primary-fixed text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                  </div>
                  <div className="glass-card rounded-2xl p-6 md:p-8 -mt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">Step {step.num}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-label-sm bg-surface-container-high text-on-surface-variant border border-white/10 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        In Progress
                      </span>
                    </div>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface mb-3">{step.title}</h3>
                    <div className="mb-8">
                      <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-2">Why this matters:</h4>
                      <p className="font-body-md text-body-md text-on-surface max-w-2xl">{step.desc}</p>
                    </div>
                    <div className="bg-surface-container/50 rounded-xl p-5 border border-white/5 mb-8">
                      <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-4">Required Details for Generation:</h4>
                      <ul className="space-y-3">
                        {step.details.map((d, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className={`material-symbols-outlined text-sm mt-0.5 ${d.done ? 'text-primary' : 'text-surface-variant'}`} style={d.done ? { fontVariationSettings: "'FILL' 1" } : {}}>
                              {d.done ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span className={`font-body-md text-body-md ${d.done ? 'text-on-surface/80' : 'text-on-surface'}`}>{d.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button className="bg-primary text-on-primary-fixed font-label-sm text-label-sm py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-bold flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(255,180,161,0.2)]">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Generate Demand Letter
                      </button>
                      <button className="bg-transparent border border-white/10 text-on-surface font-label-sm text-label-sm py-3 px-6 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">upload</span>
                        Upload Existing
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            // Locked
            return (
              <div key={step.num} className="relative group opacity-50">
                <div className="absolute -left-[45px] md:-left-[61px] top-0 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-white/10 text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Step {step.num}</span>
                </div>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">{step.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
