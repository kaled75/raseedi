import crypto from 'crypto';
import { getDatabase } from '../db';
import { AuditLog, LocalAuth } from '../db/types';

const PBKDF2_ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex');
}

export function logAudit(action: AuditLog['action'], entityType: string, entityId: string | undefined, details: any): void {
  try {
    const db = getDatabase();
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(id, action, entityType, entityId || null, JSON.stringify(details));
  } catch (e) {
    console.error('Failed to log audit event:', e);
  }
}

export function getAuthStatus(): { isConfigured: boolean; isLocked: boolean; hint?: string } {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM local_auth WHERE id = 1').get() as LocalAuth | undefined;

  if (!row || !row.is_configured) {
    return { isConfigured: false, isLocked: false };
  }

  const now = new Date().toISOString();
  const isTemporarilyLocked = !!(row.locked_until && row.locked_until > now);

  return {
    isConfigured: true,
    isLocked: isTemporarilyLocked,
    hint: row.hint || undefined
  };
}

export function setupInitialPassword(password: string, hint?: string): { success: boolean; message?: string } {
  if (!password || password.length < 4) {
    return { success: false, message: 'يجب أن لا تقل كلمة المرور عن 4 أحرف أو أرقام' };
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM local_auth WHERE id = 1').get() as LocalAuth | undefined;

  if (existing && existing.is_configured) {
    return { success: false, message: 'تم إعداد كلمة المرور مسبقاً' };
  }

  const salt = crypto.randomBytes(32).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO local_auth (id, password_hash, salt, hint, is_configured, failed_attempts, created_at, updated_at)
    VALUES (1, ?, ?, ?, 1, 0, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      password_hash = excluded.password_hash,
      salt = excluded.salt,
      hint = excluded.hint,
      is_configured = 1,
      failed_attempts = 0,
      updated_at = excluded.updated_at
  `).run(passwordHash, salt, hint || null, now, now);

  logAudit('AUTH_SETUP', 'auth', '1', { hintSet: !!hint });
  return { success: true };
}

export function verifyPassword(password: string): { success: boolean; message?: string } {
  if (!password) {
    return { success: false, message: 'يرجى إدخال كلمة المرور' };
  }

  const db = getDatabase();
  const row = db.prepare('SELECT * FROM local_auth WHERE id = 1').get() as LocalAuth | undefined;

  if (!row || !row.is_configured) {
    return { success: false, message: 'لم يتم إعداد كلمة مرور بعد في التطبيق' };
  }

  const now = new Date();
  if (row.locked_until && new Date(row.locked_until) > now) {
    const remainingMins = Math.ceil((new Date(row.locked_until).getTime() - now.getTime()) / 60000);
    return { 
      success: false, 
      message: `تم قفل الحساب مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMins} دقيقة.` 
    };
  }

  const computedHash = hashPassword(password, row.salt);
  let isMatch = false;
  try {
    isMatch = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(row.password_hash, 'hex'));
  } catch (e) {
    isMatch = false;
  }

  if (isMatch) {
    // Reset failed attempts
    db.prepare('UPDATE local_auth SET failed_attempts = 0, locked_until = NULL, updated_at = datetime(\'now\') WHERE id = 1').run();
    logAudit('AUTH_LOGIN', 'auth', '1', { success: true });
    return { success: true };
  } else {
    const attempts = (row.failed_attempts || 0) + 1;
    let lockUntil: string | null = null;
    if (attempts >= 5) {
      // Lock for 10 minutes
      lockUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }
    db.prepare('UPDATE local_auth SET failed_attempts = ?, locked_until = ?, updated_at = datetime(\'now\') WHERE id = 1')
      .run(attempts, lockUntil);

    logAudit('AUTH_LOGIN', 'auth', '1', { success: false, attempts });

    if (attempts >= 5) {
      return { success: false, message: 'تجاوزت الحد الأقصى للمحاولات الخاطئة. تم قفل التطبيق لمدة 10 دقائق.' };
    }
    return { success: false, message: `كلمة المرور غير صحيحة. المحاولات المتبقية: ${5 - attempts}` };
  }
}

export function changePassword(currentPass: string, newPass: string, hint?: string): { success: boolean; message?: string } {
  if (!newPass || newPass.length < 4) {
    return { success: false, message: 'كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل' };
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM local_auth WHERE id = 1').get() as LocalAuth | undefined;

  // If a password was already configured, require verifying current password
  if (existing && existing.is_configured) {
    const verify = verifyPassword(currentPass);
    if (!verify.success) {
      return { success: false, message: verify.message || 'كلمة المرور الحالية غير صحيحة' };
    }
  }

  const salt = crypto.randomBytes(32).toString('hex');
  const passwordHash = hashPassword(newPass, salt);
  const now = new Date().toISOString();

  // Robust UPSERT ensuring row exists and is_configured is set to 1
  db.prepare(`
    INSERT INTO local_auth (id, password_hash, salt, hint, is_configured, failed_attempts, created_at, updated_at)
    VALUES (1, ?, ?, ?, 1, 0, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      password_hash = excluded.password_hash,
      salt = excluded.salt,
      hint = excluded.hint,
      is_configured = 1,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = excluded.updated_at
  `).run(passwordHash, salt, hint || null, now, now);

  logAudit('AUTH_CHANGE_PASSWORD', 'auth', '1', { hintUpdated: !!hint });
  return { success: true };
}
