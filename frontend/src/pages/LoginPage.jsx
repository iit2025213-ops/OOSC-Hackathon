import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="max-w-md w-full glass-panel rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-4">
            <span className="material-symbols-outlined text-2xl">lock</span>
          </div>
          <h2 className="font-display-lg text-display-md text-on-surface">Welcome Back</h2>
          <p className="font-body-md text-on-surface-variant mt-2">Log in to track your cases.</p>
        </div>

        {error && (
          <div className="bg-error/20 border border-error/50 text-error-container p-3 rounded-lg mb-6 text-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-sm mt-0.5">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-label-sm text-on-surface-variant mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-surface/50 border border-white/10 rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block font-label-sm text-on-surface-variant mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-surface/50 border border-white/10 rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary-fixed py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-primary-fixed transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-on-surface-variant font-body-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-bold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
