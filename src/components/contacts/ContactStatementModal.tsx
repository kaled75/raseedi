import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Contact, Debt, Payment } from '../../types';
import { api } from '../../utils/api';
import { useSettings } from '../../context/SettingsContext';
import { Printer, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface ContactStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
}

export const ContactStatementModal: React.FC<ContactStatementModalProps> = ({
  isOpen,
  onClose,
  contact
}) => {
  const { formatMoney } = useSettings();
  const [statement, setStatement] = useState<{
    debts: Debt[];
    payments: Payment[];
    summary: {
      total_for_me: number;
      total_on_me: number;
      net_balance: number;
      debts_count: number;
      payments_count: number;
    };
  } | null>(null);

  useEffect(() => {
    if (contact && isOpen) {
      api.getContactStatement(contact.id).then(res => {
        if (res) setStatement(res);
      });
    } else {
      setStatement(null);
    }
  }, [contact, isOpen]);

  if (!contact) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`كشف حساب: ${contact.name}`}
      maxWidth="2xl"
    >
      <div className="text-right">
        {/* Printable Area */}
        <div id="printable-statement" className="space-y-4">
          {/* Statement Header */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{contact.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {contact.phone ? `هاتف: ${contact.phone}` : 'بدون هاتف'} 
                {contact.email ? ` | ${contact.email}` : ''}
              </p>
            </div>
            <div className="text-left text-xs text-slate-400 font-mono">
              <span>تاريخ التقرير:</span>
              <span className="block font-bold text-slate-700 dark:text-slate-300">
                {new Date().toLocaleDateString('ar-LY')}
              </span>
            </div>
          </div>

          {/* Balance Summary Cards */}
          {statement && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block mb-0.5">مستحق لي عنده</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {formatMoney(statement.summary.total_for_me)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-xs text-rose-700 dark:text-rose-300 block mb-0.5">مستحق له عليّ</span>
                <span className="text-base font-black text-rose-700 dark:text-rose-300 font-mono">
                  {formatMoney(statement.summary.total_on_me)}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${
                statement.summary.net_balance >= 0 
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300' 
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              }`}>
                <span className="text-xs block mb-0.5">صافي الرصيد</span>
                <span className="text-base font-black font-mono">
                  {formatMoney(statement.summary.net_balance)}
                </span>
              </div>
            </div>
          )}

          {/* Debts Table */}
          <div>
            <h5 className="text-xs font-bold text-slate-500 mb-2">سجل الديون (العمليات الأصلية)</h5>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">المرجع</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">المبلغ الأصلي</th>
                    <th className="py-2.5 px-3">المسدد</th>
                    <th className="py-2.5 px-3">المتبقي</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {statement?.debts.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono font-semibold">{d.reference_no}</td>
                      <td className="py-2 px-3">
                        {d.type === 'for_me' ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> لي
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> عليّ
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium">{formatMoney(d.original_amount)}</td>
                      <td className="py-2 px-3 font-mono text-emerald-600">{formatMoney(d.total_paid || 0)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-600">{formatMoney(d.remaining_amount || 0)}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{d.created_date}</td>
                      <td className="py-2 px-3"><Badge status={d.status} /></td>
                    </tr>
                  ))}
                  {(!statement?.debts || statement.debts.length === 0) && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-slate-400">لا توجد ديون مسجلة لهذا الشخص</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Table */}
          {statement && statement.payments.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-slate-500 mb-2">سجل الدفعات المسددة</h5>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">رقم الإيصال</th>
                      <th className="py-2 px-3">المبلغ</th>
                      <th className="py-2 px-3">طريقة الدفع</th>
                      <th className="py-2 px-3">الرصيد السابق</th>
                      <th className="py-2 px-3">الرصيد الجديد</th>
                      <th className="py-2 px-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {statement.payments.map(p => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono font-semibold">{p.receipt_no}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-600">{formatMoney(p.amount)}</td>
                        <td className="py-2 px-3">{p.payment_method === 'cash' ? 'نقدًا' : 'تحويل'}</td>
                        <td className="py-2 px-3 font-mono">{formatMoney(p.previous_balance)}</td>
                        <td className="py-2 px-3 font-mono">{formatMoney(p.new_balance)}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{p.payment_date?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/30"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كشف الحساب 🖨️</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
