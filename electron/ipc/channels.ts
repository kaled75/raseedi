export const IPC_CHANNELS = {
  // Auth
  AUTH_GET_STATUS: 'auth:get-status',
  AUTH_SETUP: 'auth:setup',
  AUTH_VERIFY: 'auth:verify',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',
  AUTH_DISMISS_INITIAL_SETUP: 'auth:dismiss-initial-setup',
  AUTH_REMOVE_PASSWORD: 'auth:remove-password',

  // Contacts
  CONTACTS_GET_ALL: 'contacts:get-all',
  CONTACTS_GET_BY_ID: 'contacts:get-by-id',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_ARCHIVE: 'contacts:archive',
  CONTACTS_DELETE: 'contacts:delete',
  CONTACTS_GET_STATEMENT: 'contacts:get-statement',

  // Debts
  DEBTS_GET_ALL: 'debts:get-all',
  DEBTS_GET_BY_ID: 'debts:get-by-id',
  DEBTS_CREATE: 'debts:create',
  DEBTS_UPDATE: 'debts:update',
  DEBTS_CANCEL: 'debts:cancel',
  DEBTS_ARCHIVE: 'debts:archive',

  // Payments
  PAYMENTS_GET_ALL: 'payments:get-all',
  PAYMENTS_RECORD: 'payments:record',
  PAYMENTS_CANCEL: 'payments:cancel',
  PAYMENTS_GET_RECEIPT_HTML: 'payments:get-receipt-html',

  // Reports & Analytics
  REPORTS_GET_DASHBOARD: 'reports:get-dashboard',
  REPORTS_GET_MONTHLY_TRENDS: 'reports:get-monthly-trends',
  REPORTS_GET_STATUS_BREAKDOWN: 'reports:get-status-breakdown',

  // Exports
  EXPORT_HTML: 'export:html',
  EXPORT_CSV: 'export:csv',
  EXPORT_XLSX: 'export:xlsx',
  EXPORT_SELECT_FILE_PATH: 'export:select-file-path',
  EXPORT_SELECT_DIR_PATH: 'export:select-dir-path',

  // Backup & Restore
  BACKUP_CREATE: 'backup:create',
  BACKUP_INSPECT: 'backup:inspect',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_SELECT_FILE: 'backup:select-file',
  BACKUP_SELECT_SAVE_PATH: 'backup:select-save-path',
  BACKUP_SELECT_DIR_PATH: 'backup:select-dir-path',

  // Settings & Maintenance
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_RESET: 'settings:reset',
  SETTINGS_RESET_ALL_DATA: 'settings:reset-all-data',
  SETTINGS_CHECK_INTEGRITY: 'settings:check-integrity',
  SETTINGS_GET_AUDIT_LOGS: 'settings:get-audit-logs',

  // Demo Data
  DEMO_SEED: 'demo:seed',
  DEMO_PURGE: 'demo:purge',
  DEMO_STATUS: 'demo:status',

  // App & Window
  APP_MINIMIZE: 'app:minimize',
  APP_MAXIMIZE: 'app:maximize',
  APP_CLOSE: 'app:close',
  APP_GET_VERSION: 'app:get-version',
  APP_OPEN_EXTERNAL: 'app:open-external'
} as const;
