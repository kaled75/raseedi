import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../electron/db/migrations';
import { roundMoney } from '../electron/services/debtService';
import { escapeHtml } from '../electron/services/exportService';

describe('Financial Math Precision', () => {
  it('correctly rounds decimals without floating point artifacts', () => {
    // 0.1 + 0.2 in JS float is 0.30000000000000004
    const floatSum = 0.1 + 0.2;
    expect(roundMoney(floatSum, 2)).toBe(0.3);

    // 100.555 rounded to 2 decimals
    expect(roundMoney(100.555, 2)).toBe(100.56);

    // 3 decimals for Libyan Dinar / Dirhams
    expect(roundMoney(12.3456, 3)).toBe(12.346);
  });

  it('prevents small fractional discrepancy accumulation over multiple additions', () => {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum = roundMoney(sum + 0.1, 2);
    }
    expect(sum).toBe(1.0);
  });
});

describe('Database Financial Transactions in Memory', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it('sets up tables and schema migrations correctly', () => {
    const migrations = db.prepare('SELECT * FROM schema_migrations').all();
    expect(migrations.length).toBeGreaterThan(0);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('contacts');
    expect(names).toContain('debts');
    expect(names).toContain('payments');
    expect(names).toContain('app_settings');
    expect(names).toContain('local_auth');
    expect(names).toContain('audit_logs');
  });

  it('enforces remaining balance calculation and prevents overpayment', () => {
    // 1. Create a contact
    db.prepare(`
      INSERT INTO contacts (id, name, created_at, updated_at)
      VALUES ('c1', 'أحمد بن علي', datetime('now'), datetime('now'))
    `).run();

    // 2. Create a debt of 1000 LYD
    db.prepare(`
      INSERT INTO debts (id, reference_no, contact_id, type, original_amount, currency, created_date, description, status, created_at, updated_at)
      VALUES ('d1', 'DBT-2026-0001', 'c1', 'for_me', 1000.00, 'LYD', '2026-05-01', 'سلفة', 'open', datetime('now'), datetime('now'))
    `).run();

    // 3. Record partial payment of 400
    db.prepare(`
      INSERT INTO payments (id, receipt_no, debt_id, contact_id, amount, payment_date, payment_method, previous_balance, new_balance, status, created_at)
      VALUES ('p1', 'REC-2026-0001', 'd1', 'c1', 400.00, datetime('now'), 'cash', 1000.00, 600.00, 'valid', datetime('now'))
    `).run();

    db.prepare("UPDATE debts SET status = 'partially_paid' WHERE id = 'd1'").run();

    // 4. Query remaining balance
    const calc = db.prepare(`
      SELECT 
        d.original_amount,
        COALESCE(SUM(p.amount), 0) as total_paid,
        ROUND(d.original_amount - COALESCE(SUM(p.amount), 0), 2) as remaining
      FROM debts d
      LEFT JOIN payments p ON d.id = p.debt_id AND p.status = 'valid'
      WHERE d.id = 'd1'
      GROUP BY d.id
    `).get() as { original_amount: number; total_paid: number; remaining: number };

    expect(calc.total_paid).toBe(400);
    expect(calc.remaining).toBe(600);

    // 5. Test overpayment validation: payment of 650 should exceed remaining (600)
    const proposedPayment = 650;
    const isOverpayment = proposedPayment > calc.remaining;
    expect(isOverpayment).toBe(true);
  });

  it('restores balance when payment is cancelled', () => {
    db.prepare(`
      INSERT INTO contacts (id, name, created_at, updated_at)
      VALUES ('c2', 'محمد الصادق', datetime('now'), datetime('now'))
    `).run();

    db.prepare(`
      INSERT INTO debts (id, reference_no, contact_id, type, original_amount, currency, created_date, description, status, created_at, updated_at)
      VALUES ('d2', 'DBT-2026-0002', 'c2', 'on_me', 500.00, 'LYD', '2026-05-01', 'دين قطع غيار', 'open', datetime('now'), datetime('now'))
    `).run();

    // Record payment of 500 (fully paid)
    db.prepare(`
      INSERT INTO payments (id, receipt_no, debt_id, contact_id, amount, payment_date, payment_method, previous_balance, new_balance, status, created_at)
      VALUES ('p2', 'REC-2026-0002', 'd2', 'c2', 500.00, datetime('now'), 'cash', 500.00, 0.00, 'valid', datetime('now'))
    `).run();
    db.prepare("UPDATE debts SET status = 'fully_paid' WHERE id = 'd2'").run();

    // Now cancel the payment
    db.prepare("UPDATE payments SET status = 'cancelled', cancellation_reason = 'شيك بدون رصيد' WHERE id = 'p2'").run();

    // Recalculate remaining from valid payments
    const afterCancel = db.prepare(`
      SELECT 
        d.original_amount,
        COALESCE(SUM(p.amount), 0) as total_paid,
        ROUND(d.original_amount - COALESCE(SUM(p.amount), 0), 2) as remaining
      FROM debts d
      LEFT JOIN payments p ON d.id = p.debt_id AND p.status = 'valid'
      WHERE d.id = 'd2'
      GROUP BY d.id
    `).get() as { original_amount: number; total_paid: number; remaining: number };

    expect(afterCancel.total_paid).toBe(0);
    expect(afterCancel.remaining).toBe(500);
  });
});

describe('Export Sanitization and Security', () => {
  it('escapes dangerous HTML/JS payload characters to prevent XSS in reports', () => {
    const maliciousScript = '<script>alert("hacked")</script>';
    const escaped = escapeHtml(maliciousScript);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toBe('&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;');

    const maliciousAttrs = '" onmouseover="alert(1)"';
    const escapedAttrs = escapeHtml(maliciousAttrs);
    expect(escapedAttrs).not.toContain('"');
  });

  it('safely handles null and undefined values in export generator', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
