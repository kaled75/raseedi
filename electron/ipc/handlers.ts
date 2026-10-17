import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from './channels';
import * as authService from '../services/authService';
import * as contactService from '../services/contactService';
import * as debtService from '../services/debtService';
import * as paymentService from '../services/paymentService';
import * as reportService from '../services/reportService';
import * as exportService from '../services/exportService';
import * as backupService from '../services/backupService';
import * as settingsService from '../services/settingsService';
import * as demoDataService from '../services/demoDataService';
import { checkDatabaseIntegrity } from '../db';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Auth
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_STATUS, async () => {
    return authService.getAuthStatus();
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_SETUP, async (_, { password, hint }) => {
    return authService.setupInitialPassword(password, hint);
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_VERIFY, async (_, { password }) => {
    return authService.verifyPassword(password);
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_CHANGE_PASSWORD, async (_, { currentPassword, newPassword, hint }) => {
    return authService.changePassword(currentPassword, newPassword, hint);
  });

  // Contacts
  ipcMain.handle(IPC_CHANNELS.CONTACTS_GET_ALL, async (_, filter) => {
    return contactService.getContacts(filter);
  });

  ipcMain.handle(IPC_CHANNELS.CONTACTS_GET_BY_ID, async (_, id) => {
    return contactService.getContactById(id);
  });

  ipcMain.handle(IPC_CHANNELS.CONTACTS_CREATE, async (_, data) => {
    return contactService.createContact(data);
  });

  ipcMain.handle(IPC_CHANNELS.CONTACTS_UPDATE, async (_, { id, data }) => {
    return contactService.updateContact(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.CONTACTS_ARCHIVE, async (_, { id, archive }) => {
    return contactService.archiveContact(id, archive);
  });

  ipcMain.handle(IPC_CHANNELS.CONTACTS_DELETE, async (_, id) => {
    return contactService.deleteContact(id);
  });

  ipcMain.handle(IPC_CHANNELS.CONTACTS_GET_STATEMENT, async (_, contactId) => {
    return contactService.getContactStatement(contactId);
  });

  // Debts
  ipcMain.handle(IPC_CHANNELS.DEBTS_GET_ALL, async (_, filter) => {
    return debtService.getDebts(filter);
  });

  ipcMain.handle(IPC_CHANNELS.DEBTS_GET_BY_ID, async (_, id) => {
    return debtService.getDebtById(id);
  });

  ipcMain.handle(IPC_CHANNELS.DEBTS_CREATE, async (_, data) => {
    return debtService.createDebt(data);
  });

  ipcMain.handle(IPC_CHANNELS.DEBTS_UPDATE, async (_, { id, data }) => {
    return debtService.updateDebt(id, data);
  });

  ipcMain.handle(IPC_CHANNELS.DEBTS_CANCEL, async (_, { id, reason }) => {
    return debtService.cancelDebt(id, reason);
  });

  ipcMain.handle(IPC_CHANNELS.DEBTS_ARCHIVE, async (_, { id, archive }) => {
    return debtService.archiveDebt(id, archive);
  });

  // Payments
  ipcMain.handle(IPC_CHANNELS.PAYMENTS_GET_ALL, async (_, filter) => {
    return paymentService.getPayments(filter);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENTS_RECORD, async (_, data) => {
    return paymentService.recordPayment(data);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENTS_CANCEL, async (_, { paymentId, reason }) => {
    return paymentService.cancelPayment(paymentId, reason);
  });

  ipcMain.handle(IPC_CHANNELS.PAYMENTS_GET_RECEIPT_HTML, async (_, paymentId) => {
    return exportService.generateReceiptHtml(paymentId);
  });

  // Reports
  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_DASHBOARD, async () => {
    return reportService.getDashboardStats();
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_MONTHLY_TRENDS, async (_, monthsCount) => {
    return reportService.getMonthlyTrends(monthsCount);
  });

  ipcMain.handle(IPC_CHANNELS.REPORTS_GET_STATUS_BREAKDOWN, async () => {
    return reportService.getDebtsByStatusStats();
  });

  // Exports
  ipcMain.handle(IPC_CHANNELS.EXPORT_SELECT_FILE_PATH, async (_, { defaultName, extension, title }) => {
    const extFilters = extension === 'html' ? [{ name: 'HTML Document', extensions: ['html'] }]
      : extension === 'xlsx' ? [{ name: 'Excel Spreadsheet', extensions: ['xlsx'] }]
      : extension === 'csv' ? [{ name: 'CSV File', extensions: ['csv'] }]
      : [{ name: 'All Files', extensions: ['*'] }];

    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = win 
      ? await dialog.showSaveDialog(win, {
          title: title || 'حفظ الملف',
          defaultPath: defaultName,
          filters: extFilters
        })
      : await dialog.showSaveDialog({
          title: title || 'حفظ الملف',
          defaultPath: defaultName,
          filters: extFilters
        });

    if (res.canceled || !res.filePath) {
      return null;
    }
    return res.filePath;
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_SELECT_DIR_PATH, async (_, { title }) => {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: title || 'اختيار مجلد حفظ التقارير المصدرة',
          properties: ['openDirectory', 'createDirectory']
        })
      : await dialog.showOpenDialog({
          title: title || 'اختيار مجلد حفظ التقارير المصدرة',
          properties: ['openDirectory', 'createDirectory']
        });
    if (res.canceled || !res.filePaths || !res.filePaths[0]) {
      return null;
    }
    return res.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_HTML, async (_, { filePath, options }) => {
    return exportService.exportHtmlToFile(filePath, options);
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_CSV, async (_, { filePath, type }) => {
    return exportService.exportCsv(filePath, type);
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_XLSX, async (_, { filePath }) => {
    return exportService.exportXlsx(filePath);
  });

  // Backup & Restore
  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async (_, targetDir) => {
    return backupService.createBackup(targetDir);
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_SELECT_SAVE_PATH, async (_, { defaultName }) => {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = win
      ? await dialog.showSaveDialog(win, {
          title: 'تحديد مكان واسم ملف النسخة الاحتياطية',
          defaultPath: defaultName || `raseedi-backup-${new Date().toISOString().slice(0, 10)}.sqlite3`,
          filters: [{ name: 'SQLite Backup', extensions: ['sqlite3', 'db'] }]
        })
      : await dialog.showSaveDialog({
          title: 'تحديد مكان واسم ملف النسخة الاحتياطية',
          defaultPath: defaultName || `raseedi-backup-${new Date().toISOString().slice(0, 10)}.sqlite3`,
          filters: [{ name: 'SQLite Backup', extensions: ['sqlite3', 'db'] }]
        });
    if (res.canceled || !res.filePath) {
      return null;
    }
    return res.filePath;
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_SELECT_DIR_PATH, async () => {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: 'تحديد مجلد حفظ النسخ الاحتياطية',
          properties: ['openDirectory', 'createDirectory']
        })
      : await dialog.showOpenDialog({
          title: 'تحديد مجلد حفظ النسخ الاحتياطية',
          properties: ['openDirectory', 'createDirectory']
        });
    if (res.canceled || !res.filePaths || !res.filePaths[0]) {
      return null;
    }
    return res.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_SELECT_FILE, async () => {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: 'اختر ملف النسخة الاحتياطية',
          filters: [{ name: 'SQLite Backup', extensions: ['sqlite3', 'db'] }],
          properties: ['openFile']
        })
      : await dialog.showOpenDialog({
          title: 'اختر ملف النسخة الاحتياطية',
          filters: [{ name: 'SQLite Backup', extensions: ['sqlite3', 'db'] }],
          properties: ['openFile']
        });
    if (res.canceled || !res.filePaths || !res.filePaths[0]) {
      return null;
    }
    return res.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_INSPECT, async (_, filePath) => {
    return backupService.inspectBackupFile(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_RESTORE, async (_, filePath) => {
    return backupService.restoreBackup(filePath);
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    return settingsService.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, settings) => {
    settingsService.updateSettings(settings);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
    settingsService.resetSettingsToDefaults();
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET_ALL_DATA, async () => {
    return settingsService.resetAllData();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_CHECK_INTEGRITY, async () => {
    return checkDatabaseIntegrity();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_AUDIT_LOGS, async (_, limit) => {
    return settingsService.getAuditLogs(limit);
  });

  // Demo Data
  ipcMain.handle(IPC_CHANNELS.DEMO_SEED, async () => {
    return demoDataService.seedDemoData();
  });

  ipcMain.handle(IPC_CHANNELS.DEMO_PURGE, async () => {
    return demoDataService.purgeDemoData();
  });

  ipcMain.handle(IPC_CHANNELS.DEMO_STATUS, async () => {
    return { hasDemo: demoDataService.hasDemoData() };
  });

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.APP_MINIMIZE, () => mainWindow.minimize());
  ipcMain.handle(IPC_CHANNELS.APP_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle(IPC_CHANNELS.APP_CLOSE, () => mainWindow.close());
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => '1.0.0');
  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_, url: string) => {
    if (typeof url === 'string') {
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
          await shell.openExternal(url);
          return { success: true };
        }
      } catch {
        if (url.startsWith('mailto:')) {
          await shell.openExternal(url);
          return { success: true };
        }
      }
    }
    return { success: false, error: 'Invalid URL protocol' };
  });
}
