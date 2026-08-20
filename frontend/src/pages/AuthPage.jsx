import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.glass-auth');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center relative overflow-hidden font-body-md selection:bg-primary/30 selection:text-primary">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-surface-container-lowest opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/40 to-surface"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary/6 rounded-full blur-[120px]"></div>
      </div>

      <main className="relative z-10 w-full max-w-md px-margin-mobile md:px-0 mx-auto">
        <div className="glass-auth glass-panel rounded-xl p-8 md:p-10 w-full flex flex-col gap-8 relative overflow-hidden">
          {/* Glow effect overlay */}
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
            background: 'radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 180, 161, 0.08), transparent 40%)'
          }}></div>

          <header className="flex flex-col gap-3 text-center sm:text-left relative z-10">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
              <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">ADHIKAAR</span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface">
              {isLogin ? "Welcome back." : "Let's get you started."}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isLogin ? "Sign in to access your cases and action plans." : "Save your cases, documents, and action plans so you can return anytime."}
            </p>
          </header>

          <form className="flex flex-col gap-6 relative z-10" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error-container/20 border border-error/30 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-error text-sm">error</span>
                <span className="font-body-md text-body-md text-error text-sm">{error}</span>
              </div>
            )}

            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="name-input">Full Name</label>
                <div className="relative border-b border-white/20 focus-within:border-primary transition-colors duration-300">
                  <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant/50 ml-3">person</span>
                  <input
                    className="w-full bg-surface-container-low/50 text-on-surface font-body-md text-body-md py-3 pl-11 pr-4 rounded-t border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/40"
                    id="name-input"
                    placeholder="Enter your full name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="email-input">Email Address</label>
              <div className="relative border-b border-white/20 focus-within:border-primary transition-colors duration-300">
                <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant/50 ml-3">contact_mail</span>
                <input
                  className="w-full bg-surface-container-low/50 text-on-surface font-body-md text-body-md py-3 pl-11 pr-4 rounded-t border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/40"
                  id="email-input"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="password-input">Password</label>
              <div className="relative border-b border-white/20 focus-within:border-primary transition-colors duration-300">
                <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-on-surface-variant/50 ml-3">lock</span>
                <input
                  className="w-full bg-surface-container-low/50 text-on-surface font-body-md text-body-md py-3 pl-11 pr-4 rounded-t border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/40"
                  id="password-input"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              className="w-full bg-primary hover:bg-primary-fixed-dim text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider py-4 rounded transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-on-primary-fixed border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 my-2 opacity-50">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Or</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-on-surface font-label-sm text-label-sm py-3 rounded transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined text-[18px]">{isLogin ? 'person_add' : 'login'}</span>
              <span>{isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}</span>
            </button>
          </form>

          <footer className="flex flex-col gap-4 text-center mt-2 relative z-10">
            <p className="font-label-sm text-label-sm text-on-surface-variant/70 leading-relaxed max-w-[90%] mx-auto">
              By proceeding, you agree to our <Link className="text-primary hover:underline underline-offset-2" to="/terms">Terms of Service</Link> and acknowledge our <Link className="text-primary hover:underline underline-offset-2" to="/privacy">Privacy Policy</Link>.
            </p>
            <div className="inline-flex items-center justify-center gap-2 bg-surface-container-low/50 border border-white/5 rounded-full px-4 py-2 mx-auto">
              <span className="material-symbols-outlined text-on-surface-variant text-[14px]">shield</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Secure &amp; Encrypted Connection</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
