import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function StaticPage({ title, sections }) {
  const navigate = useNavigate();

  // Scroll to top when loaded
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative z-0">
      {/* Background gradients */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute inset-0 bg-background"></div>
        <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-primary/5 blur-[120px] rounded-full mix-blend-screen translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-secondary/5 blur-[100px] rounded-full mix-blend-screen -translate-x-1/4 translate-y-1/4"></div>
      </div>

      {/* Header */}
      <header className="px-margin-mobile md:px-margin-desktop py-6 flex items-center justify-between relative z-10 border-b border-white/5 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <span className="material-symbols-outlined text-primary text-3xl">gavel</span>
          <span className="font-display-md text-title-md text-on-surface font-bold tracking-wide">Adhikaar</span>
        </div>
        <button onClick={() => navigate(-1)} className="text-on-surface-variant hover:text-primary transition-colors font-label-sm text-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-margin-mobile md:px-margin-desktop max-w-4xl w-full mx-auto py-12 md:py-20 relative z-10">
        <h1 className="font-display-md text-display-lg md:text-5xl text-on-surface font-bold mb-12 text-center">{title}</h1>
        
        <div className="glass-panel rounded-3xl p-8 md:p-12 space-y-12">
          {sections.map((section, idx) => (
            <section key={idx}>
              {section.heading && (
                <h2 className="font-headline-lg text-headline-lg text-primary mb-4">{section.heading}</h2>
              )}
              {section.paragraphs.map((para, pIdx) => (
                <p key={pIdx} className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed mb-4">
                  {para}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc pl-6 space-y-2 font-body-lg text-body-lg text-on-surface-variant leading-relaxed mb-4">
                  {section.list.map((item, lIdx) => (
                    <li key={lIdx}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="py-8 text-center text-on-surface-variant font-label-sm text-sm border-t border-white/5 relative z-10">
        <p>&copy; {new Date().getFullYear()} Adhikaar. All rights reserved.</p>
      </footer>
    </div>
  );
}
