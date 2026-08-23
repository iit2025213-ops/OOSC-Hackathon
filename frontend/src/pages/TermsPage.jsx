import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-body p-6 md:p-12 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-[-2] bg-surface"></div>
      <div className="fixed top-0 left-0 w-[60vw] h-[60vh] -translate-x-[20%] -translate-y-[20%] bg-[radial-gradient(circle,_rgba(255,180,161,0.06)_0%,_transparent_70%)] blur-[100px] pointer-events-none z-[-1]"></div>
      <div className="fixed bottom-0 right-0 w-[60vw] h-[60vh] translate-x-[20%] translate-y-[20%] bg-[radial-gradient(circle,_rgba(187,199,220,0.06)_0%,_transparent_70%)] blur-[100px] pointer-events-none z-[-1]"></div>

      <div className="max-w-3xl mx-auto glass-card rounded-3xl p-8 md:p-12 animate-fade-in shadow-2xl relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary-fixed mb-8 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span> Back to Home
        </Link>
        
        <h1 className="font-display text-4xl font-bold mb-8">Terms and Conditions</h1>
        
        <div className="space-y-6 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-on-surface mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the Adhikaar platform, you accept and agree to be bound by the terms and provision of this agreement. 
              The platform is provided for informational and assistance purposes only and does not constitute formal legal counsel.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-3">2. AI-Generated Content</h2>
            <p>
              Adhikaar utilizes advanced artificial intelligence to analyze documents, draft action plans, and assist in form filling. 
              While we strive for high accuracy, AI-generated content may contain errors or omissions. You agree to independently verify 
              all legal information, action plans, and drafted documents before submitting them to any official authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-3">3. No Attorney-Client Relationship</h2>
            <p>
              Use of the Adhikaar platform does not create an attorney-client relationship between you and Adhikaar or any of its developers. 
              The tools and information provided are meant to empower users with general knowledge and formatting assistance, not to replace 
              certified legal professionals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-3">4. Data Privacy and Security</h2>
            <p>
              We prioritize the security of your sensitive legal and personal documents. Documents uploaded to the platform are processed securely. 
              However, you acknowledge that no internet transmission is entirely secure, and you use the service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-3">5. Limitation of Liability</h2>
            <p>
              In no event shall Adhikaar be liable for any direct, indirect, incidental, consequential, or special damages arising out of or in 
              connection with your use of the platform, including but not limited to rejected applications, legal penalties, or missed deadlines.
            </p>
          </section>

          <div className="mt-12 p-6 bg-surface-container/50 rounded-xl border border-white/5 text-sm">
            <p>Last updated: August 2026</p>
            <p className="mt-2">If you have any questions about these Terms, please contact the development team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
