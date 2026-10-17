import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Calendar as CalendarIcon, 
  Edit, 
  XCircle, 
  FileText, 
  Share2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Trash2
} from 'lucide-react';
import { Debt, DebtStatus, DebtType } from '../types';
import { api } from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

interface DebtsViewBaseProps {
  refreshTrigger?: number;
  searchQuery?: string;
  fixedType?: DebtType;
  title: string;
  subtitle: string;
  onOpenNewDebt: () => void;
  onRecordPayment: (debtId: string) => void;
  onEditDebt: (debt: Debt) => void;
  onDataChange?: () => void;
}

export const DebtsViewBase: React.FC<DebtsViewBaseProps> = ({
  refreshTrigger,
  searchQuery,
  fixedType,
  title,
  subtitle,
  onOpenNewDebt,
  onRecordPayment,
  onEditDebt,
  onDataChange
}) => {
  const { formatMoney } = useSettings();
  const { success, error } = useToast();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Cancellation modal state
  const [cancellingDebtId, setCancellingDebtId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Permanent Delete modal state
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

  const loadDebts = async () => {
    try {
      const data = await api.getDebts({
        type: fixedType,
        include_archived: false
      });
      setDebts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, [fixedType, refreshTrigger]);

  const effectiveSearch = (searchQuery || search).trim().toLowerCase();

  const filteredDebts = debts.filter(d => {
    if (effectiveSearch) {
      const matchContact = d.contact_name?.toLowerCase().includes(effectiveSearch);
      const matchDesc = d.description.toLowerCase().includes(effectiveSearch);
      const matchRef = d.reference_no.toLowerCase().includes(effectiveSearch);
      if (!matchContact && !matchDesc && !matchRef) return false;
    }

    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return d.is_overdue || d.status === 'overdue';
    return d.status === statusFilter;
  });

  const handleCancelDebt = async () => {
    if (!cancellingDebtId || !cancelReason.trim()) {
      error('يرجى كتابة سبب الإلغاء');
      return;
    }

    const res = await api.cancelDebt(cancellingDebtId, cancelReason.trim());
    if (res.success) {
      success('تم إلغاء الدين وتوثيق السبب في سجل التدقيق بنجاح');
      loadDebts();
      onDataChange?.();
    } else {
      error(res.message || 'فشل إلغاء الدين');
    }

    setCancellingDebtId(null);
    setCancelReason('');
  };

  const handleDeleteDebt = async () => {
    if (!deletingDebtId) return;

    const res = await api.deleteDebt(deletingDebtId);
    if (res.success) {
      success('تم حذف الدين وكافة السجلات المرتبطة به نهائياً بالكامل');
      loadDebts();
      onDataChange?.();
    } else {
      error(res.message || 'فشل حذف الدين');
    }

    setDeletingDebtId(null);
  };

  // Calculate totals for active list
  const totalOriginal = filteredDebts.reduce((sum, d) => sum + d.original_amount, 0);
  const totalPaid = filteredDebts.reduce((sum, d) => sum + (d.total_paid || 0), 0);
  const totalRemaining = filteredDebts.reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in text-right">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <button
          onClick={onOpenNewDebt}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة دين جديد</span>
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">إجمالي المبالغ الأصلية</span>
          <span className="font-black text-base text-slate-900 dark:text-slate-100 font-mono">
            {formatMoney(totalOriginal)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">المبالغ المسددة فعلياً</span>
          <span className="font-black text-base text-emerald-600 font-mono">
            {formatMoney(totalPaid)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-semibold">صافي الرصيد المتبقي</span>
          <span className="font-black text-base text-amber-600 font-mono">
            {formatMoney(totalRemaining)}
          </span>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالشخص، الوصف، أو الرقم المرجعي..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-10 pl-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'open', label: 'مفتوح' },
            { id: 'partially_paid', label: 'مسدد جزئياً' },
            { id: 'overdue', label: 'متأخر' },
            { id: 'fully_paid', label: 'مسدد بالكامل' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Debts Cards List */}
      {filteredDebts.length === 0 ? (
        <EmptyState
          title="لا توجد ديون مطابقة"
          description="لم يتم العثور على أية سجلات ديون تطابق معايير الفلترة المحددة."
          actionText="+ إضافة دين جديد"
          onAction={onOpenNewDebt}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDebts.map(debt => {
            const original = debt.original_amount;
            const paid = debt.total_paid || 0;
            const remaining = debt.remaining_amount || 0;
            const percentage = original > 0 ? Math.min(100, Math.round((paid / original) * 100)) : 0;
            const isSettled = remaining <= 0;

            return (
              <div
                key={debt.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Contact & Reference & Status */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {debt.contact_name}
                        </h4>
                        {!fixedType && <Badge type={debt.type} />}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                        {debt.reference_no}
                      </span>
                    </div>

                    <Badge status={debt.status} />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-3 line-clamp-2">
                    {debt.description}
                  </p>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center text-xs mb-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">المبلغ الأصلي</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {formatMoney(original)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">المدفوع</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {formatMoney(paid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">المتبقي</span>
                      <span className={`font-black font-mono ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatMoney(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Repayment Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>نسبة السداد:</span>
                      <span className="font-mono font-bold">{percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSettled ? 'bg-emerald-500' : percentage > 50 ? 'bg-sky-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates & Notes */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-mono">تاريخ الدين: {debt.created_date}</span>
                    <div className="flex items-center gap-1 font-mono">
                      <CalendarIcon className="w-3 h-3" />
                      <span>الاستحقاق: {debt.due_date || 'غير محدد'}</span>
                      {debt.is_overdue && (
                        <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/60 px-1 rounded text-[10px]">
                          متأخر
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    {!isSettled && debt.status !== 'cancelled' ? (
                      <button
                        onClick={() => onRecordPayment(debt.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition-all"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>تسجيل دفعة سداد</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>الدين مسدد بالكامل</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditDebt(debt)}
                      title="تعديل بيانات الدين"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {paid === 0 && debt.status !== 'cancelled' && (
                      <button
                        onClick={() => setCancellingDebtId(debt.id)}
                        title="إلغاء الدين وتوثيق السبب"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingDebtId(debt.id)}
                      title="حذف الدين نهائياً بالكامل"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Debt Reason Dialog */}
      {cancellingDebtId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">إلغاء الدين وتوثيق السبب</h3>
            <p className="text-xs text-slate-500 mb-4">
              لا يمكن إلغاء دين يحتوي على دفعات مسجلة. يرجى توضيح سبب الإلغاء لتوثيقه في سجل التدقيق المحاسبي.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب إلغاء هذا الدين بالتفصيل..."
              required
              autoFocus
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setCancellingDebtId(null); setCancelReason(''); }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleCancelDebt}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/30"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Debt Permanently Dialog */}
      <ConfirmDialog
        isOpen={!!deletingDebtId}
        title="تأكيد حذف الدين نهائياً"
        message="هل أنت متأكد من رغبتك في حذف هذا الدين نهائياً؟ تنبيه: سيتم حذف الدين وكافة سجلات الدفعات المرتبطة به بشكل كامل من النظام ولن يظهر في أي تقارير أو تصدير."
        confirmText="تأكيد الحذف نهائياً"
        isDestructive={true}
        onConfirm={handleDeleteDebt}
        onCancel={() => setDeletingDebtId(null)}
      />
    </div>
  );
};
