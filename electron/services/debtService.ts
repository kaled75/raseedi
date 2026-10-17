import crypto from 'crypto';
import { getDatabase } from '../db';
import { Debt, DebtStatus, DebtType } from '../db/types';
import { logAudit } from './authService';

/**
 * Ensures financial precision by rounding to designated decimal places (default 2)
 */
export function roundMoney(amount: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function generateReferenceNo(prefix = 'DBT'): string {
  const year = new Date().getFullYear();
  const db = getDatabase();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM debts WHERE reference_no LIKE ?').get(`${prefix}-${year}-%`) as { count: number };
  const nextNum = (countRow.count + 1).toString().padStart(4, '0');
  return `${prefix}-${year}-${nextNum}`;
}

export function getDebts(filter?: {
  type?: DebtType;
  status?: DebtStatus;
  contact_id?: string;
  search?: string;
  include_archived?: boolean;
}): Debt[] {
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);

  let query = `
    SELECT 
      d.*,
      c.name as contact_name,
      c.phone as contact_phone,
      COALESCE(p.total_paid, 0) as total_paid,
      COALESCE(p.payments_count, 0) as payments_count,
      ROUND(d.original_amount - COALESCE(p.total_paid, 0), 2) as remaining_amount
    FROM debts d
    JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN (
      SELECT 
        debt_id, 
        SUM(amount) as total_paid,
        COUNT(id) as payments_count
      FROM payments 
      WHERE status = 'valid' 
      GROUP BY debt_id
    ) p ON d.id = p.debt_id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (!filter?.include_archived) {
    query += ' AND d.is_archived = 0';
  }

  if (filter?.type) {
    query += ' AND d.type = ?';
    params.push(filter.type);
  }

  if (filter?.status) {
    query += ' AND d.status = ?';
    params.push(filter.status);
  }

  if (filter?.contact_id) {
    query += ' AND d.contact_id = ?';
    params.push(filter.contact_id);
  }

  if (filter?.search) {
    query += ' AND (c.name LIKE ? OR d.description LIKE ? OR d.reference_no LIKE ?)';
    const s = `%${filter.search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY d.created_at DESC';

  const rows = db.prepare(query).all(...params) as Debt[];

  // Dynamically compute runtime status (e.g., checking if overdue)
  return rows.map(debt => {
    const remaining = roundMoney(debt.original_amount - (debt.total_paid || 0));
    const isOverdue = debt.due_date ? (debt.due_date < today && remaining > 0 && debt.status !== 'cancelled') : false;
    
    let computedStatus = debt.status;
    if (debt.status !== 'cancelled') {
      if (remaining <= 0) {
        computedStatus = 'fully_paid';
      } else if (debt.total_paid && debt.total_paid > 0) {
        computedStatus = isOverdue ? 'overdue' : 'partially_paid';
      } else if (isOverdue) {
        computedStatus = 'overdue';
      } else {
        computedStatus = 'open';
      }
    }

    return {
      ...debt,
      original_amount: roundMoney(debt.original_amount),
      total_paid: roundMoney(debt.total_paid || 0),
      remaining_amount: Math.max(0, remaining),
      is_overdue: isOverdue,
      status: computedStatus
    };
  });
}

export function getDebtById(id: string): Debt | null {
  const debts = getDebts({ include_archived: true });
  return debts.find(d => d.id === id) || null;
}

export function createDebt(data: {
  contact_id: string;
  type: DebtType;
  original_amount: number;
  currency?: string;
  created_date: string;
  due_date?: string | null;
  description: string;
  notes?: string;
  recording_method?: string;
}): { success: boolean; debt?: Debt; message?: string } {
  const db = getDatabase();

  const amount = roundMoney(data.original_amount);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, message: 'المبلغ الأصلي للدين يجب أن يكون قيمة رقمية أكبر من الصفر' };
  }

  if (!data.description || data.description.trim().length === 0) {
    return { success: false, message: 'وصف الدين أو سببه مطلوب' };
  }

  const contact = db.prepare('SELECT id, name, is_archived FROM contacts WHERE id = ?').get(data.contact_id) as any;
  if (!contact) {
    return { success: false, message: 'الشخص المحدد غير موجود' };
  }

  const id = crypto.randomUUID();
  const reference_no = generateReferenceNo(data.type === 'for_me' ? 'DBT-ME' : 'DBT-ON');
  const now = new Date().toISOString();
  const currency = data.currency || 'LYD';

  const insertTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO debts (
        id, reference_no, contact_id, type, original_amount, currency,
        created_date, due_date, description, recording_method, notes,
        status, is_archived, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'open', 0, ?, ?
      )
    `).run(
      id,
      reference_no,
      data.contact_id,
      data.type,
      amount,
      currency,
      data.created_date || now.slice(0, 10),
      data.due_date || null,
      data.description.trim(),
      data.recording_method || 'manual',
      data.notes || null,
      now,
      now
    );

    logAudit('CREATE_DEBT', 'debt', id, {
      reference_no,
      contact_id: data.contact_id,
      contact_name: contact.name,
      type: data.type,
      amount,
      currency
    });
  });

  insertTx();

  const created = getDebtById(id);
  return { success: true, debt: created || undefined };
}

export function updateDebt(id: string, data: {
  description?: string;
  due_date?: string | null;
  notes?: string;
  created_date?: string;
  original_amount?: number;
}): { success: boolean; debt?: Debt; message?: string } {
  const db = getDatabase();
  const existing = getDebtById(id);

  if (!existing) {
    return { success: false, message: 'الدين غير موجود' };
  }

  if (existing.status === 'cancelled') {
    return { success: false, message: 'لا يمكن تعديل دين ملغي' };
  }

  let finalAmount = existing.original_amount;
  if (data.original_amount !== undefined) {
    const newAmt = roundMoney(data.original_amount);
    if (newAmt <= 0) {
      return { success: false, message: 'المبلغ الأصلي يجب أن يكون أكبر من الصفر' };
    }
    const totalPaid = existing.total_paid || 0;
    if (newAmt < totalPaid) {
      return { 
        success: false, 
        message: `لا يمكن تقليل المبلغ الأصلي إلى ${newAmt} لأن مجموع الدفعات المسجلة فعلياً بلغ ${totalPaid}` 
      };
    }
    finalAmount = newAmt;
  }

  const now = new Date().toISOString();

  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE debts SET
        description = COALESCE(?, description),
        due_date = ?,
        notes = ?,
        created_date = COALESCE(?, created_date),
        original_amount = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      data.description ? data.description.trim() : null,
      data.due_date !== undefined ? data.due_date : existing.due_date,
      data.notes !== undefined ? data.notes : existing.notes,
      data.created_date || null,
      finalAmount,
      now,
      id
    );

    // Refresh status if amount changed
    const remaining = roundMoney(finalAmount - (existing.total_paid || 0));
    let newStatus: DebtStatus = existing.status;
    if (remaining <= 0) {
      newStatus = 'fully_paid';
    } else if ((existing.total_paid || 0) > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'open';
    }

    db.prepare('UPDATE debts SET status = ? WHERE id = ?').run(newStatus, id);

    logAudit('UPDATE_DEBT', 'debt', id, {
      previous: {
        description: existing.description,
        original_amount: existing.original_amount,
        due_date: existing.due_date
      },
      updated: {
        description: data.description,
        original_amount: finalAmount,
        due_date: data.due_date
      }
    });
  });

  updateTx();

  const updated = getDebtById(id);
  return { success: true, debt: updated || undefined };
}

export function cancelDebt(id: string, reason: string): { success: boolean; message?: string } {
  if (!reason || reason.trim().length === 0) {
    return { success: false, message: 'سبب إلغاء الدين مطلوب لتوثيق سجل التدقيق' };
  }

  const db = getDatabase();
  const existing = getDebtById(id);

  if (!existing) {
    return { success: false, message: 'الدين غير موجود' };
  }

  if (existing.total_paid && existing.total_paid > 0) {
    return { success: false, message: 'لا يمكن إلغاء دين يحتوي على دفعات مالية مسجلة. يجب إلغاء الدفعات أولاً إن كان هناك خطأ.' };
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare('UPDATE debts SET status = \'cancelled\', notes = ?, updated_at = ? WHERE id = ?')
      .run((existing.notes ? existing.notes + '\n' : '') + `[ملغي: ${reason.trim()}]`, now, id);

    logAudit('CANCEL_DEBT', 'debt', id, {
      reference_no: existing.reference_no,
      amount: existing.original_amount,
      reason: reason.trim()
    });
  })();

  return { success: true };
}

export function archiveDebt(id: string, archive = true): { success: boolean; message?: string } {
  const db = getDatabase();
  db.prepare('UPDATE debts SET is_archived = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(archive ? 1 : 0, id);
  return { success: true };
}

export function deleteDebt(id: string): { success: boolean; message?: string } {
  const db = getDatabase();
  const existing = getDebtById(id);
  if (!existing) {
    return { success: false, message: 'الدين غير موجود' };
  }

  const deleteTx = db.transaction(() => {
    // 1. Delete all payments associated with this debt
    db.prepare('DELETE FROM payments WHERE debt_id = ?').run(id);

    // 2. Delete the debt itself
    db.prepare('DELETE FROM debts WHERE id = ?').run(id);

    // 3. Audit log the deletion
    logAudit('DELETE_DEBT', 'debt', id, {
      reference_no: existing.reference_no,
      contact_id: existing.contact_id,
      contact_name: existing.contact_name,
      amount: existing.original_amount,
      type: existing.type,
      note: 'Deleted debt and cascaded associated payments completely'
    });
  });

  try {
    deleteTx();
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل حذف الدين' };
  }
}
