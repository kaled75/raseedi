import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatusBar } from './components/layout/StatusBar';
import { LoginModal } from './components/auth/LoginModal';
import { DebtModal } from './components/debts/DebtModal';
import { PaymentModal } from './components/payments/PaymentModal';
import { ReceiptModal } from './components/payments/ReceiptModal';
import { ContactModal } from './components/contacts/ContactModal';
import { ContactStatementModal } from './components/contacts/ContactStatementModal';

import { DashboardView } from './views/DashboardView';
import { ContactsView } from './views/ContactsView';
import { DebtsForMeView } from './views/DebtsForMeView';
import { DebtsOnMeView } from './views/DebtsOnMeView';
import { AllDebtsView } from './views/AllDebtsView';
import { PaymentsView } from './views/PaymentsView';
import { CalendarView } from './views/CalendarView';
import { ReportsView } from './views/ReportsView';
import { ExportView } from './views/ExportView';
import { BackupView } from './views/BackupView';
import { SettingsView } from './views/SettingsView';
import { AboutView } from './views/AboutView';

import { NavigationTab, Debt, Contact, Payment } from './types';
import { api } from './utils/api';
import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {
  const { isLocked } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Contacts & Debts cache for modals and status
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | undefined>(undefined);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [statementContact, setStatementContact] = useState<Contact | null>(null);
  const [recentPaymentForReceipt, setRecentPaymentForReceipt] = useState<Payment | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [cList, dList] = await Promise.all([
        api.getContacts({ include_archived: false }),
        api.getDebts({ include_archived: false })
      ]);
      setContacts(cList);
      setDebts(dList);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Quick action openers
  const handleOpenNewDebt = () => {
    setEditingDebt(null);
    setIsDebtModalOpen(true);
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setIsDebtModalOpen(true);
  };

  const handleOpenNewPayment = (debtId?: string) => {
    setPaymentDebtId(debtId);
    setIsPaymentModalOpen(true);
  };

  const handleOpenNewContact = () => {
    setEditingContact(null);
    setIsContactModalOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsContactModalOpen(true);
  };

  const handleViewStatement = (contact: Contact) => {
    setStatementContact(contact);
  };

  const handlePaymentRecorded = (payment: Payment) => {
    triggerRefresh();
    setRecentPaymentForReceipt(payment);
  };

  // Active debts count
  const openDebtsCount = debts.filter(d => (d.remaining_amount || 0) > 0 && d.status !== 'cancelled').length;
  const overdueDebtsCount = debts.filter(d => (d.is_overdue || d.status === 'overdue') && (d.remaining_amount || 0) > 0).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar with 12 Sections */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        stats={{
          overdueCount: overdueDebtsCount,
          openCount: openDebtsCount
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenNewDebt={handleOpenNewDebt}
          onOpenNewPayment={() => handleOpenNewPayment()}
          onOpenNewContact={handleOpenNewContact}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                key={`dashboard_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
                onOpenNewDebt={handleOpenNewDebt}
                onOpenNewPayment={handleOpenNewPayment}
                onNavigateToDebts={(type) => {
                  if (type === 'for_me') setCurrentTab('debts_for_me');
                  else if (type === 'on_me') setCurrentTab('debts_on_me');
                  else setCurrentTab('all_debts');
                }}
                onNavigateToCalendar={() => setCurrentTab('calendar')}
              />
            )}

            {currentTab === 'contacts' && (
              <ContactsView
                key={`contacts_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
                onOpenNewContact={handleOpenNewContact}
                onEditContact={handleEditContact}
                onViewStatement={handleViewStatement}
                onDataChange={triggerRefresh}
              />
            )}

            {currentTab === 'debts_for_me' && (
              <DebtsForMeView
                key={`debts_for_me_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
                onOpenNewDebt={handleOpenNewDebt}
                onRecordPayment={handleOpenNewPayment}
                onEditDebt={handleEditDebt}
                onDataChange={triggerRefresh}
              />
            )}

            {currentTab === 'debts_on_me' && (
              <DebtsOnMeView
                key={`debts_on_me_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
                onOpenNewDebt={handleOpenNewDebt}
                onRecordPayment={handleOpenNewPayment}
                onEditDebt={handleEditDebt}
                onDataChange={triggerRefresh}
              />
            )}

            {currentTab === 'all_debts' && (
              <AllDebtsView
                key={`all_debts_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
                onOpenNewDebt={handleOpenNewDebt}
                onRecordPayment={handleOpenNewPayment}
                onEditDebt={handleEditDebt}
                onDataChange={triggerRefresh}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                key={`payments_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
                onOpenNewPayment={() => handleOpenNewPayment()}
                onDataChange={triggerRefresh}
              />
            )}

            {currentTab === 'calendar' && (
              <CalendarView
                key={`calendar_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                key={`reports_${refreshTrigger}`}
                refreshTrigger={refreshTrigger}
              />
            )}

            {currentTab === 'export' && <ExportView />}

            {currentTab === 'backup' && <BackupView />}

            {currentTab === 'settings' && <SettingsView />}

            {currentTab === 'about' && <AboutView />}
          </div>
        </main>

        {/* Bottom Status Bar */}
        <StatusBar
          openDebtsCount={openDebtsCount}
          overdueDebtsCount={overdueDebtsCount}
        />
      </div>

      {/* Auth Screen / Lock Modal */}
      <LoginModal />

      {/* Debt Add/Edit Modal */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        debt={editingDebt}
        onSaved={triggerRefresh}
        contacts={contacts}
        onOpenNewContact={() => {
          setIsDebtModalOpen(false);
          handleOpenNewContact();
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        debts={debts}
        preselectedDebtId={paymentDebtId}
        onPaymentRecorded={handlePaymentRecorded}
      />

      {/* Receipt View & Print Modal */}
      <ReceiptModal
        isOpen={!!recentPaymentForReceipt}
        onClose={() => setRecentPaymentForReceipt(null)}
        payment={recentPaymentForReceipt}
      />

      {/* Contact Add/Edit Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        contact={editingContact}
        onSaved={triggerRefresh}
      />

      {/* Contact Statement Modal */}
      <ContactStatementModal
        isOpen={!!statementContact}
        onClose={() => setStatementContact(null)}
        contact={statementContact}
      />
    </div>
  );
};
