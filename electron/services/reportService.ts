import { getDatabase } from '../db';
import { AuditLog, DashboardStats, MonthlyTrend } from '../db/types';
import { getDebts, roundMoney } from './debtService';
import { getPayments } from './paymentService';

export function getDashboardStats(): DashboardStats {
  const db = getDatabase();
  const allDebts = getDebts({ include_archived: false });
  const allPayments = getPayments({ status: 'valid' });

  let totalForMe = 0;
  let totalOnMe = 0;
  let netForMe = 0;
  let netOnMe = 0;
  let openCount = 0;
  let overdueCount = 0;
  let fullyPaidCount = 0;

  for (const d of allDebts) {
    if (d.status === 'cancelled') continue;

    if (d.type === 'for_me') {
      totalForMe += d.original_amount;
      netForMe += d.remaining_amount || 0;
    } else {
      totalOnMe += d.original_amount;
      netOnMe += d.remaining_amount || 0;
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

  // Calculate payments
  let receivedPayments = 0;
  let madePayments = 0;

  for (const p of allPayments) {
    if (p.debt_type === 'for_me') {
      receivedPayments += p.amount;
    } else if (p.debt_type === 'on_me') {
      madePayments += p.amount;
    }
  }

  // Nearest upcoming due debt (not fully paid, due_date >= today)
  const today = new Date().toISOString().slice(0, 10);
  const upcomingDebts = allDebts
    .filter(d => d.due_date && d.due_date >= today && (d.remaining_amount || 0) > 0 && d.status !== 'cancelled')
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1));

  const nextDue = upcomingDebts.length > 0 ? upcomingDebts[0] : null;

  // Recent activities
  const recentAudit = db.prepare(`
    SELECT * FROM audit_logs 
    ORDER BY timestamp DESC 
    LIMIT 8
  `).all() as AuditLog[];

  const currencySetting = db.prepare("SELECT value FROM app_settings WHERE key = 'currency'").get() as { value: string } | undefined;

  return {
    total_for_me: roundMoney(totalForMe),
    total_on_me: roundMoney(totalOnMe),
    received_payments: roundMoney(receivedPayments),
    made_payments: roundMoney(madePayments),
    net_for_me: roundMoney(netForMe),
    net_on_me: roundMoney(netOnMe),
    open_debts_count: openCount,
    overdue_debts_count: overdueCount,
    fully_paid_debts_count: fullyPaidCount,
    next_due_debt: nextDue,
    recent_activities: recentAudit,
    currency: currencySetting?.value || 'LYD'
  };
}

export function getMonthlyTrends(monthsCount = 6): MonthlyTrend[] {
  const debts = getDebts({ include_archived: false });
  const payments = getPayments({ status: 'valid' });

  // Generate list of the past N months
  const result: MonthlyTrend[] = [];
  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Arabic month label
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const label = `${arabicMonths[d.getMonth()]} ${d.getFullYear()}`;

    let forMe = 0;
    let onMe = 0;

    for (const debt of debts) {
      if (debt.status === 'cancelled') continue;
      if (debt.created_date.startsWith(monthKey)) {
        if (debt.type === 'for_me') {
          forMe += debt.original_amount;
        } else {
          onMe += debt.original_amount;
        }
      }
    }

    let paymentsTotal = 0;
    for (const p of payments) {
      if (p.payment_date.startsWith(monthKey)) {
        paymentsTotal += p.amount;
      }
    }

    result.push({
      month: label,
      for_me: roundMoney(forMe),
      on_me: roundMoney(onMe),
      payments: roundMoney(paymentsTotal)
    });
  }

  return result;
}

export function getDebtsByStatusStats() {
  const debts = getDebts({ include_archived: false });
  const stats = {
    open: 0,
    partially_paid: 0,
    overdue: 0,
    fully_paid: 0
  };

  for (const d of debts) {
    if (d.status === 'cancelled') continue;
    if (d.status in stats) {
      stats[d.status as keyof typeof stats]++;
    }
  }

  return [
    { name: 'مفتوح', value: stats.open, color: '#3b82f6' },
    { name: 'مسدد جزئياً', value: stats.partially_paid, color: '#f59e0b' },
    { name: 'متأخر', value: stats.overdue, color: '#ef4444' },
    { name: 'مسدد بالكامل', value: stats.fully_paid, color: '#10b981' }
  ];
}
