import React, { useEffect, useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  AlertCircle, 
  Clock, 
  Receipt, 
  Calendar as CalendarIcon,
  TrendingUp,
  Activity,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { DashboardStats, MonthlyTrend, Debt } from '../types';
import { api } from '../utils/api';
import { useSettings } from '../context/SettingsContext';

interface DashboardViewProps {
  refreshTrigger?: number;
  onOpenNewDebt: () => void;
  onOpenNewPayment: (debtId?: string) => void;
  onNavigateToDebts: (type?: 'for_me' | 'on_me') => void;
  onNavigateToCalendar: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  refreshTrigger,
  onOpenNewDebt,
  onOpenNewPayment,
  onNavigateToDebts,
  onNavigateToCalendar
}) => {
  const { formatMoney } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [upcomingDebts, setUpcomingDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [s, t, b, allDebts] = await Promise.all([
        api.getDashboardStats(),
        api.getMonthlyTrends(6),
        api.getStatusBreakdown(),
        api.getDebts({ include_archived: false })
      ]);
      setStats(s);
      setMonthlyTrends(t);
      setStatusBreakdown(b);

      const today = new Date().toISOString().slice(0, 10);
      const upcoming = allDebts
        .filter(d => (d.remaining_amount || 0) > 0 && d.status !== 'cancelled')
        .sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        })
        .slice(0, 5);
      setUpcomingDebts(upcoming);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-800 text-white shadow-xl shadow-sky-600/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black mb-1">لوحة التحكم المالية الشخصية</h2>
          <p className="text-sky-100 text-xs md:text-sm max-w-xl">
            نظرة شاملة ومحدثة على حركة أموالك، الديون المستحقة لك، والالتزامات المالية الواجبة عليك.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewDebt}
            className="px-4 py-2.5 rounded-xl bg-white text-sky-800 font-bold text-xs hover:bg-sky-50 shadow-sm transition-all"
          >
            + تسجيل دين جديد
          </button>
          <button
            onClick={() => onOpenNewPayment()}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 shadow-sm transition-all"
          >
            + تسجيل دفعة سداد
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="صافي المستحق لي (المتبقي)"
          value={formatMoney(stats?.net_for_me || 0)}
          subtitle={`إجمالي ما أقرضته: ${formatMoney(stats?.total_for_me || 0)}`}
          icon={<ArrowDownLeft className="w-5 h-5" />}
          variant="emerald"
          onClick={() => onNavigateToDebts('for_me')}
        />

        <StatCard
          title="صافي المستحق عليّ (المتبقي)"
          value={formatMoney(stats?.net_on_me || 0)}
          subtitle={`إجمالي ما اقترضته: ${formatMoney(stats?.total_on_me || 0)}`}
          icon={<ArrowUpRight className="w-5 h-5" />}
          variant="rose"
          onClick={() => onNavigateToDebts('on_me')}
        />

        <StatCard
          title="الديون المتأخرة عن موعدها"
          value={String(stats?.overdue_debts_count || 0)}
          subtitle={stats?.next_due_debt ? `أقرب استحقاق: ${stats.next_due_debt.due_date || '-'}` : 'لا توجد مواعيد متأخرة'}
          icon={<AlertCircle className="w-5 h-5" />}
          variant={stats?.overdue_debts_count ? 'amber' : 'blue'}
          onClick={onNavigateToCalendar}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                <span>حركة الإقراض والاقتراض والتحصيل (آخر 6 أشهر)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">مقارنة شهرية بين الأموال المقرضة والمقترضة والدفعات</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> أقرضته (لي)
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> اقترضته (عليّ)
              </span>
            </div>
          </div>

          {monthlyTrends.length === 0 || !monthlyTrends.some(t => (t.for_me || 0) > 0 || (t.on_me || 0) > 0 || (t.payments || 0) > 0) ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <p className="text-xs">لا توجد حركات ديون أو سداد مسجلة لعرض الرسم البياني</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorForMe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOnMe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: any) => [formatMoney(Number(val)), '']}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', direction: 'rtl', textAlign: 'right' }}
                  />
                  <Area type="monotone" dataKey="for_me" name="مستحق لي" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorForMe)" />
                  <Area type="monotone" dataKey="on_me" name="مستحق عليّ" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOnMe)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Debt Status Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">توزيع حالات الديون</h3>
            <p className="text-xs text-slate-400 mb-4">نسبة الديون المفتوحة والمتأخرة والمسددة</p>
          </div>

          {statusBreakdown.reduce((sum, item) => sum + (item.value || 0), 0) === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-auto">
              <AlertCircle className="w-7 h-7 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <p className="text-xs">لا توجد ديون مسجلة حالياً</p>
            </div>
          ) : (
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', direction: 'rtl', textAlign: 'right' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
            {statusBreakdown.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-400 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Debts & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Due Debts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>مواعيد الاستحقاق القادمة والمتأخرة</span>
            </h3>
            <button
              onClick={onNavigateToCalendar}
              className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>عرض التقويم</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingDebts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد ديون مستحقة قريباً</p>
            ) : upcomingDebts.map(debt => (
              <div 
                key={debt.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{debt.contact_name}</span>
                    <Badge type={debt.type} />
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{debt.description}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                    <CalendarIcon className="w-3 h-3" />
                    <span>الاستحقاق: {debt.due_date || 'غير محدد'}</span>
                    {debt.is_overdue && (
                      <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded text-[10px]">
                        متأخر!
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100 font-mono">
                    {formatMoney(debt.remaining_amount)}
                  </span>
                  <button
                    onClick={() => onOpenNewPayment(debt.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                  >
                    تسجيل سداد
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>آخر الحركات والعمليات المالية</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">سجل التدقيق</span>
          </div>

          <div className="space-y-3">
            {(!stats?.recent_activities || stats.recent_activities.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد عمليات مسجلة حديثاً</p>
            ) : stats.recent_activities.map((act, idx) => {
              const actionLabel = {
                CREATE_DEBT: 'تسجيل دين جديد',
                RECORD_PAYMENT: 'تسجيل دفعة سداد',
                PAYMENT_RECEIVED: 'استلام دفعة مالية',
                PAYMENT_MADE: 'سداد دفعة مالية',
                CANCEL_PAYMENT: 'إلغاء دفعة مالية',
                UPDATE_DEBT: 'تعديل بيانات دين',
                CREATE_CONTACT: 'إضافة شخص جديد',
                AUTH_LOGIN: 'تسجيل دخول للنظام',
                BACKUP_CREATE: 'إنشاء نسخة احتياطية'
              }[act.action] || act.action;

              return (
                <div key={act.id || idx} className="flex items-start gap-3 text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-none">
                  <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{actionLabel}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                      {new Date(act.timestamp).toLocaleString('ar-LY')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
