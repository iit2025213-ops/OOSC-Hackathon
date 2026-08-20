import React from 'react';
import { useNavigate } from 'react-router-dom';

const mockCases = [
  { id: 'demo', title: 'Security Deposit Dispute', status: 'Analysis Complete', statusColor: 'text-tertiary bg-tertiary-container/20 border-tertiary/20', date: '2024-08-19', category: 'Property & Land' },
  { id: '2', title: 'Consumer Complaint - Flipkart', status: 'In Progress', statusColor: 'text-primary bg-primary/10 border-primary/20', date: '2024-08-15', category: 'Consumer Rights' },
  { id: '3', title: 'RTI Application Draft', status: 'Draft', statusColor: 'text-secondary bg-secondary-container/20 border-secondary/20', date: '2024-08-10', category: 'Right to Information' },
];

export default function MyCasesPage() {
  const navigate = useNavigate();

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

      <div className="space-y-4">
        {mockCases.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/dashboard/case/${c.id}`)}
            className="w-full glass-panel rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/30 transition-all duration-300 group text-left"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-body-lg text-body-lg font-semibold text-on-surface group-hover:text-primary transition-colors">{c.title}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-[10px] border ${c.statusColor}`}>
                  {c.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-on-surface-variant">
                <span className="font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">folder</span>
                  {c.category}
                </span>
                <span className="font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  {c.date}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward</span>
          </button>
        ))}
      </div>
    </div>
  );
}
