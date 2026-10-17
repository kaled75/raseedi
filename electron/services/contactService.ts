import crypto from 'crypto';
import { getDatabase } from '../db';
import { Contact } from '../db/types';
import { getDebts, roundMoney } from './debtService';
import { getPayments } from './paymentService';
import { logAudit } from './authService';

export function getContacts(filter?: {
  search?: string;
  include_archived?: boolean;
}): Contact[] {
  const db = getDatabase();
  let query = 'SELECT * FROM contacts WHERE 1=1';
  const params: any[] = [];

  if (!filter?.include_archived) {
    query += ' AND is_archived = 0';
  }

  if (filter?.search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    const s = `%${filter.search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY name COLLATE NOCASE ASC';

  const rows = db.prepare(query).all(...params) as Contact[];

  // Retrieve all non-cancelled debts to calculate balances accurately
  const debts = getDebts({ include_archived: true });

  return rows.map(c => {
    const contactDebts = debts.filter(d => d.contact_id === c.id && d.status !== 'cancelled');
    
    let totalForMe = 0;
    let totalOnMe = 0;
    let activeDebtsCount = 0;

    for (const d of contactDebts) {
      const rem = d.remaining_amount || 0;
      if (d.type === 'for_me') {
        totalForMe += rem;
      } else {
        totalOnMe += rem;
      }
      if (rem > 0) {
        activeDebtsCount++;
      }
    }

    return {
      ...c,
      total_for_me: roundMoney(totalForMe),
      total_on_me: roundMoney(totalOnMe),
      net_balance: roundMoney(totalForMe - totalOnMe),
      active_debts_count: activeDebtsCount
    };
  });
}

export function getContactById(id: string): Contact | null {
  const contacts = getContacts({ include_archived: true });
  return contacts.find(c => c.id === id) || null;
}

export function createContact(data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  avatar?: string;
  notes?: string;
}): { success: boolean; contact?: Contact; message?: string } {
  const name = data.name ? data.name.trim() : '';
  if (!name) {
    return { success: false, message: 'اسم الشخص مطلوب' };
  }

  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO contacts (id, name, phone, email, address, avatar, notes, is_archived, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    id,
    name,
    data.phone?.trim() || null,
    data.email?.trim() || null,
    data.address?.trim() || null,
    data.avatar || null,
    data.notes?.trim() || null,
    now,
    now
  );

  logAudit('CREATE_CONTACT', 'contact', id, { name });

  const created = getContactById(id);
  return { success: true, contact: created || undefined };
}

export function updateContact(id: string, data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  avatar?: string;
  notes?: string;
}): { success: boolean; contact?: Contact; message?: string } {
  const name = data.name ? data.name.trim() : '';
  if (!name) {
    return { success: false, message: 'اسم الشخص مطلوب' };
  }

  const db = getDatabase();
  const existing = getContactById(id);
  if (!existing) {
    return { success: false, message: 'الشخص غير موجود' };
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE contacts SET
      name = ?,
      phone = ?,
      email = ?,
      address = ?,
      avatar = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    name,
    data.phone?.trim() || null,
    data.email?.trim() || null,
    data.address?.trim() || null,
    data.avatar || null,
    data.notes?.trim() || null,
    now,
    id
  );

  logAudit('UPDATE_CONTACT', 'contact', id, { name });

  const updated = getContactById(id);
  return { success: true, contact: updated || undefined };
}

export function archiveContact(id: string, archive = true): { success: boolean; message?: string } {
  const db = getDatabase();
  const contact = getContactById(id);
  if (!contact) {
    return { success: false, message: 'الشخص غير موجود' };
  }

  db.prepare('UPDATE contacts SET is_archived = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(archive ? 1 : 0, id);

  logAudit('ARCHIVE_CONTACT', 'contact', id, { archived: archive });
  return { success: true };
}

export function deleteContact(id: string): { success: boolean; message?: string } {
  const db = getDatabase();

  const deleteTx = db.transaction(() => {
    // 1. Delete all payments associated with this contact or their debts
    db.prepare('DELETE FROM payments WHERE contact_id = ? OR debt_id IN (SELECT id FROM debts WHERE contact_id = ?)').run(id, id);
    
    // 2. Delete all debts for this contact
    db.prepare('DELETE FROM debts WHERE contact_id = ?').run(id);
    
    // 3. Delete the contact
    db.prepare('DELETE FROM contacts WHERE id = ?').run(id);

    logAudit('DELETE_CONTACT', 'contact', id, { note: 'Deleted contact and cascaded associated debts and payments' });
  });

  try {
    deleteTx();
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل حذف جهة الاتصال' };
  }
}

export function getContactStatement(contactId: string) {
  const contact = getContactById(contactId);
  if (!contact) return null;

  const debts = getDebts({ contact_id: contactId, include_archived: false }).filter(d => d.status !== 'cancelled');
  const payments = getPayments({ contact_id: contactId, status: 'valid' });

  return {
    contact,
    debts,
    payments,
    summary: {
      total_for_me: contact.total_for_me || 0,
      total_on_me: contact.total_on_me || 0,
      net_balance: contact.net_balance || 0,
      debts_count: debts.length,
      payments_count: payments.length
    }
  };
}
