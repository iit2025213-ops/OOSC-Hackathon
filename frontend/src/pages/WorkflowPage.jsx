import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function WorkflowPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface">
      <nav className="fixed w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">gavel</span>
          </div>
          <span className="font-display font-bold text-xl tracking-wide">ADHIKAAR</span>
        </div>
        <button onClick={() => navigate('/auth')} className="shimmer-btn bg-brand-accent text-white font-body-md px-6 py-2 rounded-full hover:bg-[#c96b52] transition-colors">
          Get Started
        </button>
      </nav>
      
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-32 pb-24 w-full">
        <h1 className="font-display-lg text-4xl md:text-5xl font-bold mb-6 text-brand-accent">How ADHIKAAR Works</h1>
        <p className="font-body-lg text-xl text-on-surface-variant mb-12">
          A simple, transparent process to turn your civic problems into practical solutions.
        </p>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-brand-accent text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
              <span className="material-symbols-outlined text-sm font-bold">description</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-6 rounded-xl border border-white/10 hover:border-brand-accent/50 transition-colors">
              <h3 className="font-display font-semibold text-xl mb-2 text-on-surface">1. Describe Your Problem</h3>
              <p className="text-on-surface-variant text-sm mt-2">
                Write down your issue in plain English. Whether it's a property dispute, a missing document, or finding a government scheme, simply explain your situation naturally.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-brand-accent text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
              <span className="material-symbols-outlined text-sm font-bold">memory</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-6 rounded-xl border border-white/10 hover:border-brand-accent/50 transition-colors">
              <h3 className="font-display font-semibold text-xl mb-2 text-on-surface">2. AI Analysis</h3>
              <p className="text-on-surface-variant text-sm mt-2">
                Our advanced legal AI analyzes your query against current laws, government schemes, and civic procedures. It breaks down complex legal jargon into understandable advice.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-brand-accent text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
              <span className="material-symbols-outlined text-sm font-bold">list_alt</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-6 rounded-xl border border-white/10 hover:border-brand-accent/50 transition-colors">
              <h3 className="font-display font-semibold text-xl mb-2 text-on-surface">3. Get Your Action Plan</h3>
              <p className="text-on-surface-variant text-sm mt-2">
                Receive a step-by-step action plan tailored exactly to your situation. This includes which offices to visit, what forms to fill out, and a checklist of required documents.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-brand-accent text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
              <span className="material-symbols-outlined text-sm font-bold">edit_document</span>
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-6 rounded-xl border border-white/10 hover:border-brand-accent/50 transition-colors">
              <h3 className="font-display font-semibold text-xl mb-2 text-on-surface">4. Generate Documents</h3>
              <p className="text-on-surface-variant text-sm mt-2">
                Need an application letter or a legal draft? The system can automatically generate formally formatted documents based on your case details, ready for you to download and submit.
              </p>
            </div>
          </div>

        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-semibold mb-6">Ready to solve your civic issues?</h2>
          <button onClick={() => navigate('/auth')} className="shimmer-btn bg-brand-accent text-white font-body-md text-lg px-10 py-4 rounded-full hover:bg-[#c96b52] hover:shadow-[0_0_20px_rgba(224,122,95,0.4)] transition-all">
            Start Now for Free
          </button>
        </div>
      </main>
    </div>
  );
}
