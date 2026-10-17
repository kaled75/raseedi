import crypto from 'crypto';
import { getDatabase } from '../db';
import { createContact } from './contactService';
import { createDebt } from './debtService';
import { recordPayment } from './paymentService';
import { logAudit } from './authService';

const DEMO_TAG = ' [تجريبي]';

export function seedDemoData(): { success: boolean; message?: string } {
  const db = getDatabase();

  // Check if demo data already seeded
  const existing = db.prepare('SELECT COUNT(*) as c FROM contacts WHERE name LIKE ?').get(`%${DEMO_TAG}%`) as { c: number };
  if (existing.c > 0) {
    return { success: false, message: 'البيانات التجريبية مضافة بالفعل في النظام.' };
  }

  // 1. Create realistic Arabic Contacts
  const contactsData = [
    { name: `طارق الورفلي${DEMO_TAG}`, phone: '0912345678', email: 'tariq@example.com', notes: 'زميل العمل' },
    { name: `سالم الفيتوري${DEMO_TAG}`, phone: '0923456789', email: 'salem@example.com', notes: 'قريب وصديق' },
    { name: `محمود القاضي${DEMO_TAG}`, phone: '0945678901', email: 'mahmoud@example.com', notes: 'تاجر أجهزة' },
    { name: `عمر الشريف${DEMO_TAG}`, phone: '0919876543', email: 'omar@example.com', notes: 'صديق الطفولة' }
  ];

  const createdContacts: any[] = [];
  for (const c of contactsData) {
    const res = createContact(c);
    if (res.contact) createdContacts.push(res.contact);
  }

  if (createdContacts.length < 4) {
    return { success: false, message: 'فشل إدراج جهات الاتصال التجريبية' };
  }

  const today = new Date();
  const pastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(today.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const futureDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(today.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };

  // 2. Create Debts
  // Debt 1: For Me, partially paid
  const d1 = createDebt({
    contact_id: createdContacts[0].id,
    type: 'for_me',
    original_amount: 1500,
    currency: 'LYD',
    created_date: pastDate(25),
    due_date: futureDate(15),
    description: `مساعدة شراء جهاز حاسوب${DEMO_TAG}`,
    notes: 'سداد على دفعتين'
  });

  // Debt 2: On Me, open
  const d2 = createDebt({
    contact_id: createdContacts[1].id,
    type: 'on_me',
    original_amount: 850,
    currency: 'LYD',
    created_date: pastDate(10),
    due_date: futureDate(20),
    description: `اقتراض لمصروف صيانة سيارة${DEMO_TAG}`,
    notes: 'سداد نهاية الشهر'
  });

  // Debt 3: For Me, overdue
  const d3 = createDebt({
    contact_id: createdContacts[2].id,
    type: 'for_me',
    original_amount: 2200,
    currency: 'LYD',
    created_date: pastDate(60),
    due_date: pastDate(10), // overdue!
    description: `توريد بضاعة قرطاسية${DEMO_TAG}`,
    notes: 'تأخر عن موعد الاستحقاق'
  });

  // Debt 4: For Me, fully paid
  const d4 = createDebt({
    contact_id: createdContacts[3].id,
    type: 'for_me',
    original_amount: 500,
    currency: 'LYD',
    created_date: pastDate(40),
    due_date: pastDate(5),
    description: `سلفة شخصية طارئة${DEMO_TAG}`,
    notes: 'تم استلام المبلغ بالكامل'
  });

  // 3. Payments
  if (d1.debt) {
    recordPayment({
      debt_id: d1.debt.id,
      amount: 500,
      payment_method: 'bank_transfer',
      notes: `دفعة أولى تحويل مصرفي${DEMO_TAG}`
    });
  }

  if (d4.debt) {
    recordPayment({
      debt_id: d4.debt.id,
      amount: 500,
      payment_method: 'cash',
      notes: `سداد كامل نقدًا${DEMO_TAG}`
    });
  }

  logAudit('SEED_DEMO_DATA', 'setting', undefined, { note: 'Demo data successfully seeded' });
  return { success: true };
}

export function purgeDemoData(): { success: boolean; count: number; message?: string } {
  const db = getDatabase();

  let count = 0;
  const purgeTx = db.transaction(() => {
    // 1. Delete payments related to demo debts or containing tag
    const demoPayments = db.prepare(`
      SELECT p.id FROM payments p
      JOIN debts d ON p.debt_id = d.id
      WHERE d.description LIKE ? OR p.notes LIKE ?
    `).all(`%${DEMO_TAG}%`, `%${DEMO_TAG}%`) as { id: string }[];

    for (const p of demoPayments) {
      db.prepare('DELETE FROM payments WHERE id = ?').run(p.id);
      count++;
    }

    // 2. Delete demo debts
    const demoDebts = db.prepare('SELECT id FROM debts WHERE description LIKE ? OR notes LIKE ?')
      .all(`%${DEMO_TAG}%`, `%${DEMO_TAG}%`) as { id: string }[];

    for (const d of demoDebts) {
      db.prepare('DELETE FROM debts WHERE id = ?').run(d.id);
      count++;
    }

    // 3. Delete demo contacts
    const demoContacts = db.prepare('SELECT id FROM contacts WHERE name LIKE ?')
      .all(`%${DEMO_TAG}%`) as { id: string }[];

    for (const c of demoContacts) {
      db.prepare('DELETE FROM contacts WHERE id = ?').run(c.id);
      count++;
    }

    logAudit('PURGE_DEMO_DATA', 'setting', undefined, { deletedRecords: count });
  });

  purgeTx();
  return { success: true, count };
}

export function hasDemoData(): boolean {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) as c FROM contacts WHERE name LIKE ?').get(`%${DEMO_TAG}%`) as { c: number };
  return row.c > 0;
}
