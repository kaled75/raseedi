import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations';

let dbInstance: Database.Database | null = null;
let currentDbPath: string = '';

export function getDatabasePath(): string {
  if (currentDbPath) return currentDbPath;

  let baseDir = '';

  // 1. If running as portable and a local data directory exists next to the exe
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const localData = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
    if (fs.existsSync(localData)) {
      baseDir = localData;
    }
  }

  // 2. Electron userData path
  if (!baseDir) {
    try {
      if (process.versions && (process.versions as any).electron) {
        const electron = require('electron');
        const app = electron.app || (electron.remote && electron.remote.app);
        if (app && typeof app.getPath === 'function') {
          baseDir = app.getPath('userData');
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // 3. Windows permanent AppData fallback - ALWAYS permanent across restarts and portable runs
  if (!baseDir) {
    const userProfile = process.env.USERPROFILE || (process.env.HOMEDRIVE && process.env.HOMEPATH ? `${process.env.HOMEDRIVE}${process.env.HOMEPATH}` : '');
    if (userProfile) {
      baseDir = path.join(userProfile, 'AppData', 'Roaming', 'رَصيدي - Raseedi');
    } else if (process.env.APPDATA) {
      baseDir = path.join(process.env.APPDATA, 'رَصيدي - Raseedi');
    } else {
      baseDir = path.resolve(process.cwd(), 'data');
    }
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  currentDbPath = path.join(baseDir, 'raseedi.sqlite3');
  return currentDbPath;
}

export function initDatabase(customPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = customPath || getDatabasePath();
  currentDbPath = dbPath;

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
  });

  // Optimize SQLite
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = FULL');

  // Run migrations
  runMigrations(dbInstance);

  return dbInstance;
}

export function checkpointDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      console.error('Error checkpointing database:', e);
    }
  }
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)');
      dbInstance.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
    dbInstance = null;
  }
}

export function checkDatabaseIntegrity(): { ok: boolean; message: string } {
  try {
    const db = getDatabase();
    const rows = db.prepare('PRAGMA integrity_check').all() as { integrity_check: string }[];
    const isOk = rows.length === 1 && rows[0].integrity_check === 'ok';
    return {
      ok: isOk,
      message: isOk ? 'قاعدة البيانات سليمة ولا توجد أية أخطاء بنوية' : rows.map(r => r.integrity_check).join('; ')
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'فشل فحص سلامة قاعدة البيانات'
    };
  }
}
