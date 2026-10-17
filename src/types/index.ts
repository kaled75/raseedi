export type NavigationTab = 
  | 'dashboard'
  | 'contacts'
  | 'debts_for_me'
  | 'debts_on_me'
  | 'all_debts'
  | 'payments'
  | 'calendar'
  | 'reports'
  | 'export'
  | 'backup'
  | 'settings'
  | 'about';

export type DebtType = 'for_me' | 'on_me';
export type DebtStatus = 'open' | 'partially_paid' | 'overdue' | 'fully_paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'other';
export type PaymentStatus = 'valid' | 'cancelled';

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
  created_date: string;
  due_date?: string | null;
  description: string;
  recording_method: string;
  notes?: string;
  status: DebtStatus;
  is_archived: number;
  created_at: string;
  updated_at: string;
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
  payment_date: string;
  payment_method: PaymentMethod;
  reference_no?: string;
  notes?: string;
  previous_balance: number;
  new_balance: number;
  status: PaymentStatus;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  debt_description?: string;
  debt_type?: DebtType;
  contact_name?: string;
  currency?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  total_for_me: number;
  total_on_me: number;
  received_payments: number;
  made_payments: number;
  net_for_me: number;
  net_on_me: number;
  open_debts_count: number;
  overdue_debts_count: number;
  fully_paid_debts_count: number;
  next_due_debt?: Debt | null;
  recent_activities: AuditLog[];
  currency: string;
}

export interface MonthlyTrend {
  month: string;
  for_me: number;
  on_me: number;
  payments: number;
}
