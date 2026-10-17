import crypto from 'crypto';
import { getDatabase } from '../db';
import { Payment, PaymentMethod, DebtStatus } from '../db/types';
import { getDebtById, roundMoney } from './debtService';
import { logAudit } from './authService';

export function generateReceiptNo(): string {
  const year = new Date().getFullYear();
  const db = getDatabase();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM payments WHERE receipt_no LIKE ?').get(`REC-${year}-%`) as { count: number };
  const nextNum = (countRow.count + 1).toString().padStart(4, '0');
  return `REC-${year}-${nextNum}`;
}

export function getPayments(filter?: {
  debt_id?: string;
  contact_id?: string;
  status?: string;
}): Payment[] {
  const db = getDatabase();
  let query = `
    SELECT 
      p.*,
      d.description as debt_description,
      d.type as debt_type,
      d.currency as currency,
      c.name as contact_name
    FROM payments p
    JOIN debts d ON p.debt_id = d.id
    JOIN contacts c ON p.contact_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter?.debt_id) {
    query += ' AND p.debt_id = ?';
    params.push(filter.debt_id);
  }

  if (filter?.contact_id) {
    query += ' AND p.contact_id = ?';
    params.push(filter.contact_id);
  }

  if (filter?.status) {
    query += ' AND p.status = ?';
    params.push(filter.status);
  }

  query += ' ORDER BY p.created_at DESC';

  const rows = db.prepare(query).all(...params) as Payment[];
  return rows.map(r => ({
    ...r,
    amount: roundMoney(r.amount),
    previous_balance: roundMoney(r.previous_balance),
    new_balance: roundMoney(r.new_balance)
  }));
}

export function recordPayment(data: {
  debt_id: string;
  amount: number;
  payment_date?: string;
  payment_method: PaymentMethod;
  reference_no?: string;
  notes?: string;
  idempotency_key?: string;
}): { success: boolean; payment?: Payment; message?: string } {
  const db = getDatabase();

  const amount = roundMoney(data.amount);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, message: 'مبلغ الدفعة يجب أن يكون أكبر من الصفر' };
  }

  const debt = getDebtById(data.debt_id);
  if (!debt) {
    return { success: false, message: 'الدين المحدد غير موجود' };
  }

  if (debt.status === 'cancelled') {
    return { success: false, message: 'لا يمكن تسجيل دفعة لدين ملغي' };
  }

  const currentRemaining = roundMoney(debt.remaining_amount ?? (debt.original_amount - (debt.total_paid || 0)));

  if (currentRemaining <= 0) {
    return { success: false, message: 'هذا الدين مسدد بالكامل مسبقاً' };
  }

  // Prevent overpayment
  if (amount > currentRemaining) {
    return { 
      success: false, 
      message: `مبلغ الدفعة (${amount} ${debt.currency}) يتجاوز الرصيد المتبقي للدين (${currentRemaining} ${debt.currency})!` 
    };
  }

  // Idempotency check: prevent duplicate submissions within 5 seconds for same debt & amount
  const recentDuplicate = db.prepare(`
    SELECT id FROM payments 
    WHERE debt_id = ? AND amount = ? AND status = 'valid' 
      AND datetime(created_at) >= datetime('now', '-5 seconds')
  `).get(data.debt_id, amount);

  if (recentDuplicate) {
    return { success: false, message: 'تم إرسال نفس الدفعة للتو؛ منعاً للتكرار تم تجاهل الطلب' };
  }

  const paymentId = crypto.randomUUID();
  const receiptNo = generateReceiptNo();
  const newRemaining = roundMoney(currentRemaining - amount);
  const now = new Date().toISOString();
  const paymentDate = data.payment_date || now;

  let newDebtStatus: DebtStatus = 'partially_paid';
  if (newRemaining <= 0) {
    newDebtStatus = 'fully_paid';
  }

  const tx = db.transaction(() => {
    // 1. Insert payment record
    db.prepare(`
      INSERT INTO payments (
        id, receipt_no, debt_id, contact_id, amount,
        payment_date, payment_method, reference_no, notes,
        previous_balance, new_balance, status, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 'valid', ?
      )
    `).run(
      paymentId,
      receiptNo,
      data.debt_id,
      debt.contact_id,
      amount,
      paymentDate,
      data.payment_method,
      data.reference_no || null,
      data.notes || null,
      currentRemaining,
      newRemaining,
      now
    );

    // 2. Update debt status
    db.prepare('UPDATE debts SET status = ?, updated_at = ? WHERE id = ?')
      .run(newDebtStatus, now, data.debt_id);

    // 3. Log audit
    logAudit(debt.type === 'for_me' ? 'PAYMENT_RECEIVED' : 'PAYMENT_MADE', 'payment', paymentId, {
      receipt_no: receiptNo,
      debt_id: data.debt_id,
      debt_ref: debt.reference_no,
      amount,
      previous_balance: currentRemaining,
      new_balance: newRemaining,
      method: data.payment_method
    });
  });

  tx();

  const created = getPayments({ debt_id: data.debt_id }).find(p => p.id === paymentId);
  return { success: true, payment: created };
}

export function cancelPayment(paymentId: string, reason: string): { success: boolean; message?: string } {
  if (!reason || reason.trim().length === 0) {
    return { success: false, message: 'سبب إلغاء الدفعة إلزامي للتوثيق والتدقيق المالي' };
  }

  const db = getDatabase();
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as Payment | undefined;

  if (!payment) {
    return { success: false, message: 'الدفعة غير موجودة' };
  }

  if (payment.status === 'cancelled') {
    return { success: false, message: 'الدفعة ملغاة بالفعل' };
  }

  const debt = getDebtById(payment.debt_id);
  if (!debt) {
    return { success: false, message: 'الدين المرتبط غير موجود' };
  }

  const now = new Date().toISOString();

  const cancelTx = db.transaction(() => {
    // 1. Mark payment as cancelled
    db.prepare(`
      UPDATE payments 
      SET status = 'cancelled', cancellation_reason = ?, cancelled_at = ?
      WHERE id = ?
    `).run(reason.trim(), now, paymentId);

    // 2. Recalculate debt remaining balance & status from all remaining valid payments
    const validPayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments 
      WHERE debt_id = ? AND status = 'valid'
    `).get(debt.id) as { total: number };

    const totalPaid = roundMoney(validPayments.total);
    const remaining = roundMoney(debt.original_amount - totalPaid);

    let updatedStatus: DebtStatus = 'open';
    if (remaining <= 0) {
      updatedStatus = 'fully_paid';
    } else if (totalPaid > 0) {
      updatedStatus = 'partially_paid';
    }

    db.prepare('UPDATE debts SET status = ?, updated_at = ? WHERE id = ?')
      .run(updatedStatus, now, debt.id);

    // 3. Log audit
    logAudit('CANCEL_PAYMENT', 'payment', paymentId, {
      receipt_no: payment.receipt_no,
      amount: payment.amount,
      debt_id: debt.id,
      reason: reason.trim(),
      new_remaining: remaining
    });
  });

  cancelTx();
  return { success: true };
}
