export type DebtType = 'for_me' | 'on_me'; // 'for_me': مستحقة لي (أقرضته), 'on_me': مستحقة عليّ (اقترضت منه)
export type DebtStatus = 'open' | 'partially_paid' | 'overdue' | 'fully_paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'other';
export type PaymentStatus = 'valid' | 'cancelled';
export type AuditAction = 
  | 'AUTH_SETUP'
  | 'AUTH_LOGIN'
  | 'AUTH_LOCK'
  | 'AUTH_CHANGE_PASSWORD'
  | 'AUTH_REMOVE_PASSWORD'
  | 'CREATE_CONTACT'
  | 'UPDATE_CONTACT'
  | 'ARCHIVE_CONTACT'
  | 'DELETE_CONTACT'
  | 'CREATE_DEBT'
  | 'UPDATE_DEBT'
  | 'CANCEL_DEBT'
  | 'DELETE_DEBT'
  | 'RECORD_PAYMENT'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_MADE'
  | 'CANCEL_PAYMENT'
  | 'UPDATE_SETTINGS'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'SEED_DEMO_DATA'
  | 'PURGE_DEMO_DATA'
  | 'RESET_ALL_DATA';

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface LocalAuth {
  id: number;
  password_hash: string;
  salt: string;
  hint?: string;
  is_configured: number;
  failed_attempts: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  avatar?: string;
  notes?: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
  // Computed / aggregated
  total_for_me?: number;
  total_on_me?: number;
  net_balance?: number;
  active_debts_count?: number;
}

export interface Debt {
  id: string;
  reference_no: string;
  contact_id: string;
  type: DebtType;
  original_amount: number;
  currency: string;
  created_date: string; // YYYY-MM-DD
  due_date?: string | null; // YYYY-MM-DD
  description: string;
  recording_method: string;
  notes?: string;
  status: DebtStatus;
  is_archived: number;
  created_at: string;
  updated_at: string;
  // Joined or computed fields
  contact_name?: string;
  contact_phone?: string;
  total_paid?: number;
  remaining_amount?: number;
  payments_count?: number;
  is_overdue?: boolean;
}

export interface Payment {
  id: string;
  receipt_no: string;
  debt_id: string;
  contact_id: string;
  amount: number;
  payment_date: string; // ISO string or YYYY-MM-DD HH:MM
  payment_method: PaymentMethod;
  reference_no?: string;
  notes?: string;
  previous_balance: number;
  new_balance: number;
  status: PaymentStatus;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  // Joined fields
  debt_description?: string;
  debt_type?: DebtType;
  contact_name?: string;
  currency?: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  details: string; // JSON string
  timestamp: string;
}

export interface Reminder {
  id: string;
  debt_id: string;
  reminder_date: string;
  title: string;
  message: string;
  is_dismissed: number;
  created_at: string;
}

export interface DashboardStats {
  total_for_me: number; // إجمالي ما أقرضته للآخرين
  total_on_me: number;  // إجمالي ما اقترضته من الآخرين
  received_payments: number; // إجمالي ما استلمته من دفعات
  made_payments: number;     // إجمالي ما سددته من ديون
  net_for_me: number;   // صافي المبالغ المستحقة لي حالياً (المتبقي)
  net_on_me: number;    // صافي المبالغ المستحقة عليّ حالياً (المتبقي)
  open_debts_count: number;
  overdue_debts_count: number;
  fully_paid_debts_count: number;
  next_due_debt?: Debt | null;
  recent_activities: AuditLog[];
  currency: string;
}

export interface MonthlyTrend {
  month: string; // e.g. "2026-05" or "مايو 2026"
  for_me: number;
  on_me: number;
  payments: number;
}
