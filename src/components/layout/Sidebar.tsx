import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Receipt, 
  Calendar, 
  BarChart3, 
  Share2, 
  DatabaseBackup, 
  Settings, 
  Info,
  ChevronRight,
  ChevronLeft,
  Coins
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  stats?: {
    overdueCount?: number;
    openCount?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  stats
}) => {
  const menuItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { id: 'contacts', label: 'الأشخاص', icon: <Users className="w-5 h-5 shrink-0" /> },
    { id: 'debts_for_me', label: 'الديون المستحقة لي', icon: <ArrowDownLeft className="w-5 h-5 shrink-0 text-emerald-500" /> },
    { id: 'debts_on_me', label: 'الديون المستحقة عليّ', icon: <ArrowUpRight className="w-5 h-5 shrink-0 text-rose-500" /> },
    { 
      id: 'all_debts', 
      label: 'جميع الديون', 
      icon: <FileText className="w-5 h-5 shrink-0" />,
      badge: stats?.overdueCount && stats.overdueCount > 0 ? stats.overdueCount : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    { id: 'payments', label: 'المدفوعات', icon: <Receipt className="w-5 h-5 shrink-0" /> },
    { id: 'calendar', label: 'التقويم والاستحقاقات', icon: <Calendar className="w-5 h-5 shrink-0" /> },
    { id: 'reports', label: 'التقارير والتحليلات', icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
    { id: 'export', label: 'التصدير والطباعة', icon: <Share2 className="w-5 h-5 shrink-0" /> },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: <DatabaseBackup className="w-5 h-5 shrink-0" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5 shrink-0" /> },
    { id: 'about', label: 'حول التطبيق', icon: <Info className="w-5 h-5 shrink-0" /> },
  ];

  return (
    <aside
      className={`h-screen bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 z-30 select-none no-print ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">رَصيدي</h1>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">إدارة الديون الشخصية</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {menuItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-right ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!isCollapsed && item.badge !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            رَصيدي الإصدار 1.0.0
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
            محلي وآمن بنسبة 100%
          </p>
        </div>
      )}
    </aside>
  );
};
