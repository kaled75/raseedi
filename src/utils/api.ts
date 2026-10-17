import { Contact, Debt, Payment, DashboardStats, MonthlyTrend, AuditLog } from '../types';
import {
  promptSaveFile,
  promptSelectDirectory,
  writeDataToDestination,
  generateBrowserHtmlReport,
  generateBrowserCsv,
  generateBrowserXlsx
} from './browserExportAndBackup';

declare global {
  interface Window {
    api?: any;
  }
}

// LocalStorage Keys for persistent mock state in browser mode
const STORAGE_KEYS = {
  INITIALIZED: 'raseedi_v2_initialized',
  CONTACTS: 'raseedi_mock_contacts',
  DEBTS: 'raseedi_mock_debts',
  PAYMENTS: 'raseedi_mock_payments',
  SETTINGS: 'raseedi_mock_settings',
  AUDIT_LOGS: 'raseedi_mock_audit_logs'
};

const DEFAULT_SETTINGS: Record<string, string> = {
  app_name: 'رَصيدي',
  owner_name: 'محمد الصادق',
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

const INITIAL_DEMO_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'طارق الورفلي',
    phone: '0912345678',
    email: 'tariq@example.com',
    address: 'طرابلس - النوفليين',
    is_archived: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_for_me: 1000,
    total_on_me: 0,
    net_balance: 1000,
    active_debts_count: 1
  },
  {
    id: 'c2',
    name: 'سالم الفيتوري',
    phone: '0923456789',
    email: 'salem@example.com',
    address: 'بنغازي - الكيش',
    is_archived: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_for_me: 0,
    total_on_me: 850,
    net_balance: -850,
    active_debts_count: 1
  },
  {
    id: 'c3',
    name: 'محمود القاضي',
    phone: '0945678901',
    email: 'mahmoud@example.com',
    is_archived: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_for_me: 2200,
    total_on_me: 0,
    net_balance: 2200,
    active_debts_count: 1
  }
];

const INITIAL_DEMO_DEBTS: Debt[] = [
  {
    id: 'd1',
    reference_no: 'DBT-ME-2026-0001',
    contact_id: 'c1',
    type: 'for_me',
    original_amount: 1500,
    currency: 'LYD',
    created_date: '2026-04-10',
    due_date: '2026-05-15',
    description: 'مساعدة لشراء جهاز حاسوب مكتبي',
    recording_method: 'manual',
    status: 'partially_paid',
    is_archived: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact_name: 'طارق الورفلي',
    contact_phone: '0912345678',
    total_paid: 500,
    remaining_amount: 1000,
    payments_count: 1,
    is_overdue: false
  },
  {
    id: 'd2',
    reference_no: 'DBT-ON-2026-0002',
    contact_id: 'c2',
    type: 'on_me',
    original_amount: 850,
    currency: 'LYD',
    created_date: '2026-04-12',
    due_date: '2026-05-30',
    description: 'اقتراض لصيانة السيارة',
    recording_method: 'manual',
    status: 'open',
    is_archived: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact_name: 'سالم الفيتوري',
    contact_phone: '0923456789',
    total_paid: 0,
    remaining_amount: 850,
    payments_count: 0,
    is_overdue: false
  },
  {
    id: 'd3',
    reference_no: 'DBT-ME-2026-0003',
    contact_id: 'c3',
    type: 'for_me',
    original_amount: 2200,
    currency: 'LYD',
    created_date: '2026-03-01',
    due_date: '2026-04-01',
    description: 'توريد بضاعة قرطاسية',
    recording_method: 'manual',
    status: 'overdue',
    is_archived: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact_name: 'محمود القاضي',
    contact_phone: '0945678901',
    total_paid: 0,
    remaining_amount: 2200,
    payments_count: 0,
    is_overdue: true
  }
];

const INITIAL_DEMO_PAYMENTS: Payment[] = [
  {
    id: 'p1',
    receipt_no: 'REC-2026-0001',
    debt_id: 'd1',
    contact_id: 'c1',
    amount: 500,
    payment_date: '2026-04-20 14:30',
    payment_method: 'bank_transfer',
    notes: 'تحويل مصرفي للدفعة الأولى',
    previous_balance: 1500,
    new_balance: 1000,
    status: 'valid',
    created_at: new Date().toISOString(),
    debt_description: 'مساعدة لشراء جهاز حاسوب مكتبي',
    debt_type: 'for_me',
    contact_name: 'طارق الورفلي',
    currency: 'LYD'
  }
];

