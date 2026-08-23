import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ActionPlanPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planState, setPlanState] = useState({});

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
          if (data.action_plan_state) {
            setPlanState(data.action_plan_state);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCaseDetails();
  }, [caseId, authFetch]);

  // Toggle step state and patch to backend
  const toggleStep = async (stepIdx) => {
    const newState = { ...planState, [stepIdx]: !planState[stepIdx] };
    setPlanState(newState);
    
    try {
      await authFetch(`/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_plan_state: newState })
      });
    } catch (err) {
      console.error('Failed to save action plan state', err);
    }
  };

  // Dynamically generate action steps from the Python API's next_steps array inside messages
  const analysisMessage = (caseData?.messages || []).slice().reverse().find(m => m.content?.response_type === 'analysis' || m.content?.analysis);
  const analysis = analysisMessage?.content?.analysis || analysisMessage?.content || {};
  const rawSteps = analysis.next_steps || [];

  const actionSteps = rawSteps.map((stepText, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    title: idx === 0 ? 'Initial Action' : `Follow-up Step ${idx}`,
    desc: stepText,
    isCompleted: !!planState[idx],
    idx: idx
  }));

  const completedCount = actionSteps.filter(s => s.isCompleted).length;
  const progress = actionSteps.length > 0 ? Math.round((completedCount / actionSteps.length) * 100) : 0;

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
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 mb-4">Here is the exact strategy recommended by the AI.</p>
            <button 
              onClick={() => navigate(`/dashboard/case/${caseId}`)}
              className="bg-primary/10 text-primary border border-primary/20 px-5 py-2.5 rounded-lg font-label-sm text-label-sm hover:bg-primary/20 transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">smart_toy</span>
              Discuss Plan with Legal AI
            </button>
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
        {actionSteps.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center mt-8">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-4">hourglass_empty</span>
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-2">No Action Plan Yet</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              The AI has not generated an action plan for this case. Discuss your issue with the Legal AI to get a strategy.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-white/10 ml-6 md:ml-8 pl-8 md:pl-12 space-y-16 pb-12 mt-8">
            {actionSteps.map((step) => {
              const isCompleted = step.isCompleted;
              return (
                <div key={step.num} className="relative group transition-opacity duration-300">
                  <button 
                    onClick={() => toggleStep(step.idx)}
                    className={`absolute -left-[45px] md:-left-[61px] top-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                      isCompleted 
                        ? 'bg-surface-container border-2 border-primary/50 text-primary hover:bg-primary/10' 
                        : 'bg-surface-container-high border-2 border-white/10 text-on-surface-variant hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg" style={isCompleted ? { fontVariationSettings: "'FILL' 1" } : {}}>
                      {isCompleted ? 'check' : 'radio_button_unchecked'}
                    </span>
                  </button>
                  <div className={`glass-card rounded-2xl p-6 md:p-8 -mt-6 transition-colors duration-300 ${isCompleted ? 'bg-surface-container-low/20' : 'bg-surface-container-low/60'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className={`font-label-sm text-label-sm uppercase tracking-widest ${isCompleted ? 'text-on-surface-variant' : 'text-primary'}`}>Step {step.num}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-label-sm border flex items-center gap-1 ${
                          isCompleted 
                            ? 'bg-primary/10 text-primary border-primary/20' 
                            : 'bg-surface-container-high text-on-surface-variant border-white/10'
                        }`}>
                          {!isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>}
                          {isCompleted ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <h3 className={`font-headline-lg text-headline-lg mb-3 ${isCompleted ? 'text-on-surface/40 line-through' : 'text-on-surface'}`}>{step.title}</h3>
                    <div className="mb-4">
                      <p className={`font-body-md text-body-md max-w-2xl ${isCompleted ? 'text-on-surface-variant/50' : 'text-on-surface'}`}>{step.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
