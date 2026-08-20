import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: 'home', label: 'Home' },
  { to: '/dashboard/cases', icon: 'gavel', label: 'My Cases' },
  { to: '/dashboard/documents', icon: 'description', label: 'Documents' },
  { to: '/dashboard/plans', icon: 'assignment', label: 'Action Plans' },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleNewCase = () => navigate('/dashboard/intake');

  return (
    <div className="min-h-screen overflow-x-hidden font-body-md text-body-md flex bg-surface text-on-surface selection:bg-primary selection:text-on-primary">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-[-2] bg-surface"></div>
      <div className="fixed top-0 left-0 w-[60vw] h-[60vh] -translate-x-[20%] -translate-y-[20%] bg-[radial-gradient(circle,_rgba(255,180,161,0.06)_0%,_transparent_70%)] blur-[100px] pointer-events-none z-[-1]"></div>
      <div className="fixed bottom-0 right-0 w-[60vw] h-[60vh] translate-x-[20%] translate-y-[20%] bg-[radial-gradient(circle,_rgba(187,199,220,0.06)_0%,_transparent_70%)] blur-[100px] pointer-events-none z-[-1]"></div>

      {/* SideNavBar (Desktop) */}
      <nav className="hidden md:flex bg-surface-container-low/20 backdrop-blur-2xl w-64 border-r border-white/5 shadow-sm fixed left-0 top-0 h-screen flex-col pt-24 pb-8 z-40">
        <div className="px-6 mb-12">
          <h1 className="font-headline-lg text-headline-lg font-extrabold tracking-tight text-on-surface">Civic Portal</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">Legal Empowerment</p>
        </div>
        <div className="flex-1 px-4 space-y-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 font-label-sm text-label-sm group ${
                  isActive
                    ? 'bg-primary-container/20 text-primary border-r-4 border-primary rounded-l-lg'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                  <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="px-6 mt-auto">
          <button
            onClick={handleNewCase}
            className="w-full bg-primary text-on-primary-fixed py-3 rounded-lg font-label-sm text-label-sm flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(255,180,161,0.2)]"
          >
            <span className="material-symbols-outlined">add</span>
            New Case
          </button>
          <div className="mt-6 flex items-center gap-3 pt-6 border-t border-white/5">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-label-sm text-label-sm text-on-surface truncate">{user?.name || 'User'}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant truncate opacity-60">{user?.email || ''}</p>
            </div>
            <button onClick={logout} className="text-on-surface-variant hover:text-error transition-colors" title="Logout">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* TopNavBar (Mobile) */}
      <nav className="md:hidden bg-surface/10 backdrop-blur-xl border-b border-white/10 shadow-2xl fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile py-4">
        <div className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">Civic Portal</div>
        <button className="text-on-surface-variant hover:text-primary transition-colors p-2" onClick={logout}>
          <span className="material-symbols-outlined">logout</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 min-h-screen relative flex flex-col">
        {/* Header Utility Bar */}
        <header className="hidden md:flex justify-end items-center px-margin-desktop py-6 h-24 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm bg-surface-container/50 px-3 py-1.5 rounded-full border border-white/5">
              <span className="material-symbols-outlined text-sm">language</span>
              <span>EN</span>
            </div>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>
        {children}
      </main>

      {/* BottomNavBar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface-container-low/40 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 3).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-primary transition-colors'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider">{item.label.split(' ').pop()}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
