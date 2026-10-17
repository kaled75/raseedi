import { getDatabase, checkDatabaseIntegrity } from '../db';
import { AuditLog } from '../db/types';
import { logAudit } from './authService';

export function getSettings(): Record<string, string> {
  const db = getDatabase();
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

export function updateSetting(key: string, value: string): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at) 
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value);

  logAudit('UPDATE_SETTINGS', 'setting', key, { value });
}

export function updateSettings(settings: Record<string, string>): void {
  const db = getDatabase();
  const updateTx = db.transaction(() => {
    const stmt = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at) 
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    for (const [k, v] of Object.entries(settings)) {
      stmt.run(k, String(v));
    }
    logAudit('UPDATE_SETTINGS', 'setting', undefined, { updatedKeys: Object.keys(settings) });
  });
  updateTx();
}

export function getAuditLogs(limit = 100): AuditLog[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditLog[];
}

export function resetSettingsToDefaults(): void {
  const defaultSettings: Record<string, string> = {
    app_name: 'رَصيدي',
    owner_name: '',
    currency: 'LYD',
    currency_decimals: '2',
    currency_symbol_position: 'after',
    theme: 'light',
    language: 'ar',
    lock_timeout_minutes: '15',
    privacy_hide_balances: '0',
    auto_backup_enabled: '1',
    report_default_footer: 'تقرير مالي صادر من تطبيق رَصيدي لإدارة الديون الشخصية'
  };

  updateSettings(defaultSettings);
}

export function resetAllData(): { success: boolean; message?: string } {
  const db = getDatabase();

  const resetTx = db.transaction(() => {
    // 1. Delete all payments
    db.prepare('DELETE FROM payments').run();
    // 2. Delete all debts
    db.prepare('DELETE FROM debts').run();
    // 3. Delete all contacts
    db.prepare('DELETE FROM contacts').run();
    // 4. Delete audit logs
    db.prepare('DELETE FROM audit_logs').run();
    // 5. Reset app settings to defaults
    resetSettingsToDefaults();
  });

  try {
    resetTx();
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل تصفير قاعدة البيانات بالكامل' };
  }
}
