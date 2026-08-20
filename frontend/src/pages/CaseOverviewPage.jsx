import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CaseOverviewPage() {
  const navigate = useNavigate();
  const [expandedSource, setExpandedSource] = useState(false);

  return (
    <div className="px-margin-mobile md:px-margin-desktop pb-32 pt-4 md:pt-8">
      {/* Background Effects */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-low"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 blur-[150px] rounded-full mix-blend-screen translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-secondary/5 blur-[120px] rounded-full mix-blend-screen -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <div className="max-w-container-max mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm border border-tertiary/20">
                  <span className="w-2 h-2 rounded-full bg-tertiary mr-2"></span>
                  Analysis Complete
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Case ID: #CP-8492</span>
              </div>
              <h1 className="font-display-md text-display-md text-on-surface mb-2">Security Deposit Dispute</h1>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors duration-300 font-label-sm text-label-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                Export
              </button>
              <button
                onClick={() => navigate('/dashboard/case/demo/plan')}
                className="px-6 py-3 rounded-lg bg-primary text-on-primary-fixed font-bold font-label-sm text-label-sm uppercase tracking-wide hover:bg-primary-fixed transition-colors duration-300 flex items-center gap-2 shadow-[0_8px_16px_rgba(255,180,161,0.2)]"
              >
                View Action Plan
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </button>
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          {/* Left Column */}
          <div className="md:col-span-8 flex flex-col gap-gutter">
            {/* Your Situation */}
            <section className="glass-card rounded-xl p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Your Situation</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Based on your input, you vacated the rental property on March 1st with no damage reported during the final walkthrough. The landlord has withheld the ₹50,000 security deposit beyond the legally mandated 30-day window without providing an itemized list of deductions.
                  </p>
                </div>
              </div>
            </section>

            {/* What May Apply */}
            <section className="glass-card rounded-xl p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">gavel</span>
                </div>
                <div className="w-full">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">What May Apply</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-surface/50 border border-white/5 rounded-lg p-5 hover:border-primary/30 transition-colors duration-300 group cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-body-lg text-body-lg text-on-surface group-hover:text-primary transition-colors">Rent Control Act Violation</h3>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">chevron_right</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant">Failure to return the deposit within the stipulated timeframe without valid reason constitutes a breach of standard tenancy agreements under state-specific Rent Control Acts.</p>
                    </div>
                    <div className="bg-surface/50 border border-white/5 rounded-lg p-5 hover:border-primary/30 transition-colors duration-300 group cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-body-lg text-body-lg text-on-surface group-hover:text-primary transition-colors">Deficiency in Service</h3>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">chevron_right</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant">If managed by a registered agency, this may be considered a deficiency in service under consumer protection laws.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="md:col-span-4 flex flex-col gap-gutter">
            {/* AI Interpretation */}
            <section className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-container-high opacity-50 z-0"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full mix-blend-screen z-0 group-hover:bg-primary/20 transition-all duration-500"></div>
              <div className="relative z-10">
                <h2 className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-4">AI Interpretation</h2>
                <h3 className="font-headline-lg text-headline-lg text-on-surface mb-4">You have a strong basis for recovery.</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  The lack of documented damage and the passage of time without communication heavily favors your position. Formalizing the demand is the critical next step.
                </p>
                <div className="bg-surface/40 rounded-lg p-4 border border-white/5">
                  <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">Recommended Action</span>
                  <span className="font-body-lg text-body-lg text-on-surface font-semibold">Send a Legal Notice</span>
                </div>
              </div>
            </section>

            {/* Sources */}
            <section className="glass-card rounded-xl p-6">
              <h2 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-4">Referenced Sources</h2>
              <div className="border border-white/5 rounded-lg bg-surface/30">
                <button
                  onClick={() => setExpandedSource(!expandedSource)}
                  className="flex items-center justify-between p-4 cursor-pointer w-full"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '20px' }}>menu_book</span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">Consumer Protection Act 2019</span>
                  </div>
                  <span className={`material-symbols-outlined transition duration-300 text-on-surface-variant ${expandedSource ? '-rotate-180' : ''}`}>expand_more</span>
                </button>
                {expandedSource && (
                  <div className="p-4 pt-0 border-t border-white/5 mt-2 text-on-surface-variant font-body-md text-body-md">
                    <p className="mb-2">Relevance: Addresses 'Deficiency in Service' if the property was leased through a commercial entity or broker.</p>
                    <a className="text-primary hover:underline text-sm flex items-center gap-1" href="#">
                      Read full text
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                    </a>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
