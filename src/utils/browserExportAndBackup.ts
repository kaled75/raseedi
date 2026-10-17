import * as XLSX from 'xlsx';
import { Contact, Debt, Payment } from '../types';

export interface FileSaveChoice {
  path: string;
  fileHandle?: any;
}

// Global cache for pending file handles when user chooses a location via File System Access API
export const pendingFileHandles = new Map<string, any>();

/**
 * Prompts the user to choose where to save a file.
 * In Chromium browsers (Chrome, Edge), this opens the native Windows "Save As" file dialog!
 * If cancelled, returns null so the app does NOT perform any save.
 */
export async function promptSaveFile(options: {
  defaultName: string;
  extension: string;
  title?: string;
}): Promise<string | null> {
  const cleanFilename = options.defaultName.split('\\').pop()?.split('/').pop() || `export.${options.extension}`;

  // 1. Try modern File System Access API (supported in Chrome, Edge, Opera)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const mimeTypes: Record<string, string> = {
        html: 'text/html',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sqlite3: 'application/x-sqlite3',
        db: 'application/x-sqlite3',
        json: 'application/json'
      };

      const mime = mimeTypes[options.extension] || 'application/octet-stream';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: cleanFilename,
        types: [
          {
            description: options.title || `${options.extension.toUpperCase()} File`,
            accept: { [mime]: ['.' + options.extension] }
          }
        ]
      });

      if (!handle) return null;

      const chosenPath = handle.name;
      pendingFileHandles.set(chosenPath, handle);
      pendingFileHandles.set(cleanFilename, handle);
      if (options.defaultName) pendingFileHandles.set(options.defaultName, handle);
      return chosenPath;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User clicked Cancel in the Windows Save dialog!
        return null;
      }
      console.warn('showSaveFilePicker failed or was rejected, falling back to prompt dialog:', err);
    }
  }

  // 2. Fallback: Prompt user with an explicit input modal/dialog asking for file name
  const userInput = window.prompt(
    `📂 ${options.title || 'تحديد مكان واسم الملف'}:\n\n` +
    `يرجى تأكيد اسم الملف لحفظه وتنزيله في جهازك:\n` +
    `(انقر "إلغاء" إذا كنت لا تريد الحفظ الآن)`,
    cleanFilename
  );

  if (userInput === null || !userInput.trim()) {
    // User cancelled!
    return null;
  }

  return userInput.trim();
}

/**
 * Prompts user to select a directory.
 */
export async function promptSelectDirectory(title?: string): Promise<string | null> {
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        id: 'raseedi_save_dir',
        startIn: 'desktop',
        mode: 'readwrite'
      });
      if (dirHandle && dirHandle.name) {
        return dirHandle.name;
      }
      return null;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null;
      }
      if (err.name === 'SecurityError') {
        window.alert('⚠️ تنبيه أمان المتصفح:\nلا يسمح المتصفح باختيار مجلدات النظام الأساسية (مثل جذر C:\\ أو Windows).\nيرجى اختيار مجلد فرعي داخل سطح المكتب (Desktop)، المستندات (Documents)، أو قرص خارجي (D:\\ أو USB).');
        return null;
      }
      console.warn('showDirectoryPicker failed, falling back to prompt:', err);
    }
  }

  const chosen = window.prompt(
    `📁 ${title || 'تحديد مجلد الحفظ'}:\n\n` +
    `أدخل اسم أو مسار المجلد المفضل لحفظ الملفات (على سطح المكتب، المستندات، أو قرص خارجي):\n` +
    `مثال: Desktop أو D:\\Backups`,
    'Desktop'
  );

  return chosen && chosen.trim() ? chosen.trim() : null;
}

/**
 * Writes data either directly into the user-selected FileHandle (from Windows Save As Dialog)
 * or triggers a direct download with the chosen filename.
 */
