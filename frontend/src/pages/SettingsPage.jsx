import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in pb-32 md:pb-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-on-surface mb-2">{t('sidebar.settings') || 'Settings'}</h1>
        <p className="font-body text-on-surface-variant">Manage your account preferences and application settings.</p>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">person</span> Account Profile
          </h2>
          <div className="flex items-center gap-4 bg-surface-container/30 p-4 rounded-xl border border-white/5">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-lg font-bold text-on-surface">{user?.name || 'User'}</p>
              <p className="text-on-surface-variant text-sm">{user?.email || 'No email provided'}</p>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">tune</span> Preferences
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-surface-container/30 rounded-xl border border-white/5">
            <div>
              <h3 className="font-bold text-on-surface text-lg">Language / भाषा</h3>
              <p className="text-sm text-on-surface-variant">Switch between English and Hindi</p>
            </div>
            <button 
              onClick={toggleLanguage}
              className="px-6 py-3 bg-primary text-on-primary-fixed rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined">translate</span>
              {i18n.language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
            </button>
          </div>
        </div>

        {/* Legal & Actions */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary">gavel</span> Legal & Actions
          </h2>
          
          <div className="flex flex-col gap-4">
            <Link 
              to="/terms"
              className="flex items-center justify-between p-4 bg-surface-container/30 rounded-xl border border-white/5 hover:bg-surface-container transition-colors group"
            >
              <div className="flex items-center gap-3 text-on-surface">
                <span className="material-symbols-outlined text-on-surface-variant">description</span>
                <span className="font-medium">Terms and Conditions</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
            </Link>

            <button 
              onClick={logout}
              className="flex items-center justify-between p-4 bg-error/10 rounded-xl border border-error/20 hover:bg-error/20 transition-colors text-error group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">logout</span>
                <span className="font-medium text-lg">Sign Out</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
