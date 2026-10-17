import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipc/channels';

export const api = {
  // Auth
  getAuthStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_STATUS),
  setupPassword: (password: string, hint?: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_SETUP, { password, hint }),
  verifyPassword: (password: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_VERIFY, { password }),
  changePassword: (currentPassword: string, newPassword: string, hint?: string) => 
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, { currentPassword, newPassword, hint }),
  dismissInitialSetup: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_DISMISS_INITIAL_SETUP),
  removePassword: (currentPassword: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_REMOVE_PASSWORD, { currentPassword }),

  // Contacts
  getContacts: (filter?: any) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_GET_ALL, filter),
  getContactById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_GET_BY_ID, id),
  createContact: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_CREATE, data),
  updateContact: (id: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_UPDATE, { id, data }),
  archiveContact: (id: string, archive = true) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_ARCHIVE, { id, archive }),
  deleteContact: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_DELETE, id),
  getContactStatement: (contactId: string) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_GET_STATEMENT, contactId),

  // Debts
  getDebts: (filter?: any) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_GET_ALL, filter),
  getDebtById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_GET_BY_ID, id),
  createDebt: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_CREATE, data),
  updateDebt: (id: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_UPDATE, { id, data }),
  cancelDebt: (id: string, reason: string) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_CANCEL, { id, reason }),
  archiveDebt: (id: string, archive = true) => ipcRenderer.invoke(IPC_CHANNELS.DEBTS_ARCHIVE, { id, archive }),

  // Payments
  getPayments: (filter?: any) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_GET_ALL, filter),
  recordPayment: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_RECORD, data),
  cancelPayment: (paymentId: string, reason: string) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_CANCEL, { paymentId, reason }),
  getReceiptHtml: (paymentId: string) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENTS_GET_RECEIPT_HTML, paymentId),

  // Reports
  getDashboardStats: () => ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_DASHBOARD),
  getMonthlyTrends: (monthsCount = 6) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_MONTHLY_TRENDS, monthsCount),
  getStatusBreakdown: () => ipcRenderer.invoke(IPC_CHANNELS.REPORTS_GET_STATUS_BREAKDOWN),

  // Exports
  selectSaveFilePath: (options: { defaultName: string; extension: string; title?: string }) => 
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SELECT_FILE_PATH, options),
  selectExportDirPath: (options?: { title?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SELECT_DIR_PATH, options || {}),
  exportHtml: (filePath: string, options: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_HTML, { filePath, options }),
  exportCsv: (filePath: string, type: 'debts' | 'payments' | 'contacts') => 
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CSV, { filePath, type }),
  exportXlsx: (filePath: string) => 
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_XLSX, { filePath }),

  // Backup & Restore
  createBackup: (targetDestination?: string) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE, targetDestination),
  selectBackupSavePath: (options?: { defaultName?: string }) => 
    ipcRenderer.invoke(IPC_CHANNELS.BACKUP_SELECT_SAVE_PATH, options || {}),
  selectBackupDirPath: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_SELECT_DIR_PATH),
  selectBackupFile: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_SELECT_FILE),
  inspectBackup: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_INSPECT, filePath),
  restoreBackup: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE, filePath),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  updateSettings: (settings: Record<string, string>) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET),
  resetAllData: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET_ALL_DATA),
  checkDatabaseIntegrity: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_CHECK_INTEGRITY),
  getAuditLogs: (limit = 100) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_AUDIT_LOGS, limit),

  // Demo
  seedDemoData: () => ipcRenderer.invoke(IPC_CHANNELS.DEMO_SEED),
  purgeDemoData: () => ipcRenderer.invoke(IPC_CHANNELS.DEMO_PURGE),
  getDemoStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DEMO_STATUS),

  // Window Controls
  minimize: () => ipcRenderer.invoke(IPC_CHANNELS.APP_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC_CHANNELS.APP_MAXIMIZE),
  close: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CLOSE),
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url)
};

contextBridge.exposeInMainWorld('api', api);
