import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Debt, PaymentMethod, Payment } from '../../types';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debts: Debt[];
  preselectedDebtId?: string;
  onPaymentRecorded: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  debts,
  preselectedDebtId,
  onPaymentRecorded
}) => {
  const { success, error } = useToast();
  const { formatMoney } = useSettings();

  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter available debts: only debts that are open or partially paid
  const payableDebts = debts.filter(d => (d.remaining_amount || 0) > 0 && d.status !== 'cancelled');

  useEffect(() => {
    if (!isOpen) return;
    if (preselectedDebtId) {
      setSelectedDebtId(preselectedDebtId);
    } else if (payableDebts.length > 0) {
      setSelectedDebtId(payableDebts[0].id);
    } else {
      setSelectedDebtId('');
    }
    setAmount('');
    setPaymentMethod('cash');
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setReferenceNo('');
    setNotes('');
  }, [isOpen, preselectedDebtId]);

  const currentDebt = payableDebts.find(d => d.id === selectedDebtId);
  const remaining = currentDebt?.remaining_amount || 0;
  const numAmount = parseFloat(amount) || 0;
  const isOverpayment = numAmount > remaining;
  const newRemaining = Math.max(0, remaining - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDebt) {
      error('يرجى اختيار الدين المراد سداده');
      return;
    }
    if (numAmount <= 0) {
      error('يرجى إدخال مبلغ سداد أكبر من الصفر');
      return;
    }
    if (isOverpayment) {
      error(`مبلغ الدفعة (${numAmount}) يتجاوز الرصيد المتبقي للدين (${remaining})`);
      return;
    }

    setLoading(true);

    const res = await api.recordPayment({
      debt_id: currentDebt.id,
      amount: numAmount,
      payment_date: paymentDate.replace('T', ' '),
      payment_method: paymentMethod,
      reference_no: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined
    });

    if (res.success && res.payment) {
      success(`تم تسجيل دفعة بقيمة ${formatMoney(numAmount)} بنجاح (إيصال #${res.payment.receipt_no})`);
      onPaymentRecorded(res.payment);
      onClose();
    } else {
      error(res.message || 'فشل تسجيل الدفعة');
    }

    setLoading(false);
  };

  const handleFullSettlement = () => {
    if (remaining > 0) {
      setAmount(remaining.toString());
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تسجيل دفعة سداد جديدة"
      maxWidth="lg"
    >
      {payableDebts.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <p className="font-semibold text-base mb-1">لا توجد ديون مستحقة للسداد حالياً</p>
          <p className="text-xs text-slate-400">جميع الديون مسددة بالكامل أو ملغاة.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          {/* Select Debt */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اختر الدين المراد سداده <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDebtId}
              onChange={(e) => {
                setSelectedDebtId(e.target.value);
                setAmount('');
              }}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              {payableDebts.map(d => (
                <option key={d.id} value={d.id}>
                  {d.reference_no} — {d.contact_name}: {d.description} (المتبقي: {d.remaining_amount} {d.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Current Debt Summary Card */}
          {currentDebt && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">الشخص</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{currentDebt.contact_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">المبلغ الأصلي</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(currentDebt.original_amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">الرصيد المتبقي</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{formatMoney(remaining)}</span>
              </div>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                مبلغ الدفعة ({currentDebt?.currency || 'LYD'}) <span className="text-rose-500">*</span>
              </label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={handleFullSettlement}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  ⚡ سداد كامل الرصيد المتبقي ({remaining})
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
              className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl py-2.5 px-4 text-base font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 font-mono ${
                isOverpayment
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />

            {/* Overpayment warning */}
            {isOverpayment && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>المبلغ المدخل يتجاوز الرصيد المتبقي للدين ({remaining})! لن يُقبل حفظ الدفعة.</span>
              </div>
            )}

            {/* Remaining after payment preview */}
            {!isOverpayment && numAmount > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
                <span>الرصيد المتبقي بعد هذه الدفعة:</span>
                <span className={`font-bold ${newRemaining === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {formatMoney(newRemaining)} {newRemaining === 0 ? '(سداد كامل)' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              طريقة الدفع <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'نقدًا (كاش)' },
                { id: 'bank_transfer', label: 'تحويل مصرفي' },
                { id: 'check', label: 'صك / شيك' },
                { id: 'other', label: 'أخرى' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition-all ${
                    paymentMethod === m.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تاريخ ووقت السداد
              </label>
              <input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الإيصال / الحوالة (اختياري)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="رقم مرجعي للعملية..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات الدفعة (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: استلام يد بيد، تحويل تطبيق مصرفي..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || isOverpayment || numAmount <= 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-sm shadow-emerald-600/30 disabled:opacity-50"
            >
              {loading ? 'جاري التسجيل...' : 'تسجيل الدفعة المالية'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
