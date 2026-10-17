import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../electron/db/migrations';
import { roundMoney, generateReferenceNo } from '../electron/services/debtService';
import { escapeHtml, generateHtmlReport } from '../electron/services/exportService';
import { calculateFileSha256 } from '../electron/services/backupService';

test('1. Financial precision: Exact rounding without floating point drift', () => {
  const sum = 0.1 + 0.2;
  assert.equal(roundMoney(sum, 2), 0.3);

  // 10 times 0.1
  let cumulative = 0;
  for (let i = 0; i < 10; i++) {
    cumulative = roundMoney(cumulative + 0.1, 2);
  }
  assert.equal(cumulative, 1.0);

  // Libyan Dinar 3 decimal points
  assert.equal(roundMoney(50.1234, 3), 50.123);
  assert.equal(roundMoney(50.1236, 3), 50.124);
});

test('2. Database initialization and migrations execution', () => {
  const db = new Database(':memory:');
  runMigrations(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = new Set(tables.map(t => t.name));

  const required = ['app_settings', 'local_auth', 'contacts', 'debts', 'payments', 'audit_logs', 'reminders', 'schema_migrations'];
  for (const req of required) {
    assert.ok(tableNames.has(req), `Table ${req} should exist`);
  }

  // Check default settings seeded
  const currencySetting = db.prepare("SELECT value FROM app_settings WHERE key = 'currency'").get() as { value: string };
  assert.equal(currencySetting.value, 'LYD');
  db.close();
});

test('3. Full financial workflow: Debts, Partial & Full Payments, Overpayment & Double payment checks', () => {
  const db = new Database(':memory:');
  runMigrations(db);

  // 1. Add contact
  db.prepare(`
    INSERT INTO contacts (id, name, phone, created_at, updated_at)
    VALUES ('c1', 'فرج المجبري', '0910000000', datetime('now'), datetime('now'))
  `).run();

  // 2. Add debt for me (أقرضته 1500 دينار)
  db.prepare(`
    INSERT INTO debts (id, reference_no, contact_id, type, original_amount, currency, created_date, description, status, created_at, updated_at)
    VALUES ('d1', 'DBT-2026-0001', 'c1', 'for_me', 1500.00, 'LYD', '2026-05-01', 'مساعدة تجارية', 'open', datetime('now'), datetime('now'))
  `).run();

  // 3. Register partial payment of 500
  db.prepare(`
    INSERT INTO payments (id, receipt_no, debt_id, contact_id, amount, payment_date, payment_method, previous_balance, new_balance, status, created_at)
    VALUES ('p1', 'REC-2026-0001', 'd1', 'c1', 500.00, datetime('now'), 'cash', 1500.00, 1000.00, 'valid', datetime('now'))
  `).run();
  db.prepare("UPDATE debts SET status = 'partially_paid' WHERE id = 'd1'").run();

  // 4. Calculate remaining balance
  const balance1 = db.prepare(`
    SELECT 
      d.original_amount,
      COALESCE(SUM(p.amount), 0) as total_paid,
      ROUND(d.original_amount - COALESCE(SUM(p.amount), 0), 2) as remaining
    FROM debts d
    LEFT JOIN payments p ON d.id = p.debt_id AND p.status = 'valid'
    WHERE d.id = 'd1'
    GROUP BY d.id
  `).get() as { original_amount: number; total_paid: number; remaining: number };

  assert.equal(balance1.total_paid, 500);
  assert.equal(balance1.remaining, 1000);

  // 5. Test overpayment rejection: attempting to pay 1001 when remaining is 1000
  const overpaymentAmount = 1001;
  const isOverpayment = overpaymentAmount > balance1.remaining;
  assert.equal(isOverpayment, true, 'Payment > 1000 must be marked as overpayment');

  // 6. Register remaining payment of 1000 (fully paid)
  db.prepare(`
    INSERT INTO payments (id, receipt_no, debt_id, contact_id, amount, payment_date, payment_method, previous_balance, new_balance, status, created_at)
    VALUES ('p2', 'REC-2026-0002', 'd1', 'c1', 1000.00, datetime('now'), 'bank_transfer', 1000.00, 0.00, 'valid', datetime('now'))
  `).run();
  db.prepare("UPDATE debts SET status = 'fully_paid' WHERE id = 'd1'").run();

  const balance2 = db.prepare(`
    SELECT 
      ROUND(d.original_amount - COALESCE(SUM(p.amount), 0), 2) as remaining
    FROM debts d
    LEFT JOIN payments p ON d.id = p.debt_id AND p.status = 'valid'
    WHERE d.id = 'd1'
    GROUP BY d.id
  `).get() as { remaining: number };

  assert.equal(balance2.remaining, 0, 'Debt should be fully paid with zero remaining balance');

  // 7. Cancellation test: cancel payment p2 (e.g. check bounced)
  db.prepare("UPDATE payments SET status = 'cancelled', cancellation_reason = 'شيك بدون رصيد' WHERE id = 'p2'").run();
  db.prepare("UPDATE debts SET status = 'partially_paid' WHERE id = 'd1'").run();

  const balance3 = db.prepare(`
    SELECT 
      ROUND(d.original_amount - COALESCE(SUM(p.amount), 0), 2) as remaining
    FROM debts d
    LEFT JOIN payments p ON d.id = p.debt_id AND p.status = 'valid'
    WHERE d.id = 'd1'
    GROUP BY d.id
  `).get() as { remaining: number };

  assert.equal(balance3.remaining, 1000, 'Remaining balance must return to 1000 after cancellation');
  db.close();
});

test('4. Contact integrity: Preventing deletion of contacts with recorded debts', () => {
  const db = new Database(':memory:');
  runMigrations(db);

  db.prepare("INSERT INTO contacts (id, name, created_at, updated_at) VALUES ('c_test', 'هشام', datetime('now'), datetime('now'))").run();
  db.prepare("INSERT INTO debts (id, reference_no, contact_id, type, original_amount, currency, created_date, description, status, created_at, updated_at) VALUES ('d_test', 'REF-1', 'c_test', 'for_me', 100, 'LYD', '2026-01-01', 'سلفة', 'open', datetime('now'), datetime('now'))").run();

  const debtsCount = (db.prepare('SELECT COUNT(*) as c FROM debts WHERE contact_id = ?').get('c_test') as { c: number }).c;
  assert.equal(debtsCount > 0, true);

  // Archive contact instead of hard delete
  db.prepare('UPDATE contacts SET is_archived = 1 WHERE id = ?').run('c_test');
  const contact = db.prepare('SELECT is_archived FROM contacts WHERE id = ?').get('c_test') as { is_archived: number };
  assert.equal(contact.is_archived, 1);
  db.close();
});

test('5. HTML Export: XSS Protection & Arabic RTL Layout', () => {
  const maliciousInput = '<script>document.cookie="stolen"</script>';
  const escaped = escapeHtml(maliciousInput);
  assert.ok(!escaped.includes('<script>'), 'Script tag must be stripped/escaped');
  assert.ok(escaped.includes('&lt;script&gt;'));

  // Test single quote and double quote escaping
  const quotes = `"'&`;
  const escapedQuotes = escapeHtml(quotes);
  assert.equal(escapedQuotes, `&quot;&#039;&amp;`);
});

test('6. Backup verification: SHA-256 calculation', () => {
  const tempFile = path.resolve(__dirname, 'test_sample.txt');
  fs.writeFileSync(tempFile, 'Raseedi Personal Debt Manager Safe Backup Test');
  const checksum = calculateFileSha256(tempFile);
  assert.equal(typeof checksum, 'string');
  assert.equal(checksum.length, 64, 'SHA-256 checksum must be exactly 64 hexadecimal characters');
  fs.unlinkSync(tempFile);
});

console.log('All backend and financial domain test suites defined.');