export async function writeDataToDestination(
  filePathOrName: string,
  data: string | ArrayBuffer | Uint8Array | Blob,
  mimeType: string
): Promise<boolean> {
  // Check if we already have a pending file handle selected by user
  let handle = pendingFileHandles.get(filePathOrName);
  if (!handle) {
    const baseName = filePathOrName.split('\\').pop()?.split('/').pop();
    if (baseName) handle = pendingFileHandles.get(baseName);
  }

  if (handle) {
    pendingFileHandles.delete(filePathOrName);
    const baseName = filePathOrName.split('\\').pop()?.split('/').pop();
    if (baseName) pendingFileHandles.delete(baseName);
    try {
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      return true;
    } catch (err) {
      console.error('Failed to write via file handle:', err);
    }
  }

  // If no handle is registered yet, open the native Windows Save As dialog directly so user chooses folder!
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const cleanName = filePathOrName.split('\\').pop()?.split('/').pop() || 'export';
      const ext = cleanName.split('.').pop() || 'dat';
      const pickerHandle = await (window as any).showSaveFilePicker({
        suggestedName: cleanName,
        types: [
          {
            description: `${ext.toUpperCase()} File`,
            accept: { [mimeType.split(';')[0]]: ['.' + ext] }
          }
        ]
      });

      if (pickerHandle) {
        const writable = await pickerHandle.createWritable();
        await writable.write(data);
        await writable.close();
        return true;
      }
      // User cancelled picker
      return false;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User clicked cancel in Windows Save dialog - do NOT download!
        return false;
      }
      console.warn('showSaveFilePicker in writeDataToDestination failed, falling back to download:', err);
    }
  }

  // Fallback only if File System Access API is completely unsupported
  const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filePathOrName.split('\\').pop()?.split('/').pop() || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return true;
}

/**
 * Generates standalone HTML report in browser
 */
