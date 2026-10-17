import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getDatabase } from '../db';
import { Debt, Payment, Contact } from '../db/types';
import { getDebts } from './debtService';
import { getPayments } from './paymentService';
import { getContacts } from './contactService';

export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface HtmlExportOptions {
  title: string;
  reportType: 'all' | 'for_me' | 'on_me' | 'contact' | 'single_debt' | 'payments' | 'overdue' | 'settled';
  contactId?: string;
  debtId?: string;
  dateFrom?: string;
  dateTo?: string;
  showPhone?: boolean;
  showNotes?: boolean;
  showPayments?: boolean;
  theme?: 'light' | 'dark';
  language?: 'ar' | 'en';
  ownerName?: string;
  currency?: string;
}

export function generateHtmlReport(options: HtmlExportOptions): string {
  const isArabic = options.language !== 'en';
  const isDark = options.theme === 'dark';
  const dir = isArabic ? 'rtl' : 'ltr';
  const currency = options.currency || 'LYD';

  let debts = getDebts({ include_archived: false });
  let payments = getPayments({ status: 'valid' });
  const contacts = getContacts();

  // Apply filters
  if (options.reportType === 'for_me') {
    debts = debts.filter(d => d.type === 'for_me');
  } else if (options.reportType === 'on_me') {
    debts = debts.filter(d => d.type === 'on_me');
  } else if (options.reportType === 'overdue') {
    debts = debts.filter(d => d.is_overdue || d.status === 'overdue');
  } else if (options.reportType === 'settled') {
    debts = debts.filter(d => d.status === 'fully_paid');
  } else if (options.reportType === 'contact' && options.contactId) {
    debts = debts.filter(d => d.contact_id === options.contactId);
    payments = payments.filter(p => p.contact_id === options.contactId);
  } else if (options.reportType === 'single_debt' && options.debtId) {
    debts = debts.filter(d => d.id === options.debtId);
    payments = payments.filter(p => p.debt_id === options.debtId);
  }

  if (options.dateFrom) {
    debts = debts.filter(d => d.created_date >= options.dateFrom!);
  }
  if (options.dateTo) {
    debts = debts.filter(d => d.created_date <= options.dateTo!);
  }

  // Calculate totals
  const totalOriginal = debts.reduce((sum, d) => sum + d.original_amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + (d.total_paid || 0), 0);
  const totalRemaining = debts.reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'open': return isArabic ? 'مفتوح' : 'Open';
      case 'partially_paid': return isArabic ? 'مسدد جزئياً' : 'Partially Paid';
      case 'overdue': return isArabic ? 'متأخر' : 'Overdue';
      case 'fully_paid': return isArabic ? 'مسدد بالكامل' : 'Fully Paid';
      case 'cancelled': return isArabic ? 'ملغي' : 'Cancelled';
      default: return status;
    }
  };

  const typeLabel = (type: string) => {
    if (type === 'for_me') return isArabic ? 'مستحق لي (إقراض)' : 'Lent (For Me)';
    return isArabic ? 'مستحق عليّ (اقتراض)' : 'Borrowed (On Me)';
  };

  const generationDate = new Date().toLocaleString(isArabic ? 'ar-LY' : 'en-US');

  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)} - رَصيدي</title>
  <style>
    :root {
      --bg: ${isDark ? '#0f172a' : '#f8fafc'};
      --surface: ${isDark ? '#1e293b' : '#ffffff'};
      --surface-border: ${isDark ? '#334155' : '#e2e8f0'};
      --text: ${isDark ? '#f1f5f9' : '#0f172a'};
      --text-muted: ${isDark ? '#94a3b8' : '#64748b'};
      --primary: #0284c7;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "IBM Plex Sans Arabic", sans-serif;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .logo-badge {
      background: #0284c7;
      color: white;
      font-weight: bold;
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .app-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
    }
    .app-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .report-meta {
      text-align: ${isArabic ? 'left' : 'right'};
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .value-blue { color: var(--primary); }
    .value-green { color: var(--success); }
    .value-amber { color: var(--warning); }
    .value-red { color: var(--danger); }
    
    .table-container {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      overflow-x: auto;
      margin-bottom: 1.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: ${isArabic ? 'right' : 'left'};
      font-size: 0.9rem;
    }
    th {
      background: ${isDark ? '#1e293b' : '#f1f5f9'};
      padding: 0.85rem 1rem;
      font-weight: 600;
      border-bottom: 2px solid var(--surface-border);
      color: var(--text-muted);
    }
    td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--surface-border);
    }
    tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-open { background: #dbeafe; color: #1e40af; }
    .badge-partially_paid { background: #fef3c7; color: #92400e; }
    .badge-overdue { background: #fee2e2; color: #991b1b; }
    .badge-fully_paid { background: #d1fae5; color: #065f46; }
    .badge-for_me { background: #ecfdf5; color: #047857; }
    .badge-on_me { background: #fff1f2; color: #be123c; }

    .footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--surface-border);
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .print-btn {
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    @media print {
      body {
        background: white !important;
        color: black !important;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .stat-card, .table-container, .header {
        border-color: #cbd5e1 !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-area">
        <div class="logo-badge">رَ</div>
        <div>
          <div class="app-title">${isArabic ? 'رَصيدي | إدارة الديون الشخصية' : 'Raseedi | Personal Debt Manager'}</div>
          <div class="app-subtitle">${options.ownerName ? escapeHtml(options.ownerName) : (isArabic ? 'أموالك واضحة، وديونك تحت السيطرة' : 'Clear finances, debts under control')}</div>
        </div>
      </div>
      <div class="report-meta">
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text);">${escapeHtml(options.title)}</div>
        <div>${isArabic ? 'تاريخ التقرير:' : 'Generated:'} ${generationDate}</div>
        <div class="no-print" style="margin-top: 0.5rem;">
          <button class="print-btn" onclick="window.print()">
            <span>${isArabic ? '🖨️ طباعة / حفظ PDF' : '🖨️ Print / Save PDF'}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">${isArabic ? 'إجمالي المبالغ الأصلية' : 'Total Original'}</div>
        <div class="stat-value value-blue">${totalOriginal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${isArabic ? 'إجمالي المدفوع / المسدد' : 'Total Paid'}</div>
        <div class="stat-value value-green">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${isArabic ? 'صافي المتبقي' : 'Remaining Balance'}</div>
        <div class="stat-value ${totalRemaining > 0 ? 'value-amber' : 'value-green'}">${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${isArabic ? 'عدد السجلات' : 'Records Count'}</div>
        <div class="stat-value">${debts.length}</div>
      </div>
    </div>

    <!-- Debts Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>${isArabic ? 'المرجع' : 'Ref'}</th>
            <th>${isArabic ? 'الشخص' : 'Contact'}</th>
            ${options.showPhone ? `<th>${isArabic ? 'الهاتف' : 'Phone'}</th>` : ''}
            <th>${isArabic ? 'النوع' : 'Type'}</th>
            <th>${isArabic ? 'المبلغ الأصلي' : 'Original'}</th>
            <th>${isArabic ? 'المدفوع' : 'Paid'}</th>
            <th>${isArabic ? 'المتبقي' : 'Remaining'}</th>
            <th>${isArabic ? 'تاريخ الإنشاء' : 'Date'}</th>
            <th>${isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
            <th>${isArabic ? 'الحالة' : 'Status'}</th>
            ${options.showNotes ? `<th>${isArabic ? 'ملاحظات' : 'Notes'}</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${debts.length === 0 ? `
            <tr>
              <td colspan="11" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                ${isArabic ? 'لا توجد بيانات مطابقة لهذا التقرير' : 'No records found for this report'}
              </td>
            </tr>
          ` : debts.map(d => `
            <tr>
              <td style="font-family: monospace; font-weight: 600;">${escapeHtml(d.reference_no)}</td>
              <td style="font-weight: 600;">${escapeHtml(d.contact_name)}</td>
              ${options.showPhone ? `<td>${escapeHtml(d.contact_phone || '-')}</td>` : ''}
              <td><span class="badge ${d.type === 'for_me' ? 'badge-for_me' : 'badge-on_me'}">${typeLabel(d.type)}</span></td>
              <td style="font-weight: 600;">${d.original_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${d.currency}</td>
              <td style="color: var(--success);">${(d.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${d.currency}</td>
              <td style="font-weight: 700; color: ${(d.remaining_amount || 0) > 0 ? 'var(--warning)' : 'var(--success)'};">
                ${(d.remaining_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${d.currency}
              </td>
              <td>${escapeHtml(d.created_date)}</td>
              <td>${escapeHtml(d.due_date || (isArabic ? 'غير محدد' : 'None'))}</td>
              <td><span class="badge badge-${d.status}">${statusLabel(d.status)}</span></td>
              ${options.showNotes ? `<td>${escapeHtml(d.notes || d.description)}</td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Payments Section if enabled -->
    ${options.showPayments && payments.length > 0 ? `
      <div style="margin-top: 2rem; margin-bottom: 0.5rem; font-weight: 700; font-size: 1.1rem;">
        ${isArabic ? 'سجل المدفوعات والحركات المالية المرتبطة' : 'Payment History'}
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>${isArabic ? 'رقم الإيصال' : 'Receipt #'}</th>
              <th>${isArabic ? 'الشخص' : 'Contact'}</th>
              <th>${isArabic ? 'المبلغ' : 'Amount'}</th>
              <th>${isArabic ? 'طريقة الدفع' : 'Method'}</th>
              <th>${isArabic ? 'التاريخ' : 'Date'}</th>
              <th>${isArabic ? 'الرصيد السابق' : 'Prev Balance'}</th>
              <th>${isArabic ? 'الرصيد الجديد' : 'New Balance'}</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td style="font-family: monospace; font-weight: 600;">${escapeHtml(p.receipt_no)}</td>
                <td>${escapeHtml(p.contact_name)}</td>
                <td style="font-weight: 700; color: var(--success);">${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${p.currency}</td>
                <td>${p.payment_method === 'cash' ? (isArabic ? 'نقدًا' : 'Cash') : (isArabic ? 'تحويل مصرفي' : 'Bank Transfer')}</td>
                <td>${escapeHtml(p.payment_date ? p.payment_date.slice(0, 10) : '')}</td>
                <td>${p.previous_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${p.new_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <div class="footer">
      <div>${isArabic ? 'صادر عن تطبيق رَصيدي لإدارة الديون الشخصية' : 'Generated by Raseedi Personal Debt Manager'}</div>
      <div style="font-size: 0.75rem; margin-top: 0.25rem;">${isArabic ? 'جميع الحسابات مدققة محلياً ومبنية على سجلات المعاملات الفعلية.' : 'All calculations verified locally based on transaction logs.'}</div>
    </div>
  </div>
</body>
</html>`;
}

export function exportHtmlToFile(filePath: string, options: HtmlExportOptions): { success: boolean; filePath: string; message?: string } {
  try {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const htmlContent = generateHtmlReport(options);
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, filePath: '', message: err?.message || 'فشل كتابة ملف HTML' };
  }
}

export function exportCsv(filePath: string, type: 'debts' | 'payments' | 'contacts'): { success: boolean; filePath: string; message?: string } {
  try {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    let csv = '';
    const BOM = '\uFEFF'; // UTF-8 Byte Order Mark for Excel Arabic compatibility

    if (type === 'debts') {
      const debts = getDebts({ include_archived: true });
      const headers = ['الرقم المرجعي', 'الشخص', 'رقم الهاتف', 'النوع', 'المبلغ الأصلي', 'المدفوع', 'المتبقي', 'العملة', 'تاريخ الإنشاء', 'تاريخ الاستحقاق', 'الحالة', 'الوصف', 'ملاحظات'];
      csv += headers.map(h => `"${h}"`).join(',') + '\r\n';

      for (const d of debts) {
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
          d.description.replace(/"/g, '""'),
          (d.notes || '').replace(/"/g, '""')
        ];
        csv += row.map(v => `"${v}"`).join(',') + '\r\n';
      }
    } else if (type === 'payments') {
      const payments = getPayments();
      const headers = ['رقم الإيصال', 'الشخص', 'بيان الدين', 'مبلغ الدفعة', 'العملة', 'طريقة الدفع', 'الرصيد السابق', 'الرصيد الجديد', 'تاريخ الدفعة', 'الحالة', 'ملاحظات'];
      csv += headers.map(h => `"${h}"`).join(',') + '\r\n';

      for (const p of payments) {
        const row = [
          p.receipt_no,
          p.contact_name || '',
          (p.debt_description || '').replace(/"/g, '""'),
          p.amount,
          p.currency || 'LYD',
          p.payment_method,
          p.previous_balance,
          p.new_balance,
          p.payment_date,
          p.status === 'valid' ? 'صحيحة' : 'ملغاة',
          (p.notes || '').replace(/"/g, '""')
        ];
        csv += row.map(v => `"${v}"`).join(',') + '\r\n';
      }
    } else if (type === 'contacts') {
      const contacts = getContacts({ include_archived: true });
      const headers = ['الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'مستحق لي', 'مستحق علي', 'صافي الرصيد', 'مؤرشف', 'ملاحظات'];
      csv += headers.map(h => `"${h}"`).join(',') + '\r\n';

      for (const c of contacts) {
        const row = [
          c.name,
          c.phone || '',
          c.email || '',
          c.address || '',
          c.total_for_me || 0,
          c.total_on_me || 0,
          c.net_balance || 0,
          c.is_archived ? 'نعم' : 'لا',
          (c.notes || '').replace(/"/g, '""')
        ];
        csv += row.map(v => `"${v}"`).join(',') + '\r\n';
      }
    }

    fs.writeFileSync(filePath, BOM + csv, 'utf-8');
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, filePath: '', message: err?.message || 'فشل تصدير ملف CSV' };
  }
}

export function exportXlsx(filePath: string): { success: boolean; filePath: string; message?: string } {
  try {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const wb = XLSX.utils.book_new();

    // 1. Debts Sheet
    const debts = getDebts({ include_archived: true }).map(d => ({
      'الرقم المرجعي': d.reference_no,
      'الشخص': d.contact_name || '',
      'رقم الهاتف': d.contact_phone || '',
      'النوع': d.type === 'for_me' ? 'مستحق لي' : 'مستحق عليّ',
      'المبلغ الأصلي': d.original_amount,
      'المدفوع': d.total_paid || 0,
      'المتبقي': d.remaining_amount || 0,
      'العملة': d.currency,
      'تاريخ الإنشاء': d.created_date,
      'تاريخ الاستحقاق': d.due_date || '',
      'الحالة': d.status,
      'الوصف': d.description,
      'ملاحظات': d.notes || ''
    }));
    const debtsWs = XLSX.utils.json_to_sheet(debts);
    XLSX.utils.book_append_sheet(wb, debtsWs, 'الديون');

    // 2. Contacts Sheet
    const contacts = getContacts({ include_archived: true }).map(c => ({
      'الاسم': c.name,
      'الهاتف': c.phone || '',
      'البريد الإلكتروني': c.email || '',
      'العنوان': c.address || '',
      'مستحق لي': c.total_for_me || 0,
      'مستحق علي': c.total_on_me || 0,
      'صافي الرصيد': c.net_balance || 0,
      'مؤرشف': c.is_archived ? 'نعم' : 'لا',
      'ملاحظات': c.notes || ''
    }));
    const contactsWs = XLSX.utils.json_to_sheet(contacts);
    XLSX.utils.book_append_sheet(wb, contactsWs, 'الأشخاص');

    // 3. Payments Sheet
    const payments = getPayments().map(p => ({
      'رقم الإيصال': p.receipt_no,
      'الشخص': p.contact_name || '',
      'بيان الدين': p.debt_description || '',
      'مبلغ الدفعة': p.amount,
      'العملة': p.currency || 'LYD',
      'طريقة الدفع': p.payment_method === 'cash' ? 'نقدًا' : 'تحويل مصرفي',
      'الرصيد السابق': p.previous_balance,
      'الرصيد الجديد': p.new_balance,
      'تاريخ الدفعة': p.payment_date,
      'الحالة': p.status === 'valid' ? 'صحيحة' : 'ملغاة',
      'ملاحظات': p.notes || ''
    }));
    const paymentsWs = XLSX.utils.json_to_sheet(payments);
    XLSX.utils.book_append_sheet(wb, paymentsWs, 'المدفوعات');

    XLSX.writeFile(wb, filePath);
    return { success: true, filePath };
  } catch (err: any) {
    return { success: false, filePath: '', message: err?.message || 'فشل تصدير ملف Excel' };
  }
}

export function generateReceiptHtml(paymentId: string): string {
  const payments = getPayments();
  const payment = payments.find(p => p.id === paymentId);
  if (!payment) return '<div>الدفعة غير موجودة</div>';

  const isArabic = true;
  const now = new Date(payment.payment_date).toLocaleDateString('ar-LY', { dateStyle: 'full' });

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إيصال سداد - ${escapeHtml(payment.receipt_no)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 2rem;
    }
    .receipt-box {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 2rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    .title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #0284c7;
    }
    .receipt-no {
      font-family: monospace;
      font-size: 1.1rem;
      font-weight: bold;
      color: #64748b;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 0.6rem 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .label {
      color: #64748b;
      font-size: 0.9rem;
    }
    .val {
      font-weight: 600;
    }
    .amount-highlight {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      margin: 1.5rem 0;
      font-size: 1.6rem;
      font-weight: bold;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 2.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }
    .signature-block {
      text-align: center;
      width: 45%;
    }
    .signature-line {
      margin-top: 2.5rem;
      border-top: 1px dashed #94a3b8;
    }
    @media print {
      body { background: white; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <div>
        <div class="title">رَصيدي | إيصال سداد مالي</div>
        <div style="font-size: 0.8rem; color: #64748b;">سند رسمي لحركة السداد</div>
      </div>
      <div class="receipt-no">${escapeHtml(payment.receipt_no)}</div>
    </div>

    <div class="row">
      <span class="label">تاريخ العملية:</span>
      <span class="val">${now}</span>
    </div>
    <div class="row">
      <span class="label">اسم الشخص:</span>
      <span class="val">${escapeHtml(payment.contact_name)}</span>
    </div>
    <div class="row">
      <span class="label">نوع المعاملة:</span>
      <span class="val">${payment.debt_type === 'for_me' ? 'استلام دفعة من دين مستحق لي' : 'سداد دفعة لدين مستحق عليّ'}</span>
    </div>
    <div class="row">
      <span class="label">بيان الدين:</span>
      <span class="val">${escapeHtml(payment.debt_description)}</span>
    </div>
    <div class="row">
      <span class="label">طريقة السداد:</span>
      <span class="val">${payment.payment_method === 'cash' ? 'نقدًا (كاش)' : 'تحويل مصرفي'}</span>
    </div>

    <div class="amount-highlight">
      ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${payment.currency || 'LYD'}
    </div>

    <div class="row">
      <span class="label">الرصيد قبل الدفعة:</span>
      <span class="val">${payment.previous_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${payment.currency || 'LYD'}</span>
    </div>
    <div class="row">
      <span class="label">الرصيد المتبقي بعد الدفعة:</span>
      <span class="val" style="color: ${payment.new_balance > 0 ? '#b45309' : '#059669'}; font-weight: bold;">
        ${payment.new_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${payment.currency || 'LYD'}
      </span>
    </div>

    <div class="signatures">
      <div class="signature-block">
        <div class="label">توقيع المستلم</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-block">
        <div class="label">توقيع المسدد</div>
        <div class="signature-line"></div>
      </div>
    </div>

    <div class="no-print" style="text-align: center; margin-top: 1.5rem;">
      <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: bold; cursor: pointer;">
        طباعة الإيصال 🖨️
      </button>
    </div>
  </div>
</body>
</html>`;
}
