import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { getDatabase, getDatabasePath, closeDatabase, initDatabase } from '../db';
import { logAudit } from './authService';

export interface BackupMetadata {
  version: string;
  appVersion: string;
  createdAt: string;
  checksumSha256: string;
  contactsCount: number;
  debtsCount: number;
  paymentsCount: number;
}

export function calculateFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export function createBackup(targetDestination?: string): { success: boolean; backupPath?: string; metadata?: BackupMetadata; message?: string } {
  try {
    const db = getDatabase();
    const dbPath = getDatabasePath();

    let backupPath = '';
    let metaPath = '';

    if (targetDestination) {
      // Check if targetDestination is an explicit file path (ends with .sqlite3, .db, etc.)
      const isFile = targetDestination.endsWith('.sqlite3') || targetDestination.endsWith('.db');
      if (isFile) {
        backupPath = targetDestination;
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        metaPath = backupPath.replace(/(\.sqlite3|\.db)$/, '') + '.meta.json';
      } else {
        // It's a directory
        if (!fs.existsSync(targetDestination)) {
          fs.mkdirSync(targetDestination, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `raseedi-backup-${timestamp}.sqlite3`;
        const metaFilename = `raseedi-backup-${timestamp}.meta.json`;
        backupPath = path.join(targetDestination, backupFilename);
        metaPath = path.join(targetDestination, metaFilename);
      }
    } else {
      // Default backup directory in backups folder
      const backupDir = path.join(path.dirname(dbPath), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `raseedi-backup-${timestamp}.sqlite3`;
      const metaFilename = `raseedi-backup-${timestamp}.meta.json`;
      backupPath = path.join(backupDir, backupFilename);
      metaPath = path.join(backupDir, metaFilename);
    }

    // Use SQLite VACUUM INTO for a completely consistent, atomic snapshot
    db.prepare(`VACUUM INTO ?`).run(backupPath);

    // Verify backup file was created
    if (!fs.existsSync(backupPath)) {
      return { success: false, message: 'فشل إنشاء ملف النسخة الاحتياطية' };
    }

    // Calculate SHA-256
    const checksum = calculateFileSha256(backupPath);

    // Collect record counts
    const contactsCount = (db.prepare('SELECT COUNT(*) as c FROM contacts').get() as { c: number }).c;
    const debtsCount = (db.prepare('SELECT COUNT(*) as c FROM debts').get() as { c: number }).c;
    const paymentsCount = (db.prepare('SELECT COUNT(*) as c FROM payments').get() as { c: number }).c;

    const metadata: BackupMetadata = {
      version: '1.0',
      appVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      checksumSha256: checksum,
      contactsCount,
      debtsCount,
      paymentsCount
    };

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    logAudit('BACKUP_CREATE', 'backup', undefined, { backupPath, checksum });

    return { success: true, backupPath, metadata };
  } catch (err: any) {
    return { success: false, message: err?.message || 'فشل إنشاء النسخة الاحتياطية' };
  }
}

export function inspectBackupFile(filePath: string): { 
  valid: boolean; 
  metadata?: BackupMetadata; 
  integrityOk?: boolean;
  message?: string;
} {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, message: 'ملف النسخة الاحتياطية غير موجود' };
    }

    // Test if file is a valid SQLite database
    let testDb: Database.Database | null = null;
    try {
      testDb = new Database(filePath, { readonly: true });
      const pragma = testDb.prepare('PRAGMA integrity_check').all() as { integrity_check: string }[];
      if (!pragma || pragma.length === 0 || pragma[0].integrity_check !== 'ok') {
        testDb.close();
        return { valid: false, message: 'ملف النسخة الاحتياطية تالف أو ليس قاعدة بيانات SQLite سليمة' };
      }

      // Check required tables
      const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const tableNames = new Set(tables.map(t => t.name));
      const required = ['contacts', 'debts', 'payments', 'app_settings'];
      const hasAll = required.every(t => tableNames.has(t));
      if (!hasAll) {
        testDb.close();
        return { valid: false, message: 'ملف النسخة الاحتياطية لا يحتوي على جداول تطبيق رَصيدي الأساسية' };
      }

      const contactsCount = (testDb.prepare('SELECT COUNT(*) as c FROM contacts').get() as { c: number }).c;
      const debtsCount = (testDb.prepare('SELECT COUNT(*) as c FROM debts').get() as { c: number }).c;
      const paymentsCount = (testDb.prepare('SELECT COUNT(*) as c FROM payments').get() as { c: number }).c;

      testDb.close();

      const checksum = calculateFileSha256(filePath);
      const metaPath = filePath.replace(/\.sqlite3$/, '.meta.json');
      let storedMeta: BackupMetadata | undefined;

      if (fs.existsSync(metaPath)) {
        try {
          storedMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch (e) {
          // ignore corrupted meta
        }
      }

      const metadata: BackupMetadata = storedMeta || {
        version: '1.0',
        appVersion: '1.0.0',
        createdAt: fs.statSync(filePath).mtime.toISOString(),
        checksumSha256: checksum,
        contactsCount,
        debtsCount,
        paymentsCount
      };

      return {
        valid: true,
        integrityOk: true,
        metadata
      };
    } catch (dbErr: any) {
      if (testDb) {
        try { testDb.close(); } catch (e) {}
      }
      return { valid: false, message: `تعذر فتح الملف كقاعدة بيانات: ${dbErr?.message}` };
    }
  } catch (err: any) {
    return { valid: false, message: err?.message || 'خطأ أثناء فحص الملف' };
  }
}

export function restoreBackup(filePath: string): { success: boolean; message?: string } {
  const inspect = inspectBackupFile(filePath);
  if (!inspect.valid) {
    return { success: false, message: inspect.message || 'الملف غير صالح للاستعادة' };
  }

  const currentDbPath = getDatabasePath();

  try {
    // 1. Create automatic emergency backup of current DB before overwriting!
    createBackup();

    // 2. Close current database
    closeDatabase();

    // 3. Copy backup file over current DB file
    fs.copyFileSync(filePath, currentDbPath);

    // Remove any leftover WAL/SHM files to prevent inconsistency
    const walPath = `${currentDbPath}-wal`;
    const shmPath = `${currentDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // 4. Re-initialize database
    const newDb = initDatabase(currentDbPath);

    logAudit('BACKUP_RESTORE', 'backup', undefined, { restoredFrom: filePath });

    return { success: true };
  } catch (err: any) {
    // Try to recover
    initDatabase(currentDbPath);
    return { success: false, message: `فشلت الاستعادة: ${err?.message}` };
  }
}
