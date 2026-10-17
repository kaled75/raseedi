import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations';

let dbInstance: Database.Database | null = null;
let currentDbPath: string = '';

export function getDatabasePath(): string {
  if (currentDbPath) return currentDbPath;

  let baseDir = '';
  try {
    if (process.versions && (process.versions as any).electron) {
      const electron = require('electron');
      if (electron && electron.app && typeof electron.app.getPath === 'function') {
        baseDir = electron.app.getPath('userData');
      }
    }
  } catch (e) {
    // Fallback if not inside running electron main yet
  }

  if (!baseDir) {
    baseDir = path.resolve(process.cwd(), 'data');
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
  dbInstance.pragma('synchronous = NORMAL');

  // Run migrations
  runMigrations(dbInstance);

  return dbInstance;
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