export function generateBrowserHtmlReport(
  options: any,
  debts: Debt[],
  payments: Payment[],
  contacts: Contact[],
  settings: Record<string, string>
): string {
  const isDark = options.theme === 'dark';
  const currency = options.currency || 'LYD';

  let filteredDebts = debts.filter(d => d.status !== 'cancelled' && !d.is_archived);
  if (options.reportType === 'for_me') filteredDebts = filteredDebts.filter(d => d.type === 'for_me');
  else if (options.reportType === 'on_me') filteredDebts = filteredDebts.filter(d => d.type === 'on_me');
  else if (options.reportType === 'overdue') filteredDebts = filteredDebts.filter(d => d.status === 'overdue' || d.is_overdue);
  else if (options.reportType === 'settled') filteredDebts = filteredDebts.filter(d => d.status === 'fully_paid');
  else if (options.reportType === 'contact' && options.contactId) filteredDebts = filteredDebts.filter(d => d.contact_id === options.contactId);

  const totalForMe = filteredDebts.filter(d => d.type === 'for_me').reduce((s, d) => s + (d.remaining_amount || d.original_amount), 0);
  const totalOnMe = filteredDebts.filter(d => d.type === 'on_me').reduce((s, d) => s + (d.remaining_amount || d.original_amount), 0);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(options.title || 'تقرير رَصيدي المالي')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", sans-serif; background: ${isDark ? '#0f172a' : '#f8fafc'}; color: ${isDark ? '#f8fafc' : '#0f172a'}; padding: 2rem; }
    .card { background: ${isDark ? '#1e293b' : '#ffffff'}; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-box { background: ${isDark ? '#0f172a' : '#f1f5f9'}; padding: 1rem; border-radius: 0.75rem; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; text-align: center; }
    .stat-val { font-size: 1.4rem; font-weight: bold; margin-top: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: right; border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; font-size: 0.85rem; }
    th { background: ${isDark ? '#0f172a' : '#f8fafc'}; font-weight: bold; }
    .badge { padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .print-btn { background: #0284c7; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: bold; cursor: pointer; }
    @media print { .no-print { display: none; } body { padding: 0; background: white; color: black; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="margin: 0; font-size: 1.5rem; color: #0284c7;">${escapeHtml(options.title || 'تقرير رَصيدي المالي')}</h1>
      <p style="margin: 0.3rem 0 0 0; font-size: 0.85rem; color: #64748b;">تاريخ التصدير: ${new Date().toLocaleDateString('ar-LY', { dateStyle: 'full' })}</p>
    </div>
    <div class="no-print">
      <button class="print-btn" onclick="window.print()">طباعة التقرير 🖨️</button>
    </div>
  </div>

  <div class="stats">
    <div class="stat-box">
      <div style="font-size: 0.85rem; color: #64748b;">إجمالي مستحق لي (إقراض)</div>
      <div class="stat-val" style="color: #0284c7;">${totalForMe.toLocaleString()} ${currency}</div>
    </div>
    <div class="stat-box">
      <div style="font-size: 0.85rem; color: #64748b;">إجمالي مستحق عليّ (اقتراض)</div>
      <div class="stat-val" style="color: #b45309;">${totalOnMe.toLocaleString()} ${currency}</div>
    </div>
    <div class="stat-box">
      <div style="font-size: 0.85rem; color: #64748b;">صافي المركز المالي</div>
      <div class="stat-val" style="color: ${(totalForMe - totalOnMe) >= 0 ? '#15803d' : '#b91c1c'};">${(totalForMe - totalOnMe).toLocaleString()} ${currency}</div>
    </div>
    <div class="stat-box">
      <div style="font-size: 0.85rem; color: #64748b;">عدد السجلات</div>
      <div class="stat-val">${filteredDebts.length}</div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top: 0;">جدول تفاصيل الديون والالتزامات</h3>
    <table>
      <thead>
        <tr>
          <th>الرقم المرجعي</th>
          <th>الشخص</th>
          <th>النوع</th>
          <th>المبلغ الأصلي</th>
          <th>المدفوع</th>
          <th>المتبقي</th>
          <th>تاريخ الاستحقاق</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${filteredDebts.map(d => `
          <tr>
            <td style="font-family: monospace;">${escapeHtml(d.reference_no)}</td>
            <td><strong>${escapeHtml(d.contact_name || '')}</strong></td>
            <td>${d.type === 'for_me' ? 'مستحق لي' : 'مستحق علي'}</td>
            <td>${d.original_amount.toLocaleString()} ${d.currency}</td>
            <td>${(d.total_paid || 0).toLocaleString()} ${d.currency}</td>
            <td style="font-weight: bold; color: ${d.type === 'for_me' ? '#0284c7' : '#b45309'};">${(d.remaining_amount || 0).toLocaleString()} ${d.currency}</td>
            <td>${d.due_date || '-'}</td>
            <td>
              <span class="badge ${d.status === 'fully_paid' ? 'badge-green' : d.status === 'overdue' ? 'badge-red' : 'badge-amber'}">
                ${d.status === 'fully_paid' ? 'مسدد بالكامل' : d.status === 'overdue' ? 'متأخر' : d.status === 'partially_paid' ? 'مسدد جزئياً' : 'مفتوح'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  <footer style="text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: 2rem;">
    ${escapeHtml(settings.report_default_footer || 'تم توليد هذا التقرير عبر تطبيق رَصيدي لإدارة الديون الشخصية')}
  </footer>
</body>
</html>`;
}

/**
 * Generates UTF-8 BOM CSV in browser
 */
export function generateBrowserCsv(type: 'debts' | 'payments' | 'contacts', debts: Debt[], payments: Payment[], contacts: Contact[]): string {
  const BOM = '\uFEFF';
  let csv = '';

  if (type === 'debts') {
    const validDebts = debts.filter(d => d.status !== 'cancelled' && !d.is_archived);
    const headers = ['الرقم المرجعي', 'الشخص', 'رقم الهاتف', 'النوع', 'المبلغ الأصلي', 'المدفوع', 'المتبقي', 'العملة', 'تاريخ الإنشاء', 'تاريخ الاستحقاق', 'الحالة', 'الوصف'];
    csv += headers.map(h => `"${h}"`).join(',') + '\r\n';
    for (const d of validDebts) {
      const row = [
        d.reference_no,
        d.contact_name || '',
        d.contact_phone || '',
        d.type === 'for_me' ? 'مستحق لي' : 'مستحق علي',
        d.original_amount,
        d.total_paid || 0,
        d.remaining_amount || 0,
        d.currency,
        d.created_date,
        d.due_date || '',
        d.status,
        (d.description || '').replace(/"/g, '""')
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\r\n';
    }
  } else if (type === 'payments') {
    const validPayments = payments.filter(p => p.status === 'valid');
    const headers = ['رقم الإيصال', 'الشخص', 'بيان الدين', 'مبلغ الدفعة', 'العملة', 'طريقة الدفع', 'الرصيد السابق', 'الرصيد الجديد', 'تاريخ الدفعة', 'الحالة'];
    csv += headers.map(h => `"${h}"`).join(',') + '\r\n';
    for (const p of validPayments) {
      const row = [
        p.receipt_no,
        p.contact_name || '',
        (p.debt_description || '').replace(/"/g, '""'),
        p.amount,
        p.currency || 'LYD',
        p.payment_method === 'cash' ? 'نقدًا' : 'تحويل مصرفي',
        p.previous_balance,
        p.new_balance,
        p.payment_date,
        p.status === 'valid' ? 'صحيحة' : 'ملغاة'
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\r\n';
    }
  } else {
    const validContacts = contacts.filter(c => !c.is_archived);
    const headers = ['الاسم', 'الهاتف', 'مستحق لي', 'مستحق علي', 'صافي الرصيد', 'مؤرشف'];
    csv += headers.map(h => `"${h}"`).join(',') + '\r\n';
    for (const c of validContacts) {
      const row = [
        c.name,
        c.phone || '',
        c.total_for_me || 0,
        c.total_on_me || 0,
        c.net_balance || 0,
        c.is_archived ? 'نعم' : 'لا'
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\r\n';
    }
  }

  return BOM + csv;
}

/**
 * Generates Excel Workbook ArrayBuffer in browser
 */
export function generateBrowserXlsx(debts: Debt[], payments: Payment[], contacts: Contact[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // 1. Debts
  const validDebts = debts.filter(d => d.status !== 'cancelled' && !d.is_archived);
  const debtsData = validDebts.map(d => ({
    'الرقم المرجعي': d.reference_no,
    'الشخص': d.contact_name || '',
    'الهاتف': d.contact_phone || '',
    'النوع': d.type === 'for_me' ? 'مستحق لي' : 'مستحق عليّ',
    'المبلغ الأصلي': d.original_amount,
    'المدفوع': d.total_paid || 0,
    'المتبقي': d.remaining_amount || 0,
    'العملة': d.currency,
    'تاريخ الإنشاء': d.created_date,
    'تاريخ الاستحقاق': d.due_date || '',
    'الحالة': d.status,
    'الوصف': d.description
  }));
  const debtsWs = XLSX.utils.json_to_sheet(debtsData);
  XLSX.utils.book_append_sheet(wb, debtsWs, 'الديون');

  // 2. Contacts
  const validContacts = contacts.filter(c => !c.is_archived);
  const contactsData = validContacts.map(c => ({
    'الاسم': c.name,
    'الهاتف': c.phone || '',
    'مستحق لي': c.total_for_me || 0,
    'مستحق علي': c.total_on_me || 0,
    'صافي الرصيد': c.net_balance || 0,
    'مؤرشف': c.is_archived ? 'نعم' : 'لا'
  }));
  const contactsWs = XLSX.utils.json_to_sheet(contactsData);
  XLSX.utils.book_append_sheet(wb, contactsWs, 'الأشخاص');

  // 3. Payments
  const validPayments = payments.filter(p => p.status === 'valid');
  const paymentsData = validPayments.map(p => ({
    'رقم الإيصال': p.receipt_no,
    'الشخص': p.contact_name || '',
    'بيان الدين': p.debt_description || '',
    'مبلغ الدفعة': p.amount,
    'العملة': p.currency || 'LYD',
    'طريقة الدفع': p.payment_method === 'cash' ? 'نقدًا' : 'تحويل مصرفي',
    'الرصيد السابق': p.previous_balance,
    'الرصيد الجديد': p.new_balance,
    'تاريخ الدفعة': p.payment_date,
    'الحالة': p.status === 'valid' ? 'صحيحة' : 'ملغاة'
  }));
  const paymentsWs = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(wb, paymentsWs, 'المدفوعات');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return buf;
}

/**
 * Escapes HTML string
 */
function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
