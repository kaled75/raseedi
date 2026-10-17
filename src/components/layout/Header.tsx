import React from 'react';
import { 
  Search, 
  Plus, 
  Receipt, 
  UserPlus, 
  Lock, 
  Sun, 
  Moon, 
  Eye, 
  EyeOff,
  Minus,
  Square,
  X
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

interface HeaderProps {
  onOpenNewDebt: () => void;
  onOpenNewPayment: () => void;
  onOpenNewContact: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewDebt,
  onOpenNewPayment,
  onOpenNewContact,
  searchQuery,
  onSearchChange
}) => {
  const { theme, toggleTheme, hideBalances, toggleHideBalances } = useSettings();
  const { lockApp, isConfigured } = useAuth();

  const isElectron = typeof window !== 'undefined' && !!window.api;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between gap-4 sticky top-0 z-20 no-print">
      {/* Global Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="بحث سريع في الديون، الأشخاص، المرجع..."
          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl py-2 pr-10 pl-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
        />
      </div>

      {/* Action Buttons & Utilities */}
      <div className="flex items-center gap-2.5">
        {/* Quick Action: New Debt */}
        <button
          onClick={onOpenNewDebt}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs md:text-sm transition-all shadow-sm shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة دين جديد</span>
        </button>

        {/* Quick Action: Record Payment */}
        <button
          onClick={onOpenNewPayment}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs md:text-sm transition-all shadow-sm shadow-emerald-600/20"
        >
          <Receipt className="w-4 h-4" />
          <span>تسجيل دفعة</span>
        </button>

        {/* Quick Action: New Contact */}
        <button
          onClick={onOpenNewContact}
          title="إضافة شخص جديد"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Privacy Balance Toggle */}
        <button
          onClick={toggleHideBalances}
          title={hideBalances ? 'إظهار الأرصدة' : 'إخفاء الأرصدة (وضع الخصوصية)'}
          className={`p-2 rounded-xl border transition-colors ${
            hideBalances 
              ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' 
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الداكن'}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Lock Application */}
        {isConfigured && (
          <button
            onClick={lockApp}
            title="قفل التطبيق يدوياً"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {/* Electron Window Controls */}
        {isElectron && (
          <div className="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
            <button
              onClick={() => api.minimize()}
              title="تصغير"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => api.maximize()}
              title="تكبير"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => api.close()}
              title="إغلاق"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
