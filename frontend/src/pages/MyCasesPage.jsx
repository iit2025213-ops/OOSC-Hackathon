import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MyCasesPage() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await authFetch('/cases');
        if (!res.ok) throw new Error('Failed to fetch cases');
        const data = await res.json();
        setCases(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, [authFetch]);

  return (
    <div className="flex-1 px-margin-mobile md:px-margin-desktop max-w-container-max w-full mx-auto py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h2 className="font-display-md text-display-md text-on-surface">My Cases</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Track and manage all your legal cases in one place.</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/intake')}
          className="bg-primary text-on-primary-fixed px-6 py-3 rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(255,180,161,0.2)]"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Case
        </button>
      </div>

      {loading ? (
        <div className="text-center text-on-surface-variant py-10">Loading your cases...</div>
      ) : error ? (
        <div className="text-error text-center py-10">{error}</div>
      ) : cases.length === 0 ? (
        <div className="text-center text-on-surface-variant py-10 glass-panel rounded-xl">
          <p>You don't have any cases yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/dashboard/case/${c.id}`)}
              className="w-full glass-panel rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/30 transition-all duration-300 group text-left"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-body-lg text-body-lg font-semibold text-on-surface group-hover:text-primary transition-colors">{c.title || 'Untitled Case'}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-[10px] border text-primary bg-primary/10 border-primary/20 capitalize">
                    {c.status || 'Analyzed'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-on-surface-variant">
                  <span className="font-label-sm text-label-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