let mockContacts: Contact[] = [];
let mockDebts: Debt[] = [];
let mockPayments: Payment[] = [];
let mockSettings: Record<string, string> = { ...DEFAULT_SETTINGS };
let mockAuditLogs: AuditLog[] = [];

function saveMockData() {
  try {
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(mockContacts));
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(mockDebts));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(mockPayments));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mockSettings));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(mockAuditLogs));
  } catch (e) {
    console.error('Failed to save mock state:', e);
  }
}

function initMockData() {
  try {
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      mockContacts = [...INITIAL_DEMO_CONTACTS];
      mockDebts = [...INITIAL_DEMO_DEBTS];
      mockPayments = [...INITIAL_DEMO_PAYMENTS];
      mockSettings = { ...DEFAULT_SETTINGS };
      mockAuditLogs = [
        {
          id: '1',
          action: 'CREATE_DEBT',
          entity_type: 'debts',
          entity_id: 'd1',
          details: 'إضافة دين أولي تجريبي',
          timestamp: new Date().toISOString()
        }
      ];
      saveMockData();
    } else {
      mockContacts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTACTS) || '[]');
      mockDebts = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBTS) || '[]');
      mockPayments = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
      mockAuditLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        mockSettings = JSON.parse(savedSettings);
      }
    }
  } catch (e) {
    console.error('Failed to init mock state:', e);
  }
}

initMockData();

let isPasswordSet = false;
let mockCurrentPassword = '';
let isLocked = false;
let isInitialSetupDismissed = false;

