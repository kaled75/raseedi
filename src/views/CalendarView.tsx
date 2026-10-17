import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check, 
  MessageSquare, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';
import { Debt } from '../types';
import { api } from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';

interface CalendarViewProps {
  refreshTrigger?: number;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ refreshTrigger }) => {
  const { formatMoney } = useSettings();
  const { success } = useToast();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    api.getDebts({ include_archived: false }).then(setDebts);
  }, [refreshTrigger]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month calculation
  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Arabic month names
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group debts with due dates in this month
  const currentMonthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
  const debtsThisMonth = debts.filter(d => d.due_date && d.due_date.startsWith(currentMonthKey) && d.status !== 'cancelled');

  // Debts overdue overall
  const overdueDebts = debts.filter(d => (d.is_overdue || d.status === 'overdue') && (d.remaining_amount || 0) > 0);

  // Debts due in the next 7 days
  const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const upcomingSoonDebts = debts.filter(d => 
    d.due_date && d.due_date >= todayStr && d.due_date <= next7DaysStr && (d.remaining_amount || 0) > 0 && d.status !== 'cancelled'
  );

  const copyReminderMessage = (debt: Debt) => {
    const isForMe = debt.type === 'for_me';
    let text = '';
    if (isForMe) {
      text = `السلام عليكم ورحمة الله، أخي العزيز ${debt.contact_name}، أرجو أن تكون بأفضل حال. تذكير ودي بشأن موعد استحقاق المبلغ المتبقي (${formatMoney(debt.remaining_amount)}) بتاريخ ${debt.due_date || 'القريب'}. بارك الله فيك وبالتوفيق دائماً.`;
    } else {
      text = `السلام عليكم أخي ${debt.contact_name}، حبيت أذكرك وأؤكد لك بأنني أتابع استحقاق المبلغ الذي في ذمتي (${formatMoney(debt.remaining_amount)}) والمحدد بتاريخ ${debt.due_date || 'القريب'}. إن شاء الله يتم السداد في الموعد. شكراً لك.`;
    }

    navigator.clipboard.writeText(text);
    setCopiedId(debt.id);
    success('تم نسخ نص الرسالة إلى الحافظة! يمكنك الآن لصقها في واتساب أو الرسائل.');
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-600" />
            <span>تقويم الاستحقاقات ومواعيد السداد</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">متابعة الديون حسب تواريخ استحقاقها وتجهيز رسائل التذكير الودية</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm min-w-[120px] text-center">
            {arabicMonths[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        {/* Days of week header (Arabic) */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2">
          <span>الأحد</span>
          <span>الإثنين</span>
          <span>الثلاثاء</span>
          <span>الأربعاء</span>
          <span>الخميس</span>
          <span>الجمعة</span>
          <span>السبت</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl" />
          ))}

          {/* Days */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const dayDebts = debtsThisMonth.filter(d => d.due_date === dateStr);

            return (
              <div
                key={`day-${dayNum}`}
                className={`h-24 p-2 rounded-xl border flex flex-col justify-between transition-colors overflow-hidden ${
                  isToday 
                    ? 'border-sky-500 bg-sky-50/30 dark:bg-sky-950/20 font-bold' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${isToday ? 'w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold' : 'text-slate-500'}`}>
                    {dayNum}
                  </span>
                  {dayDebts.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto">
                  {dayDebts.map(d => {
                    const isSettled = (d.remaining_amount || 0) <= 0;
                    return (
                      <div
                        key={d.id}
                        title={`${d.contact_name}: ${d.description} (${formatMoney(d.remaining_amount)})`}
                        className={`text-[10px] p-1 rounded font-semibold truncate ${
                          isSettled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : d.type === 'for_me'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {d.contact_name}: {formatMoney(d.remaining_amount)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reminder Templates & Approaching Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approaching in 7 days */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              ديون يقترب موعد استحقاقها (خلال الأيام الـ 7 القادمة)
            </h3>
          </div>

          <div className="space-y-3">
            {upcomingSoonDebts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد ديون مستحقة خلال الأسبوع القادم</p>
            ) : upcomingSoonDebts.map(d => (
              <div
                key={d.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{d.contact_name}</span>
                    <Badge type={d.type} />
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">موعد الاستحقاق: {d.due_date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {formatMoney(d.remaining_amount)}
                  </span>
                  <button
                    onClick={() => copyReminderMessage(d)}
                    title="نسخ نص تذكير ودي للمشاركة"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-[11px] font-semibold transition-colors"
                  >
                    {copiedId === d.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>نسخ تذكير</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Debts Alert List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4" />
            <h3 className="font-bold text-sm">
              ديون متأخرة عن موعد السداد المحدد ({overdueDebts.length})
            </h3>
          </div>

          <div className="space-y-3">
            {overdueDebts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">ممتاز! لا توجد أية ديون متأخرة عن مواعيدها.</p>
            ) : overdueDebts.map(d => (
              <div
                key={d.id}
                className="p-3 rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/10 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{d.contact_name}</span>
                    <Badge type={d.type} />
                  </div>
                  <span className="text-[11px] text-rose-600 font-medium block mt-0.5">
                    كان مستحقاً في: {d.due_date} (متأخر)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-600 font-mono">
                    {formatMoney(d.remaining_amount)}
                  </span>
                  <button
                    onClick={() => copyReminderMessage(d)}
                    title="نسخ تذكير"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-[11px] font-semibold"
                  >
                    {copiedId === d.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>تذكير</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
