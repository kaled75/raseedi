import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  XCircle, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Payment } from '../types';
import { api } from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { ReceiptModal } from '../components/payments/ReceiptModal';

interface PaymentsViewProps {
  refreshTrigger?: number;
  searchQuery?: string;
  onOpenNewPayment: () => void;
  onDataChange?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ refreshTrigger, searchQuery, onOpenNewPayment, onDataChange }) => {
  const { formatMoney } = useSettings();
  const { success, error } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Receipt viewing modal
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);

  // Cancel payment dialog
  const [cancellingPaymentId, setCancellingPaymentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadPayments = async () => {
    try {
      const data = await api.getPayments();
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [refreshTrigger]);

  const effectiveSearch = (searchQuery || search).trim().toLowerCase();

  const filteredPayments = payments.filter(p => {
    if (effectiveSearch) {
      const matchContact = p.contact_name?.toLowerCase().includes(effectiveSearch);
      const matchReceipt = p.receipt_no.toLowerCase().includes(effectiveSearch);
      const matchDesc = p.debt_description?.toLowerCase().includes(effectiveSearch);
      if (!matchContact && !matchReceipt && !matchDesc) return false;
    }

    if (methodFilter !== 'all' && p.payment_method !== methodFilter) return false;

    return true;
  });

  const handleCancelPayment = async () => {
    if (!cancellingPaymentId || !cancelReason.trim()) {
      error('يرجى كتابة سبب إلغاء الدفعة');
      return;
    }

    const res = await api.cancelPayment(cancellingPaymentId, cancelReason.trim());
    if (res.success) {
      success('تم إلغاء الدفعة وإعادة احتساب أرصدة الدين بنجاح');
      loadPayments();
      onDataChange?.();
    } else {
      error(res.message || 'فشل إلغاء الدفعة');
    }

    setCancellingPaymentId(null);
    setCancelReason('');
  };

  const totalValidAmount = filteredPayments
    .filter(p => p.status === 'valid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5 animate-fade-in text-right">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span>سجل المدفوعات والإيصالات المالية</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">سجل تدقيق كامل لكافة الدفعات المسددة والمستلمة مع إمكانية طباعة الإيصالات</p>
        </div>

        <button
          onClick={onOpenNewPayment}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition-all shrink-0"
        >
          <Receipt className="w-4 h-4" />
          <span>+ تسجيل دفعة جديدة</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-semibold">إجمالي المبالغ المسددة في هذه القائمة:</span>
        <span className="text-xl font-black text-emerald-600 font-mono">
          {formatMoney(totalValidAmount)}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الإيصال، اسم الشخص..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-10 pl-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Method Filters */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs">
          {[
            { id: 'all', label: 'كافة الطرق' },
            { id: 'cash', label: 'نقدًا' },
            { id: 'bank_transfer', label: 'تحويل مصرفي' },
            { id: 'check', label: 'صك / شيك' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMethodFilter(m.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                methodFilter === m.id
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="لا توجد دفعات مسجلة"
          description="لم تسجل أية دفعات سداد مطابقة للبحث حتى الآن."
          actionText="+ تسجيل دفعة الآن"
          onAction={onOpenNewPayment}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">رقم الإيصال</th>
                  <th className="py-3 px-4">الشخص</th>
                  <th className="py-3 px-4">نوع المعاملة</th>
                  <th className="py-3 px-4">مبلغ الدفعة</th>
                  <th className="py-3 px-4">طريقة الدفع</th>
                  <th className="py-3 px-4">الرصيد السابق</th>
                  <th className="py-3 px-4">الرصيد الجديد</th>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map(p => {
                  const isCancelled = p.status === 'cancelled';
                  const isForMe = p.debt_type === 'for_me';

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isCancelled ? 'opacity-50 line-through bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {p.receipt_no}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {p.contact_name}
                      </td>
                      <td className="py-3 px-4">
                        {isForMe ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> استلام (لي)
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> سداد (عليّ)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-600">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {p.payment_method === 'cash' ? 'نقدًا' : p.payment_method === 'bank_transfer' ? 'تحويل مصرفي' : 'صك'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{formatMoney(p.previous_balance)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{formatMoney(p.new_balance)}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {p.payment_date ? p.payment_date.replace('T', ' ').slice(0, 16) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCancelled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isCancelled ? 'ملغاة' : 'صحيحة'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingPayment(p)}
                            title="عرض وطباعة الإيصال"
                            className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <button
                              onClick={() => setCancellingPaymentId(p.id)}
                              title="إلغاء الدفعة"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!viewingPayment}
        onClose={() => setViewingPayment(null)}
        payment={viewingPayment}
      />

      {/* Cancel Payment Confirmation Modal */}
      {cancellingPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">إلغاء الدفعة المالية</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              تنبيه: سيؤدي إلغاء هذه الدفعة إلى إعادة إضافة مبلغها تلقائياً إلى رصيد الدين المتبقي، وتحديث حالته. يرجى توثيق سبب الإلغاء في سجل التدقيق.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب إلغاء الدفعة (مثلاً: خطأ في المبلغ، شيك مرتجع...)"
              required
              autoFocus
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setCancellingPaymentId(null); setCancelReason(''); }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleCancelPayment}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/30"
              >
                تأكيد إلغاء الدفعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
