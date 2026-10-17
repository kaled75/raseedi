import React from 'react';
import { Database, ShieldCheck, AlertCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface StatusBarProps {
  openDebtsCount?: number;
  overdueDebtsCount?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  openDebtsCount = 0,
  overdueDebtsCount = 0
}) => {
  const { currency } = useSettings();

  return (
    <footer className="h-7 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 select-none z-10">
      <div className="flex items-center gap-4">
        {/* Database Status */}
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <Database className="w-3.5 h-3.5" />
          <span>قاعدة البيانات متصلة ومؤمنة محلياً (SQLite)</span>
        </div>

        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Currency Indicator */}
        <div className="flex items-center gap-1">
          <span>العملة الافتراضية:</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">{currency}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Overdue alert badge if any */}
        {overdueDebtsCount > 0 ? (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{overdueDebtsCount} ديون متأخرة عن موعد السداد</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-400">
            <span>الديون النشطة:</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{openDebtsCount}</span>
          </div>
        )}

        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>رَصيدي v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};
