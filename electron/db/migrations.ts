import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db: Database.Database) => {
      // 1. Schema migrations table
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);

      // 2. Application settings
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 3. Local Authentication
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_auth (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          hint TEXT,
          is_configured INTEGER DEFAULT 0,
          failed_attempts INTEGER DEFAULT 0,
          locked_until TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 4. Contacts (الأشخاص)
      db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          avatar TEXT,
          notes TEXT,
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
        CREATE INDEX IF NOT EXISTS idx_contacts_archived ON contacts(is_archived);
      `);

      // 5. Debts (الديون)
      db.exec(`
        CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY,
          reference_no TEXT UNIQUE NOT NULL,
          contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
          type TEXT NOT NULL CHECK(type IN ('for_me', 'on_me')),
          original_amount REAL NOT NULL CHECK(original_amount > 0),
          currency TEXT NOT NULL DEFAULT 'LYD',
          created_date TEXT NOT NULL,
          due_date TEXT,
          description TEXT NOT NULL,
          recording_method TEXT DEFAULT 'manual',
          notes TEXT,
          status TEXT NOT NULL CHECK(status IN ('open', 'partially_paid', 'overdue', 'fully_paid', 'cancelled')),
          is_archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_debts_contact ON debts(contact_id);
        CREATE INDEX IF NOT EXISTS idx_debts_type ON debts(type);
        CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
        CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
        CREATE INDEX IF NOT EXISTS idx_debts_ref ON debts(reference_no);
      `);

      // 6. Payments (المدفوعات)
      db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          receipt_no TEXT UNIQUE NOT NULL,
          debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE RESTRICT,
          contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
          amount REAL NOT NULL CHECK(amount > 0),
          payment_date TEXT NOT NULL,
          payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'check', 'other')),
          reference_no TEXT,
          notes TEXT,
          previous_balance REAL NOT NULL,
          new_balance REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'valid' CHECK(status IN ('valid', 'cancelled')),
          cancellation_reason TEXT,
          cancelled_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_payments_debt ON payments(debt_id);
        CREATE INDEX IF NOT EXISTS idx_payments_contact ON payments(contact_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
      `);

      // 7. Audit Logs (سجل التدقيق)
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          details TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      `);

      // 8. Reminders (التذكيرات)
      db.exec(`
        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY,
          debt_id TEXT REFERENCES debts(id) ON DELETE CASCADE,
          reminder_date TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_dismissed INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // Seed default settings
      const defaultSettings = [
        { key: 'app_name', value: 'رَصيدي' },
        { key: 'owner_name', value: '' },
        { key: 'currency', value: 'LYD' },
        { key: 'currency_decimals', value: '2' },
        { key: 'currency_symbol_position', value: 'after' }, // 'before' | 'after'
        { key: 'theme', value: 'light' }, // default light mode as requested
        { key: 'language', value: 'ar' },
        { key: 'lock_timeout_minutes', value: '15' },
        { key: 'privacy_hide_balances', value: '0' },
        { key: 'backup_dir', value: '' },
        { key: 'auto_backup_enabled', value: '1' },
        { key: 'report_default_footer', value: 'تقرير مالي صادر من تطبيق رَصيدي لإدارة الديون الشخصية' }
      ];

      const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO app_settings (key, value, updated_at) 
        VALUES (@key, @value, datetime('now'))
      `);

      for (const s of defaultSettings) {
        insertSetting.run(s);
      }
    }
  }
];

export function runMigrations(db: Database.Database): void {
  // Ensure foreign keys are enabled
  db.pragma('foreign_keys = ON');

  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC').all() as { version: number }[];
  const appliedVersions = new Set(appliedRows.map(r => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      const applyTx = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime(\'now\'))')
          .run(migration.version, migration.name);
      });
      applyTx();
    }
  }
}