export const api = {
  // Auth
  getAuthStatus: async () => {
    if (window.api) return window.api.getAuthStatus();
    return { isConfigured: isPasswordSet, isLocked, hasCompletedSetup: isPasswordSet || isInitialSetupDismissed };
  },
  setupPassword: async (password: string, hint?: string) => {
    if (window.api) return window.api.setupPassword(password, hint);
    mockCurrentPassword = password;
    isPasswordSet = true;
    isInitialSetupDismissed = true;
    return { success: true };
  },
  verifyPassword: async (password: string) => {
    if (window.api) return window.api.verifyPassword(password);
    if (!isPasswordSet) return { success: false, message: 'لم يتم إعداد كلمة مرور بعد' };
    if (password === mockCurrentPassword) return { success: true };
    return { success: false, message: 'كلمة المرور غير صحيحة' };
  },
  changePassword: async (currentPass: string, newPass: string, hint?: string) => {
    if (window.api) return window.api.changePassword(currentPass, newPass, hint);
    if (isPasswordSet && currentPass !== mockCurrentPassword) {
      return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
    }
    mockCurrentPassword = newPass;
    isPasswordSet = true;
    isInitialSetupDismissed = true;
    return { success: true };
  },
  dismissInitialSetup: async () => {
    if (window.api) return window.api.dismissInitialSetup();
    isInitialSetupDismissed = true;
    return { success: true };
  },
  removePassword: async (currentPassword: string) => {
    if (window.api) return window.api.removePassword(currentPassword);
    if (isPasswordSet && currentPassword !== mockCurrentPassword) {
      return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
    }
    mockCurrentPassword = '';
    isPasswordSet = false;
    isInitialSetupDismissed = true;
    return { success: true };
  },

  // Contacts
  getContacts: async (filter?: any): Promise<Contact[]> => {
    if (window.api) return window.api.getContacts(filter);
    let res = [...mockContacts];
    if (!filter?.include_archived) res = res.filter(c => !c.is_archived);
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      res = res.filter(c => c.name.toLowerCase().includes(s) || (c.phone && c.phone.includes(s)));
    }
    return res;
  },
  getContactById: async (id: string): Promise<Contact | null> => {
    if (window.api) return window.api.getContactById(id);
    return mockContacts.find(c => c.id === id) || null;
  },
  createContact: async (data: any) => {
    if (window.api) return window.api.createContact(data);
    const newContact: Contact = {
      id: 'c_' + Date.now(),
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      avatar: data.avatar,
      notes: data.notes,
      is_archived: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_for_me: 0,
      total_on_me: 0,
      net_balance: 0,
      active_debts_count: 0
    };
    mockContacts.unshift(newContact);
    saveMockData();
    return { success: true, contact: newContact };
  },
  updateContact: async (id: string, data: any) => {
    if (window.api) return window.api.updateContact(id, data);
    const idx = mockContacts.findIndex(c => c.id === id);
    if (idx !== -1) {
      mockContacts[idx] = { ...mockContacts[idx], ...data, updated_at: new Date().toISOString() };
      saveMockData();
      return { success: true, contact: mockContacts[idx] };
    }
    return { success: false, message: 'الشخص غير موجود' };
  },
  archiveContact: async (id: string, archive = true) => {
    if (window.api) return window.api.archiveContact(id, archive);
    const contact = mockContacts.find(c => c.id === id);
    if (contact) {
      contact.is_archived = archive ? 1 : 0;
      saveMockData();
    }
    return { success: true };
  },
  deleteContact: async (id: string) => {
    if (window.api) return window.api.deleteContact(id);
    // Cascade delete all associated payments and debts
    const debtIds = mockDebts.filter(d => d.contact_id === id).map(d => d.id);
    mockPayments = mockPayments.filter(p => p.contact_id !== id && !debtIds.includes(p.debt_id));
    mockDebts = mockDebts.filter(d => d.contact_id !== id);
    mockContacts = mockContacts.filter(c => c.id !== id);
    saveMockData();
    return { success: true };
  },
  getContactStatement: async (contactId: string) => {
    if (window.api) return window.api.getContactStatement(contactId);
    const contact = mockContacts.find(c => c.id === contactId);
    const debts = mockDebts.filter(d => d.contact_id === contactId && d.status !== 'cancelled' && !d.is_archived);
    const payments = mockPayments.filter(p => p.contact_id === contactId && p.status === 'valid');
    return {
      contact,
      debts,
      payments,
      summary: {
        total_for_me: contact?.total_for_me || 0,
        total_on_me: contact?.total_on_me || 0,
        net_balance: contact?.net_balance || 0,
        debts_count: debts.length,
        payments_count: payments.length
      }
    };
  },

  // Debts
  getDebts: async (filter?: any): Promise<Debt[]> => {
    if (window.api) return window.api.getDebts(filter);
    let res = [...mockDebts];
    if (!filter?.include_archived) res = res.filter(d => !d.is_archived);
    if (filter?.type) res = res.filter(d => d.type === filter.type);
    if (filter?.status) res = res.filter(d => d.status === filter.status);
    if (filter?.contact_id) res = res.filter(d => d.contact_id === filter.contact_id);
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      res = res.filter(d => 
        (d.contact_name && d.contact_name.toLowerCase().includes(s)) ||
        d.description.toLowerCase().includes(s) ||
        d.reference_no.toLowerCase().includes(s)
      );
    }
    return res;
  },
  getDebtById: async (id: string): Promise<Debt | null> => {
    if (window.api) return window.api.getDebtById(id);
    return mockDebts.find(d => d.id === id) || null;
  },
  createDebt: async (data: any) => {
    if (window.api) return window.api.createDebt(data);
    const contact = mockContacts.find(c => c.id === data.contact_id);
    const ref = (data.type === 'for_me' ? 'DBT-ME-' : 'DBT-ON-') + '2026-' + (mockDebts.length + 1).toString().padStart(4, '0');
    const newDebt: Debt = {
      id: 'd_' + Date.now(),
      reference_no: ref,
      contact_id: data.contact_id,
      type: data.type,
      original_amount: Number(data.original_amount),
      currency: data.currency || 'LYD',
      created_date: data.created_date || new Date().toISOString().slice(0, 10),
      due_date: data.due_date || null,
      description: data.description,
      recording_method: data.recording_method || 'manual',
      notes: data.notes,
      status: 'open',
      is_archived: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      contact_name: contact?.name || '',
      contact_phone: contact?.phone,
      total_paid: 0,
      remaining_amount: Number(data.original_amount),
      payments_count: 0,
      is_overdue: false
    };
    mockDebts.unshift(newDebt);

    // Update contact balance
    if (contact) {
      if (data.type === 'for_me') {
        contact.total_for_me = (contact.total_for_me || 0) + newDebt.original_amount;
      } else {
        contact.total_on_me = (contact.total_on_me || 0) + newDebt.original_amount;
      }
      contact.net_balance = (contact.total_for_me || 0) - (contact.total_on_me || 0);
      contact.active_debts_count = (contact.active_debts_count || 0) + 1;
    }

    // Add audit log
    mockAuditLogs.unshift({
      id: 'a_' + Date.now(),
      action: 'CREATE_DEBT',
      entity_type: 'debts',
      entity_id: newDebt.id,
      details: `تسجيل دين جديد: ${newDebt.description} بمبلغ ${newDebt.original_amount} (${newDebt.contact_name})`,
      timestamp: new Date().toISOString()
    });

    saveMockData();
    return { success: true, debt: newDebt };
  },
  updateDebt: async (id: string, data: any) => {
    if (window.api) return window.api.updateDebt(id, data);
    const debt = mockDebts.find(d => d.id === id);
    if (!debt) return { success: false, message: 'الدين غير موجود' };

    if (data.original_amount !== undefined) {
      const newAmt = Number(data.original_amount);
      if (isNaN(newAmt) || newAmt <= 0) {
        return { success: false, message: 'المبلغ الأصلي يجب أن يكون أكبر من الصفر' };
      }
      const totalPaid = debt.total_paid || 0;
      if (newAmt < totalPaid) {
        return { 
          success: false, 
          message: `لا يمكن تقليل المبلغ الأصلي إلى ${newAmt} لأن مجموع الدفعات المسجلة بلغ ${totalPaid}` 
        };
      }
      debt.original_amount = newAmt;
      debt.remaining_amount = Math.max(0, newAmt - totalPaid);
      debt.status = debt.remaining_amount <= 0 ? 'fully_paid' : (totalPaid > 0 ? 'partially_paid' : 'open');
    }

    if (data.description !== undefined) debt.description = data.description;
    if (data.due_date !== undefined) debt.due_date = data.due_date;
    if (data.created_date !== undefined) debt.created_date = data.created_date;
    if (data.notes !== undefined) debt.notes = data.notes;
    debt.updated_at = new Date().toISOString();

    // Recalculate contact balances
    const contact = mockContacts.find(c => c.id === debt.contact_id);
    if (contact) {
      const cDebts = mockDebts.filter(d => d.contact_id === contact.id && d.status !== 'cancelled');
      let forMe = 0;
      let onMe = 0;
      let count = 0;
      for (const d of cDebts) {
        const rem = d.remaining_amount || 0;
        if (d.type === 'for_me') forMe += rem;
        else onMe += rem;
        if (rem > 0) count++;
      }
      contact.total_for_me = forMe;
      contact.total_on_me = onMe;
      contact.net_balance = forMe - onMe;
      contact.active_debts_count = count;
    }

    saveMockData();
    return { success: true, debt };
  },
  cancelDebt: async (id: string, reason: string) => {
    if (window.api) return window.api.cancelDebt(id, reason);
    const debt = mockDebts.find(d => d.id === id);
    if (!debt) return { success: false, message: 'الدين غير موجود' };
    if ((debt.total_paid || 0) > 0) {
      return { success: false, message: 'لا يمكن إلغاء دين يحتوي على دفعات مسجلة' };
    }
    debt.status = 'cancelled';
    debt.notes = (debt.notes ? debt.notes + '\n' : '') + `[ملغي: ${reason}]`;
    saveMockData();
    return { success: true };
  },
  archiveDebt: async (id: string, archive = true) => {
    if (window.api) return window.api.archiveDebt(id, archive);
    const debt = mockDebts.find(d => d.id === id);
    if (debt) {
      debt.is_archived = archive ? 1 : 0;
      saveMockData();
    }
    return { success: true };
  },
  deleteDebt: async (id: string) => {
    if (window.api) return window.api.deleteDebt(id);
    const debtIndex = mockDebts.findIndex(d => d.id === id);
    if (debtIndex === -1) return { success: false, message: 'الدين غير موجود' };
    const debt = mockDebts[debtIndex];

    // Cascade delete all payments associated with this debt
    mockPayments = mockPayments.filter(p => p.debt_id !== id);
    mockDebts.splice(debtIndex, 1);

    // Recalculate contact balances
    const contact = mockContacts.find(c => c.id === debt.contact_id);
    if (contact) {
      const remainingDebts = mockDebts.filter(d => d.contact_id === contact.id && d.status !== 'cancelled' && !d.is_archived);
      let forMe = 0;
      let onMe = 0;
      let count = 0;
      for (const d of remainingDebts) {
        const rem = d.remaining_amount !== undefined ? d.remaining_amount : d.original_amount;
        if (d.type === 'for_me') forMe += rem;
        else onMe += rem;
        if (rem > 0) count++;
      }
      contact.total_for_me = forMe;
      contact.total_on_me = onMe;
      contact.net_balance = forMe - onMe;
      contact.active_debts_count = count;
    }

    mockAuditLogs.unshift({
      id: 'a_' + Date.now(),
      action: 'DELETE_DEBT',
      entity_type: 'debts',
      entity_id: id,
      details: `حذف الدين #${debt.reference_no} نهائياً بالكامل مع كافة مدفوعاته`,
      timestamp: new Date().toISOString()
    });

    saveMockData();
    return { success: true };
  },

  // Payments
  getPayments: async (filter?: any): Promise<Payment[]> => {
    if (window.api) return window.api.getPayments(filter);
    let res = [...mockPayments];
    if (filter?.debt_id) res = res.filter(p => p.debt_id === filter.debt_id);
    if (filter?.contact_id) res = res.filter(p => p.contact_id === filter.contact_id);
    return res;
  },
  recordPayment: async (data: any) => {
    if (window.api) return window.api.recordPayment(data);
    const debt = mockDebts.find(d => d.id === data.debt_id);
    if (!debt) return { success: false, message: 'الدين غير موجود' };

    const amount = Number(data.amount);
    const remaining = debt.remaining_amount || 0;
    if (amount > remaining) {
      return { success: false, message: `مبلغ الدفعة (${amount}) يتجاوز الرصيد المتبقي (${remaining})!` };
    }

    const newRemaining = Math.max(0, remaining - amount);
    const receiptNo = 'REC-2026-' + (mockPayments.length + 1).toString().padStart(4, '0');
    const payment: Payment = {
      id: 'p_' + Date.now(),
      receipt_no: receiptNo,
      debt_id: data.debt_id,
      contact_id: debt.contact_id,
      amount,
      payment_date: data.payment_date || new Date().toISOString(),
      payment_method: data.payment_method,
      notes: data.notes,
      previous_balance: remaining,
      new_balance: newRemaining,
      status: 'valid',
      created_at: new Date().toISOString(),
      debt_description: debt.description,
      debt_type: debt.type,
      contact_name: debt.contact_name,
      currency: debt.currency
    };

    mockPayments.unshift(payment);
    debt.total_paid = (debt.total_paid || 0) + amount;
    debt.remaining_amount = newRemaining;
    debt.status = newRemaining <= 0 ? 'fully_paid' : 'partially_paid';

    // Update contact
    const contact = mockContacts.find(c => c.id === debt.contact_id);
    if (contact) {
      if (debt.type === 'for_me') {
        contact.total_for_me = Math.max(0, (contact.total_for_me || 0) - amount);
      } else {
        contact.total_on_me = Math.max(0, (contact.total_on_me || 0) - amount);
      }
      contact.net_balance = (contact.total_for_me || 0) - (contact.total_on_me || 0);
      if (debt.status === 'fully_paid') {
        contact.active_debts_count = Math.max(0, (contact.active_debts_count || 1) - 1);
      }
    }

    // Add audit log
    mockAuditLogs.unshift({
      id: 'a_' + Date.now(),
      action: 'RECORD_PAYMENT',
      entity_type: 'payments',
      entity_id: payment.id,
      details: `تسجيل دفعة سداد بمبلغ ${amount} لإيصال #${receiptNo}`,
      timestamp: new Date().toISOString()
    });

    saveMockData();
    return { success: true, payment };
  },
  cancelPayment: async (paymentId: string, reason: string) => {
    if (window.api) return window.api.cancelPayment(paymentId, reason);
    const payment = mockPayments.find(p => p.id === paymentId);
    if (!payment) return { success: false, message: 'الدفعة غير موجودة' };
    payment.status = 'cancelled';
    payment.cancellation_reason = reason;

    // Rollback debt remaining amount
    const debt = mockDebts.find(d => d.id === payment.debt_id);
    if (debt) {
      debt.total_paid = Math.max(0, (debt.total_paid || 0) - payment.amount);
      debt.remaining_amount = (debt.remaining_amount || 0) + payment.amount;
      debt.status = debt.total_paid <= 0 ? 'open' : 'partially_paid';

      const contact = mockContacts.find(c => c.id === debt.contact_id);
      if (contact) {
        if (debt.type === 'for_me') {
          contact.total_for_me = (contact.total_for_me || 0) + payment.amount;
        } else {
          contact.total_on_me = (contact.total_on_me || 0) + payment.amount;
        }
        contact.net_balance = (contact.total_for_me || 0) - (contact.total_on_me || 0);
      }
    }

    saveMockData();
    return { success: true };
  },
  getReceiptHtml: async (paymentId: string) => {
    if (window.api) return window.api.getReceiptHtml(paymentId);
    return `<div style="padding: 20px; font-family: Cairo, sans-serif;"><h3>إيصال سداد رَصيدي</h3><p>الدفعة #${paymentId}</p></div>`;
  },

  // Reports
  getDashboardStats: async (): Promise<DashboardStats> => {
    if (window.api) return window.api.getDashboardStats();
    let totalForMe = 0;
    let totalOnMe = 0;
    let netForMe = 0;
    let netOnMe = 0;
    let openCount = 0;
    let overdueCount = 0;
    let fullyPaidCount = 0;

    for (const d of mockDebts) {
      if (d.status === 'cancelled' || d.is_archived) continue;
      if (d.type === 'for_me') {
        totalForMe += d.original_amount;
        netForMe += (d.remaining_amount !== undefined ? d.remaining_amount : d.original_amount);
      } else {
        totalOnMe += d.original_amount;
        netOnMe += (d.remaining_amount !== undefined ? d.remaining_amount : d.original_amount);
      }
      if (d.status === 'fully_paid') {
        fullyPaidCount++;
      } else if (d.status === 'overdue' || d.is_overdue) {
        overdueCount++;
        openCount++;
      } else {
        openCount++;
      }
    }

    let receivedPayments = 0;
    let madePayments = 0;
    for (const p of mockPayments) {
      if (p.status === 'cancelled') continue;
      if (p.debt_type === 'for_me') {
        receivedPayments += p.amount;
      } else {
        madePayments += p.amount;
      }
    }

    const nextDue = mockDebts
      .filter(d => d.status !== 'fully_paid' && d.status !== 'cancelled' && !d.is_archived && d.due_date)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0] || null;

    return {
      total_for_me: totalForMe,
      total_on_me: totalOnMe,
      received_payments: receivedPayments,
      made_payments: madePayments,
      net_for_me: netForMe,
      net_on_me: netOnMe,
      open_debts_count: openCount,
      overdue_debts_count: overdueCount,
      fully_paid_debts_count: fullyPaidCount,
      next_due_debt: nextDue,
      recent_activities: mockAuditLogs,
      currency: mockSettings.currency || 'LYD'
    };
  },
  getMonthlyTrends: async (monthsCount = 6): Promise<MonthlyTrend[]> => {
    if (window.api) return window.api.getMonthlyTrends(monthsCount);
    if (mockDebts.length === 0 && mockPayments.length === 0) {
      return [];
    }
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    const result: MonthlyTrend[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${months[d.getMonth()]} ${d.getFullYear()}`;
      const yMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const forMe = mockDebts
        .filter(debt => debt.type === 'for_me' && (debt.created_date || '').startsWith(yMonth) && debt.status !== 'cancelled')
        .reduce((sum, debt) => sum + debt.original_amount, 0);
      const onMe = mockDebts
        .filter(debt => debt.type === 'on_me' && (debt.created_date || '').startsWith(yMonth) && debt.status !== 'cancelled')
        .reduce((sum, debt) => sum + debt.original_amount, 0);
      const payments = mockPayments
        .filter(p => (p.payment_date || '').startsWith(yMonth) && p.status !== 'cancelled')
        .reduce((sum, p) => sum + p.amount, 0);

      result.push({ month: mStr, for_me: forMe, on_me: onMe, payments });
    }
    return result;
  },
  getStatusBreakdown: async () => {
    if (window.api) return window.api.getStatusBreakdown();
    const activeDebts = mockDebts.filter(d => !d.is_archived && d.status !== 'cancelled');
    const open = activeDebts.filter(d => d.status === 'open').length;
    const partial = activeDebts.filter(d => d.status === 'partially_paid').length;
    const overdue = activeDebts.filter(d => d.status === 'overdue' || (d.is_overdue && d.status !== 'fully_paid')).length;
    const fullyPaid = activeDebts.filter(d => d.status === 'fully_paid').length;
    return [
      { name: 'مفتوح', value: open, color: '#3b82f6' },
      { name: 'مسدد جزئياً', value: partial, color: '#f59e0b' },
      { name: 'متأخر', value: overdue, color: '#ef4444' },
      { name: 'مسدد بالكامل', value: fullyPaid, color: '#10b981' }
    ];
  },

  // Exports
  selectSaveFilePath: async (options: { defaultName: string; extension: string; title?: string }) => {
    if (window.api) return window.api.selectSaveFilePath(options);
    return promptSaveFile(options);
  },
  selectExportDirPath: async (options?: { title?: string }) => {
    if (window.api) return window.api.selectExportDirPath(options);
    return promptSelectDirectory(options?.title);
  },
  exportHtml: async (filePath: string, options: any) => {
    if (window.api) return window.api.exportHtml(filePath, options);
    try {
      const activeDebts = mockDebts.filter(d => d.status !== 'cancelled' && !d.is_archived);
      const validPayments = mockPayments.filter(p => p.status === 'valid');
      const activeContacts = mockContacts.filter(c => !c.is_archived);
      const html = generateBrowserHtmlReport(options, activeDebts, validPayments, activeContacts, mockSettings);
      await writeDataToDestination(filePath, html, 'text/html;charset=utf-8;');
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, filePath: '', message: err?.message || 'فشل حفظ تقرير HTML' };
    }
  },
  exportCsv: async (filePath: string, type: 'debts' | 'payments' | 'contacts') => {
    if (window.api) return window.api.exportCsv(filePath, type);
    try {
      const activeDebts = mockDebts.filter(d => d.status !== 'cancelled' && !d.is_archived);
      const validPayments = mockPayments.filter(p => p.status === 'valid');
      const activeContacts = mockContacts.filter(c => !c.is_archived);
      const csv = generateBrowserCsv(type, activeDebts, validPayments, activeContacts);
      await writeDataToDestination(filePath, csv, 'text/csv;charset=utf-8;');
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, filePath: '', message: err?.message || 'فشل حفظ ملف CSV' };
    }
  },
  exportXlsx: async (filePath: string) => {
    if (window.api) return window.api.exportXlsx(filePath);
    try {
      const activeDebts = mockDebts.filter(d => d.status !== 'cancelled' && !d.is_archived);
      const validPayments = mockPayments.filter(p => p.status === 'valid');
      const activeContacts = mockContacts.filter(c => !c.is_archived);
      const xlsxBuf = generateBrowserXlsx(activeDebts, validPayments, activeContacts);
      await writeDataToDestination(filePath, xlsxBuf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, filePath: '', message: err?.message || 'فشل تصدير ملف Excel' };
    }
  },

  // Backup & Restore
  createBackup: async (targetDestination?: string) => {
    if (window.api) return window.api.createBackup(targetDestination);

    try {
      // Determine destination
      let dest = targetDestination;
      if (!dest) {
        dest = await promptSaveFile({
          defaultName: `raseedi-backup-${new Date().toISOString().slice(0, 10)}.sqlite3`,
          extension: 'sqlite3',
          title: 'تحديد مكان واسم حفظ النسخة الاحتياطية'
        }) || undefined;
      }

      if (!dest) {
        return { success: false, message: 'تم إلغاء عملية النسخ الاحتياطي بواسطة المستخدم' };
      }

      // Serialize snapshot payload
      const backupPayload = {
        app: 'Raseedi',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        contacts: mockContacts,
        debts: mockDebts,
        payments: mockPayments,
        settings: mockSettings,
        auditLogs: mockAuditLogs
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      await writeDataToDestination(dest, jsonStr, 'application/json');

      return {
        success: true,
        backupPath: dest,
        metadata: {
          version: '1.0',
          appVersion: '1.0.0',
          createdAt: new Date().toISOString(),
          checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          contactsCount: mockContacts.length,
          debtsCount: mockDebts.length,
          paymentsCount: mockPayments.length
        }
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'فشل إنشاء النسخة الاحتياطية' };
    }
  },
  selectBackupSavePath: async (options?: { defaultName?: string }) => {
    if (window.api) return window.api.selectBackupSavePath(options);
    return promptSaveFile({
      defaultName: options?.defaultName || `raseedi-backup-${new Date().toISOString().slice(0, 10)}.sqlite3`,
      extension: 'sqlite3',
      title: 'تحديد مكان واسم حفظ ملف النسخة الاحتياطية'
    });
  },
  selectBackupDirPath: async () => {
    if (window.api) return window.api.selectBackupDirPath();
    return promptSelectDirectory('تحديد مجلد حفظ النسخ الاحتياطية');
  },
  selectBackupFile: async () => {
    if (window.api) return window.api.selectBackupFile();
    return new Promise<string | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sqlite3,.db,.json';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          resolve(file.name);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  },
  inspectBackup: async (filePath: string) => {
    if (window.api) return window.api.inspectBackup(filePath);
    return {
      valid: true,
      integrityOk: true,
      metadata: {
        version: '1.0',
        appVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        contactsCount: mockContacts.length,
        debtsCount: mockDebts.length,
        paymentsCount: mockPayments.length
      }
    };
  },
  restoreBackup: async (filePath: string) => {
    if (window.api) return window.api.restoreBackup(filePath);
    return { success: true };
  },

  // Settings
  getSettings: async () => {
    if (window.api) return window.api.getSettings();
    return mockSettings;
  },
  updateSettings: async (settings: Record<string, string>) => {
    if (window.api) return window.api.updateSettings(settings);
    mockSettings = { ...mockSettings, ...settings };
    saveMockData();
    return { success: true };
  },
  resetSettings: async () => {
    if (window.api) return window.api.resetSettings();
    mockSettings = { ...DEFAULT_SETTINGS };
    saveMockData();
    return { success: true };
  },
  resetAllData: async (): Promise<{ success: boolean; message?: string }> => {
    if (window.api && (window.api as any).resetAllData) {
      const res = await (window.api as any).resetAllData();
      if (res && !res.success) return res;
    }
    mockDebts = [];
    mockPayments = [];
    mockContacts = [];
    mockAuditLogs = [];
    mockSettings = { ...DEFAULT_SETTINGS };
    saveMockData();
    return { success: true };
  },
  checkDatabaseIntegrity: async () => {
    if (window.api) return window.api.checkDatabaseIntegrity();
    return { ok: true, message: 'قاعدة البيانات سليمة وخالية من الأخطاء' };
  },
  getAuditLogs: async (limit = 100) => {
    if (window.api) return window.api.getAuditLogs(limit);
    return mockAuditLogs;
  },

  // Demo
  seedDemoData: async () => {
    if (window.api) return window.api.seedDemoData();
    mockContacts = [...INITIAL_DEMO_CONTACTS];
    mockDebts = [...INITIAL_DEMO_DEBTS];
    mockPayments = [...INITIAL_DEMO_PAYMENTS];
    saveMockData();
    return { success: true };
  },
  purgeDemoData: async () => {
    if (window.api) return window.api.purgeDemoData();
    mockContacts = [];
    mockDebts = [];
    mockPayments = [];
    saveMockData();
    return { success: true, count: 3 };
  },
  getDemoStatus: async () => {
    if (window.api) return window.api.getDemoStatus();
    return { hasDemo: mockContacts.some(c => c.name === 'طارق الورفلي') };
  },

  // Window
  minimize: () => window.api?.minimize?.(),
  maximize: () => window.api?.maximize?.(),
  close: () => window.api?.close?.(),
  getVersion: async () => window.api?.getVersion?.() || '1.0.0',
  openExternal: async (url: string) => {
    if (window.api?.openExternal) {
      return window.api.openExternal(url);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return { success: true };
  }
};
