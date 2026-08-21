import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function groupByDate(cases) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - 86400000);
  const weekStart = new Date(todayStart - 7 * 86400000);

  const groups = { today: [], yesterday: [], week: [], older: [] };
  cases.forEach(c => {
    const d = new Date(c.created_at);
    if (d >= todayStart) groups.today.push(c);
    else if (d >= yesterdayStart) groups.yesterday.push(c);
    else if (d >= weekStart) groups.week.push(c);
    else groups.older.push(c);
  });
  return groups;
}

export default function MyCasesPage() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCases();
  }, [authFetch]);

  const fetchCases = async () => {
    try {
      setLoading(true);
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

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('adhikaar_token');
      await fetch(`http://localhost:3000/api/cases/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCases(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete case', err);
    }
  };

  const handleRename = async (id) => {
    const newTitle = prompt('Enter new case title:');
    if (!newTitle) return;
    try {
      const token = localStorage.getItem('adhikaar_token');
      await fetch(`http://localhost:3000/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle })
      });
      setCases(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
      setMenuOpen(null);
    } catch (err) {
      console.error('Failed to rename case', err);
    }
  };

  const handleArchive = async (id) => {
    try {
      const token = localStorage.getItem('adhikaar_token');
      await fetch(`http://localhost:3000/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'archived' })
      });
      setCases(prev => prev.map(c => c.id === id ? { ...c, status: 'archived' } : c));
      setMenuOpen(null);
    } catch (err) {
      console.error('Failed to archive case', err);
    }
  };

  const filtered = useMemo(() => {
    let result = cases;
    if (filter !== 'all') result = result.filter(c => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => (c.title || '').toLowerCase().includes(q) || c.id.includes(q));
    }
    return result;
  }, [cases, filter, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'analyzed', label: 'Resolved' },
    { value: 'archived', label: 'Archived' },
  ];

  const renderGroup = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-3 ml-1">{title}</h3>
        <div className="space-y-2">
          {items.map(c => (
            <div
              key={c.id}
              className="relative glass-card rounded-xl p-5 flex items-center justify-between gap-4 hover:border-primary/20 transition-all duration-200 group cursor-pointer"
              onClick={() => navigate(`/dashboard/case/${c.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-body-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                    {c.title || 'Untitled Case'}
                  </h4>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[9px] border capitalize ${
                    c.status === 'active' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                    c.status === 'archived' ? 'text-on-surface-variant bg-surface-container border-white/10' :
                    'text-primary bg-primary/10 border-primary/20'
                  }`}>
                    {c.status || 'active'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-on-surface-variant">
                  <span className="font-label-sm text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {timeAgo(c.created_at)}
                  </span>
                  {c.message_count > 0 && (
                    <span className="font-label-sm text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">chat_bubble</span>
                      {c.message_count} messages
                    </span>
                  )}
                </div>
              </div>

              {/* Action Menu */}
              <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">more_vert</span>
                </button>
                {menuOpen === c.id && (
                  <div className="absolute right-0 top-10 w-40 bg-surface-container-high border border-white/10 rounded-lg shadow-xl z-50 py-1 animate-fade-in">
                    <button onClick={() => handleRename(c.id)} className="w-full px-4 py-2 text-left font-label-sm text-xs text-on-surface hover:bg-white/5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">edit</span> Rename
                    </button>
                    <button onClick={() => handleArchive(c.id)} className="w-full px-4 py-2 text-left font-label-sm text-xs text-on-surface hover:bg-white/5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">archive</span> Archive
                    </button>
                    <button onClick={() => { setDeleteConfirm(c.id); setMenuOpen(null); }} className="w-full px-4 py-2 text-left font-label-sm text-xs text-error hover:bg-error/10 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 px-margin-mobile md:px-margin-desktop max-w-container-max w-full mx-auto py-8 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="font-display-md text-display-md text-on-surface">My Cases</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Track your legal and civic issues, conversations, documents, and action plans.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-primary text-on-primary-fixed px-6 py-3 rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(255,180,161,0.2)]"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Case
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search your cases..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-container-lowest border border-white/10 rounded-lg pl-10 pr-4 py-2.5 font-body-md text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-md font-label-sm text-[11px] uppercase tracking-wider transition-colors ${
                filter === f.value
                  ? 'bg-surface-container-high text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-5 h-20 animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-error text-3xl mb-3 block">error_outline</span>
          <p className="text-error mb-4">{error}</p>
          <button onClick={fetchCases} className="px-5 py-2 rounded-lg bg-primary text-on-primary-fixed font-label-sm text-sm">Try Again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant/20 text-6xl mb-6 block">folder_off</span>
          <h3 className="font-headline-lg text-xl text-on-surface mb-2">
            {search ? 'No matching cases' : 'No cases yet'}
          </h3>
          <p className="font-body-md text-on-surface-variant mb-8 max-w-sm mx-auto">
            {search
              ? `No cases match "${search}". Try a different search term.`
              : 'Start by telling us what happened. We\'ll help you understand your options and next steps.'}
          </p>
          {!search && (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-primary text-on-primary-fixed px-8 py-3 rounded-lg font-label-sm text-sm font-semibold flex items-center gap-2 mx-auto hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(255,180,161,0.2)]"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Start Your First Case
            </button>
          )}
        </div>
      ) : (
        <div>
          {renderGroup('Today', grouped.today)}
          {renderGroup('Yesterday', grouped.yesterday)}
          {renderGroup('Previous 7 Days', grouped.week)}
          {renderGroup('Older', grouped.older)}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-surface-container-high border border-white/10 rounded-xl p-6 max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline-lg text-lg text-on-surface mb-2">Delete this case?</h3>
            <p className="font-body-md text-sm text-on-surface-variant mb-6">
              This will permanently delete the conversation, documents, and associated case data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 rounded-lg border border-white/10 text-on-surface font-label-sm text-sm hover:bg-white/5">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2.5 rounded-lg bg-error text-white font-label-sm text-sm hover:bg-error/90">Delete Case</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
