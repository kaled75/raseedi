import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  Users, 
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { Debt, Contact, Payment } from '../types';
import { api } from '../utils/api';
import { useSettings } from '../context/SettingsContext';

interface ReportsViewProps {
  refreshTrigger?: number;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ refreshTrigger }) => {
  const { formatMoney } = useSettings();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    Promise.all([
      api.getDebts({ include_archived: true }),
      api.getContacts({ include_archived: true }),
      api.getPayments()
    ]).then(([d, c, p]) => {
      setDebts(d);
      setContacts(c);
      setPayments(p);
    });
  }, [refreshTrigger]);

  // Top 5 contacts with highest lending balances (مستحق لي عندهم)
  const topDebtors = [...contacts]
    .filter(c => (c.total_for_me || 0) > 0)
    .sort((a, b) => (b.total_for_me || 0) - (a.total_for_me || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      amount: c.total_for_me || 0
    }));

  // Top 5 contacts with highest borrowing balances (مستحق لهم عليّ)
  const topCreditors = [...contacts]
    .filter(c => (c.total_on_me || 0) > 0)
    .sort((a, b) => (b.total_on_me || 0) - (a.total_on_me || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      amount: c.total_on_me || 0
    }));

  // Totals
  const totalLent = debts.filter(d => d.type === 'for_me' && d.status !== 'cancelled').reduce((sum, d) => sum + d.original_amount, 0);
  const totalBorrowed = debts.filter(d => d.type === 'on_me' && d.status !== 'cancelled').reduce((sum, d) => sum + d.original_amount, 0);
  const totalLentRemaining = debts.filter(d => d.type === 'for_me' && d.status !== 'cancelled').reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  const totalBorrowedRemaining = debts.filter(d => d.type === 'on_me' && d.status !== 'cancelled').reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

  const lendingRepaymentRate = totalLent > 0 ? Math.round(((totalLent - totalLentRemaining) / totalLent) * 100) : 0;
  const borrowingRepaymentRate = totalBorrowed > 0 ? Math.round(((totalBorrowed - totalBorrowedRemaining) / totalBorrowed) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sky-600" />
          <span>مركز التقارير والتحليلات المالية</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          مؤشرات إحصائية مدققة لحجم المعاملات المالية، وسرعة التحصيل، وتوزيع الأرصدة حسب الأشخاص
        </p>
      </div>

      {/* KPI Performance Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lending Performance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              <span>معدل تحصيل الأموال المقرضة (لي)</span>
            </span>
            <span className="font-mono font-bold text-emerald-600 text-sm">{lendingRepaymentRate}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${lendingRepaymentRate}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>تم تحصيل: {formatMoney(totalLent - totalLentRemaining)}</span>
            <span>المتبقي: {formatMoney(totalLentRemaining)}</span>
          </div>
        </div>

        {/* Borrowing Performance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
              <span>معدل وفائك بالديون المقترضة (عليّ)</span>
            </span>
            <span className="font-mono font-bold text-rose-600 text-sm">{borrowingRepaymentRate}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
            <div 
              className="h-full bg-rose-500 rounded-full transition-all duration-500" 
              style={{ width: `${borrowingRepaymentRate}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>تم سداد: {formatMoney(totalBorrowed - totalBorrowedRemaining)}</span>
            <span>المتبقي: {formatMoney(totalBorrowedRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Top Debtors & Creditors Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Debtors (أكثر من أطلبهم أموالاً) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
            أعلى جهات لديها ديون مستحقة لك
          </h3>
          <p className="text-xs text-slate-400 mb-4">الأشخاص الأكثر مديونية لك بناءً على الرصيد القائم</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDebtors} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  formatter={(val: any) => [formatMoney(Number(val)), 'المبلغ']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Creditors (أكثر من يطلبون مني أموالاً) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
            أعلى جهات تطالبك بديون قائمة
          </h3>
          <p className="text-xs text-slate-400 mb-4">الأشخاص الذين لهم أعلى مبالغ في ذمتك حالياً</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCreditors} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  formatter={(val: any) => [formatMoney(Number(val)), 'المبلغ']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="amount" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
