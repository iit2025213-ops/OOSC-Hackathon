import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Parallax effect for hero text
    const handleMouseMove = (e) => {
      const heroSection = document.getElementById('hero-section');
      const heroContent = document.getElementById('hero-content');
      
      if (heroSection && heroContent) {
          const rect = heroSection.getBoundingClientRect();
          if (e.clientY <= rect.bottom) {
              const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
              const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
              const elements = heroContent.querySelectorAll('h1, p');
              elements.forEach(el => {
                  el.style.transform = `translate(${xAxis}px, ${yAxis}px)`;
              });
          }
      }
    };

    const handleMouseLeave = () => {
      const heroContent = document.getElementById('hero-content');
      if (heroContent) {
          const elements = heroContent.querySelectorAll('h1, p');
          elements.forEach(el => {
              el.style.transform = `translate(0px, 0px)`;
          });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.getElementById('hero-section')?.addEventListener('mouseleave', handleMouseLeave);

    // Scroll reveal animation for cards
    const observer = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, index * 100);
                observerInstance.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });

    const revealCards = document.querySelectorAll('.reveal-card');
    revealCards.forEach(card => observer.observe(card));

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.getElementById('hero-section')?.removeEventListener('mouseleave', handleMouseLeave);
      observer.disconnect();
    };
  }, []);

  const handleGetStarted = () => {
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased overflow-x-hidden dark">
      {/* TopNavBar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-container-max rounded-xl dark:bg-black/10 backdrop-blur-xl border border-white/10 shadow-2xl z-50 flex justify-between items-center px-gutter py-4 bg-surface-container hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(224,122,95,0.2)] transition-all duration-500">
        <div className="font-display-md text-display-md font-bold text-on-surface tracking-tight text-brand-accent">
          ADHIKAAR
        </div>
        <div className="hidden md:flex gap-8 items-center">
          <a className="text-brand-accent font-semibold border-b-2 border-brand-accent pb-1 transition-all duration-500" href="#how-it-works">How It Works</a>
          <a className="text-on-surface/70 font-medium hover:text-brand-accent transition-colors duration-500" href="#categories">What We Help With</a>
          <a className="text-on-surface/70 font-medium hover:text-brand-accent transition-colors duration-500" href="#trust">Trust &amp; Safety</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/auth')} className="hidden md:block font-body-md text-body-md text-on-surface hover:text-brand-accent transition-colors duration-500">Sign In</button>
          <button onClick={handleGetStarted} className="shimmer-btn bg-brand-accent text-white font-body-md text-body-md px-6 py-2 rounded-full font-medium hover:bg-[#c96b52] hover:shadow-[0_0_20px_rgba(224,122,95,0.4)] transition-all duration-500">Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-end pb-24 md:pb-32 px-margin-mobile md:px-margin-desktop w-full overflow-hidden" id="hero-section">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-surface-container-lowest object-cover opacity-80"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background"></div>
        </div>
        <div className="relative z-10 w-full max-w-container-max mx-auto flex flex-col items-start mt-32" id="hero-content">
          <h1 className="font-display-lg text-display-lg text-on-surface max-w-4xl mb-6 animate-fade-in-up transition-transform duration-200 ease-out">
            Know your rights.<br/>
            <span className="text-brand-accent">Know your next step.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-10 animate-fade-in-up delay-100 transition-transform duration-200 ease-out">
            ADHIKAAR turns confusing civic and legal problems into simple explanations, practical action plans, and ready-to-use documents.
          </p>
          <div className="flex flex-wrap gap-4 mb-8 animate-fade-in-up delay-200">
            <button onClick={handleGetStarted} className="shimmer-btn bg-brand-accent text-white font-body-md text-body-md px-8 py-4 rounded-full font-semibold hover:scale-105 hover:shadow-[0_0_25px_rgba(224,122,95,0.5)] transition-all duration-500">
              Understand My Problem
            </button>
            <button className="glass-panel text-on-surface font-body-md text-body-md px-8 py-4 rounded-full font-medium hover:bg-white/10 hover:text-brand-accent transition-colors duration-500">
              See How It Works
            </button>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant/60 font-label-sm text-label-sm animate-fade-in-up delay-300">
            <span className="material-symbols-outlined text-brand-accent text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span>Plain-language guidance</span>
            <span className="mx-2">•</span>
            <span className="material-symbols-outlined text-brand-accent text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
            <span>Source-backed information</span>
            <span className="mx-2">•</span>
            <span className="material-symbols-outlined text-brand-accent text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <span>Built for citizens</span>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-2 text-brand-accent opacity-70 hover:opacity-100 transition-opacity duration-500 cursor-pointer">
          <span className="font-label-sm text-label-sm">Scroll</span>
          <span className="material-symbols-outlined">expand_more</span>
        </div>
      </section>

      {/* Problem Recognition */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface relative z-20" id="how-it-works">
        <div className="max-w-container-max mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-headline-lg md:font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-6 text-on-surface">
                Civic processes shouldn't feel like a maze.
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
                Whether you are dealing with a property dispute, applying for essential identity documents, or navigating consumer rights, the system often feels opaque. We provide clarity.
              </p>
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-xl flex items-start gap-4 hover:border-error/30 transition-colors duration-500">
                  <div className="w-12 h-12 rounded-full bg-error-container/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </div>
                  <div>
                    <h4 className="font-body-lg text-body-lg font-medium text-on-surface mb-2">The Problem</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Complex legalese and unclear procedures lead to delays, exploitation, and lost rights.</p>
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-xl flex items-start gap-4 border-brand-accent/30 hover:bg-brand-accent/5 transition-colors duration-500">
                  <div className="w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-brand-accent" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  </div>
                  <div>
                    <h4 className="font-body-lg text-body-lg font-medium text-on-surface mb-2">The Solution</h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">Actionable, step-by-step guidance tailored to your specific situation, generated instantly.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-[600px] w-full rounded-2xl overflow-hidden glass-panel flex items-center justify-center group">
              <div className="absolute inset-0 bg-surface-container-low/30 backdrop-blur-md"></div>
              <div className="relative z-10 w-3/4 aspect-[3/4] bg-surface-container rounded-lg shadow-2xl p-8 flex flex-col gap-4 border border-brand-accent/20 transform group-hover:scale-105 transition-transform duration-500">
                <div className="h-4 w-1/3 bg-on-surface-variant/20 rounded"></div>
                <div className="h-8 w-2/3 bg-on-surface-variant/40 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 w-full bg-on-surface-variant/20 rounded"></div>
                  <div className="h-3 w-5/6 bg-on-surface-variant/20 rounded"></div>
                  <div className="h-3 w-4/6 bg-on-surface-variant/20 rounded"></div>
                </div>
                <div className="mt-auto pt-6 border-t border-outline-variant/30 flex justify-between items-center group-hover:border-brand-accent/50 transition-colors duration-500">
                  <div className="h-10 w-1/2 bg-brand-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-brand-accent font-label-sm">Simplified Action Plan</span>
                  </div>
                  <span className="material-symbols-outlined text-brand-accent group-hover:translate-x-2 transition-transform duration-500">arrow_forward</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest" id="categories">
        <div className="max-w-container-max mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-4">What we help you navigate</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">Select a category to see how we break down the complexity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="reveal-card md:col-span-2 glass-panel p-8 rounded-2xl relative overflow-hidden group cursor-pointer hover:bg-brand-accent/5 hover:border-brand-accent/30 transition-all duration-500">
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 text-brand-accent">
                <span className="material-symbols-outlined text-[200px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
              </div>
              <div className="relative z-10 h-full flex flex-col">
                <span className="material-symbols-outlined text-brand-accent text-4xl mb-6 group-hover:scale-110 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                <h3 className="font-headline-lg text-headline-lg-mobile text-on-surface mb-2 mt-auto group-hover:text-brand-accent transition-colors duration-500">Property &amp; Land Rights</h3>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">Navigate inheritance, registration, disputes, and tenancy agreements with clear legal framing.</p>
              </div>
            </div>
            <div className="reveal-card glass-panel p-8 rounded-2xl group cursor-pointer hover:bg-brand-accent/5 hover:border-brand-accent/30 transition-all duration-500 flex flex-col">
              <span className="material-symbols-outlined text-brand-accent text-4xl mb-6 group-hover:scale-110 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
              <h3 className="font-body-lg text-body-lg font-bold text-on-surface mb-2 mt-auto group-hover:text-brand-accent transition-colors duration-500">Identity Documents</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Aadhar, PAN, Voter ID corrections and applications.</p>
            </div>
            <div className="reveal-card glass-panel p-8 rounded-2xl group cursor-pointer hover:bg-brand-accent/5 hover:border-brand-accent/30 transition-all duration-500 flex flex-col">
              <span className="material-symbols-outlined text-brand-accent text-4xl mb-6 group-hover:scale-110 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart</span>
              <h3 className="font-body-lg text-body-lg font-bold text-on-surface mb-2 mt-auto group-hover:text-brand-accent transition-colors duration-500">Consumer Rights</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Defective products, service failures, and filing consumer complaints.</p>
            </div>
            <div className="reveal-card md:col-span-2 glass-panel p-8 rounded-2xl group cursor-pointer hover:bg-brand-accent/5 hover:border-brand-accent/30 transition-all duration-500 flex flex-col">
              <span className="material-symbols-outlined text-brand-accent text-4xl mb-6 group-hover:scale-110 transition-transform duration-500" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
              <h3 className="font-body-lg text-body-lg font-bold text-on-surface mb-2 mt-auto group-hover:text-brand-accent transition-colors duration-500">Employment Disputes</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">PF withdrawal issues, unfair termination, and workplace harassment protocols.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & CTA */}
      <section className="py-32 px-margin-mobile md:px-margin-desktop bg-surface relative overflow-hidden" id="trust">
        <div className="absolute inset-0 flex items-center justify-center opacity-5 text-brand-accent">
          <span className="material-symbols-outlined text-[800px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="font-display-md text-display-md text-on-surface mb-8">Ready to reclaim your authority?</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">
            Join thousands of citizens who have found clarity and confidence through ADHIKAAR's transparent guidance.
          </p>
          <button onClick={handleGetStarted} className="shimmer-btn bg-brand-accent text-white font-body-md text-body-md px-10 py-5 rounded-full font-bold text-lg hover:scale-105 transition-all duration-500 shadow-[0_0_40px_rgba(224,122,95,0.3)] hover:shadow-[0_0_60px_rgba(224,122,95,0.6)]">
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-16 bg-surface-container-lowest dark:bg-surface-container-lowest border-t border-outline-variant/20">
        <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <div className="font-display-lg text-display-lg font-extrabold text-brand-accent mb-4">ADHIKAAR</div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
              Authority through Transparency. Empowering citizens with clear, actionable legal and civic guidance.
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant/50">© 2024 ADHIKAAR. Authority through Transparency.</p>
          </div>
          <div className="flex flex-col md:items-end justify-center gap-4">
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-brand-accent transition-colors duration-500" href="#">Privacy Policy</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-brand-accent transition-colors duration-500" href="#">Terms of Service</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-brand-accent transition-colors duration-500" href="#">Legal Disclaimer</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-brand-accent transition-colors duration-500" href="#">Contact Us</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-brand-accent transition-colors duration-500" href="#">Press Kit</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
