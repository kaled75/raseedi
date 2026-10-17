import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Contact, Debt, DebtType } from '../../types';
import { api } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt?: Debt | null;
  onSaved: () => void;
  contacts: Contact[];
  onOpenNewContact: () => void;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  debt,
  onSaved,
  contacts,
  onOpenNewContact
}) => {
  const { success, error } = useToast();
  const { currency } = useSettings();

  const [contactId, setContactId] = useState('');
  const [type, setType] = useState<DebtType>('for_me');
  const [amount, setAmount] = useState('');
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAddedRef, setLastAddedRef] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setLastAddedRef(null);
      return;
    }
    if (debt) {
      setContactId(debt.contact_id);
      setType(debt.type);
      setAmount(debt.original_amount.toString());
      setCreatedDate(debt.created_date || new Date().toISOString().slice(0, 10));
      setDueDate(debt.due_date || '');
      setDescription(debt.description);
      setNotes(debt.notes || '');
      setLastAddedRef(null);
    } else {
      setContactId(prev => (prev && contacts.some(c => c.id === prev)) ? prev : (contacts.length > 0 ? contacts[0].id : ''));
      setType('for_me');
      setAmount('');
      setCreatedDate(new Date().toISOString().slice(0, 10));
      setDueDate('');
      setDescription('');
      setNotes('');
    }
  }, [debt, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) {
      error('يرجى اختيار الشخص المرتبط بالدين');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      error('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!description.trim()) {
      error('يرجى كتابة وصف أو سبب الدين');
      return;
    }

    setLoading(true);

    if (debt) {
      // Edit metadata
      const res = await api.updateDebt(debt.id, {
        description: description.trim(),
        due_date: dueDate || null,
        created_date: createdDate,
        notes: notes.trim(),
        original_amount: numAmount
      });

      if (res.success) {
        success('تم تحديث بيانات الدين بنجاح');
        onSaved();
        onClose();
      } else {
        error(res.message || 'فشل تحديث الدين');
      }
    } else {
      // Create new debt
      const res = await api.createDebt({
        contact_id: contactId,
        type,
        original_amount: numAmount,
        currency,
        created_date: createdDate,
        due_date: dueDate || null,
        description: description.trim(),
        notes: notes.trim()
      });

      if (res.success) {
        const refNo = res.debt?.reference_no || 'جديد';
        setLastAddedRef(refNo);
        success(`تم تسجيل الدين (${refNo}) بنجاح! يمكنك الآن تسجيل دين آخر مباشرة.`);
        onSaved();

        // Keep modal open, clear fields for the next debt entry
        setAmount('');
        setDescription('');
        setNotes('');
        setDueDate('');
        setTimeout(() => {
          amountInputRef.current?.focus();
        }, 100);
      } else {
        error(res.message || 'فشل تسجيل الدين');
      }
    }

    setLoading(false);
  };

  const setPresetDueDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setDueDate(d.toISOString().slice(0, 10));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={debt ? 'تعديل بيانات الدين' : 'إضافة دين جديد'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* Success Banner when keeping modal open */}
        {lastAddedRef && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold">✓ تم تسجيل الدين ({lastAddedRef}) بنجاح!</span>
              <span className="text-emerald-600 dark:text-emerald-400">القائمة لا تزال مفتوحة لإضافة دين آخر مباشرة:</span>
            </div>
            <button
              type="button"
              onClick={() => setLastAddedRef(null)}
              className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
        {/* Debt Type Selector (Only if creating new) */}
        {!debt && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              نوع الدين <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('for_me')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                  type === 'for_me'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>مستحق لي (أقرضته)</span>
                <span className="text-[11px] font-normal opacity-80">مال أطلبه من هذا الشخص</span>
              </button>

              <button
                type="button"
                onClick={() => setType('on_me')}
                className={`py-3 px-4 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                  type === 'on_me'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>مستحق عليّ (اقترضت منه)</span>
                <span className="text-[11px] font-normal opacity-80">مال يطلبه هذا الشخص مني</span>
              </button>
            </div>
          </div>
        )}

        {/* Contact Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              الشخص المرتبط بالدين <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={onOpenNewContact}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              + إضافة شخص جديد للقائمة
            </button>
          </div>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            disabled={!!debt}
            required
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:opacity-60"
          >
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Original Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            المبلغ الأصلي للدين ({currency}) <span className="text-rose-500">*</span>
          </label>
          <input
            ref={amountInputRef}
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
          />
        </div>

        {/* Description / Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            بيان الدين أو سببه <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: سلفة لشراء حاسوب، توريد بضاعة، صيانة سيارة..."
            required
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              تاريخ الدين
            </label>
            <input
              type="date"
              value={createdDate}
              onChange={(e) => setCreatedDate(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                تاريخ الاستحقاق (اختياري)
              </label>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="text-[11px] text-slate-400 hover:text-rose-500"
                >
                  مسح
                </button>
              )}
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            {/* Quick date presets */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => setPresetDueDate(1)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              >
                + شهر
              </button>
              <button
                type="button"
                onClick={() => setPresetDueDate(3)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              >
                + 3 أشهر
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات إضافية (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="أي تفاصيل أخرى أو شروط سداد متفق عليها..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
          >
            {lastAddedRef ? 'إنهاء وإغلاق النافذة' : 'إلغاء'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-sm shadow-sky-600/30 disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : (debt ? 'حفظ التعديلات' : '+ تسجيل الدين وإضافة آخر')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
