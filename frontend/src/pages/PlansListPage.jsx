import React from 'react';
import { useNavigate } from 'react-router-dom';

const mockPlans = [
  { id: 'demo', title: 'Security Deposit Recovery Plan', progress: 40, steps: 5, completed: 2, status: 'In Progress' },
];

export default function PlansListPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 px-margin-mobile md:px-margin-desktop max-w-container-max w-full mx-auto py-8 md:py-12">
      <div className="mb-10">
        <h2 className="font-display-md text-display-md text-on-surface">Action Plans</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Step-by-step guides generated from your case analysis.</p>
      </div>

      <div className="space-y-4">
        {mockPlans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => navigate(`/dashboard/case/${plan.id}/plan`)}
            className="w-full glass-panel rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group text-left"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-body-lg text-body-lg font-semibold text-on-surface group-hover:text-primary transition-colors mb-2">{plan.title}</h3>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-[10px] text-primary bg-primary/10 border border-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1.5"></span>
                    {plan.status}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{plan.completed} of {plan.steps} steps</span>
                </div>
              </div>
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="flex-1">
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${plan.progress}%` }}></div>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-primary">{plan.progress}%</span>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
