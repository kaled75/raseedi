import React from 'react';
import { Modal } from '../common/Modal';
import { Payment } from '../../types';
import { Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment
}) => {
  const { formatMoney } = useSettings();

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const isForMe = payment.debt_type === 'for_me';
  const methodLabel = {
    cash: 'نقدًا (كاش)',
    bank_transfer: 'تحويل مصرفي',
    check: 'صك / شيك مصدق',
    other: 'أخرى'
  }[payment.payment_method] || payment.payment_method;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إيصال سداد مالي معتمد" maxWidth="lg">
      <div className="text-right">
        {/* Printable Receipt Card */}
        <div 
          id="printable-receipt"
          className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 shadow-xs"
        >
          {/* Receipt Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-sm">
                  رَ
                </span>
                <span className="font-black text-base text-slate-900 dark:text-slate-100">رَصيدي | إيصال سداد</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">سند رسمي لإثبات الحركة المالية</p>
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-slate-400 block">رقم الإيصال</span>
              <span className="font-bold text-sm text-sky-600 dark:text-sky-400">{payment.receipt_no}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">اسم الشخص:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{payment.contact_name}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">نوع الحركة المالية:</span>
              <span className={`font-semibold ${isForMe ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isForMe ? 'استلام دفعة من دين مستحق لي (إقراض)' : 'سداد دفعة لدين مستحق عليّ (اقتراض)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">بيان الدين:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{payment.debt_description || '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">طريقة الدفع:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{methodLabel}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">تاريخ ووقت المعاملة:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{payment.payment_date}</span>
            </div>

            {payment.reference_no && (
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">الرقم المرجعي / الحوالة:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{payment.reference_no}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="my-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
            <span className="text-xs text-emerald-700 dark:text-emerald-300 block mb-1">المبلغ المسدد</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {formatMoney(payment.amount)}
            </span>
          </div>

          {/* Balance Tracker */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <div>
              <span className="text-slate-400 block mb-0.5">الرصيد قبل الدفعة</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{formatMoney(payment.previous_balance)}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الرصيد المتبقي بعد الدفعة</span>
              <span className={`font-black ${payment.new_balance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {formatMoney(payment.new_balance)} {payment.new_balance === 0 ? '(خالص)' : ''}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
            <div>
              <span className="block mb-6 font-semibold">توقيع المستلم</span>
              <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-1">
                ................................
              </div>
            </div>
            <div>
              <span className="block mb-6 font-semibold">توقيع المسدد</span>
              <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-1">
                ................................
              </div>
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/30"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الإيصال 🖨️</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
