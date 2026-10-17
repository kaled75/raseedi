import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'blue',
  onClick
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
      border: 'hover:border-sky-300 dark:hover:border-sky-700',
      accent: 'text-sky-600 dark:text-sky-400'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      accent: 'text-emerald-600 dark:text-emerald-400'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
      border: 'hover:border-amber-300 dark:hover:border-amber-700',
      accent: 'text-amber-600 dark:text-amber-400'
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
      border: 'hover:border-rose-300 dark:hover:border-rose-700',
      accent: 'text-rose-600 dark:text-rose-400'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
      border: 'hover:border-indigo-300 dark:hover:border-indigo-700',
      accent: 'text-indigo-600 dark:text-indigo-400'
    }
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all duration-200 ${colorMap.border} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorMap.bg}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
          {subtitle}
        </div>
      )}
    </div>
  );
};
