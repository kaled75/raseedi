import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Edit, 
  Archive, 
  Trash2, 
  LayoutGrid, 
  List 
} from 'lucide-react';
import { Contact } from '../types';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

interface ContactsViewProps {
  refreshTrigger?: number;
  searchQuery?: string;
  onOpenNewContact: () => void;
  onEditContact: (contact: Contact) => void;
  onViewStatement: (contact: Contact) => void;
  onOpenNewDebtForContact?: (contactId: string) => void;
  onDataChange?: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  refreshTrigger,
  searchQuery,
  onOpenNewContact,
  onEditContact,
  onViewStatement,
  onDataChange
}) => {
  const { formatMoney } = useSettings();
  const { success, error } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'has_debts' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);

  // Archive / Delete confirmation
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadContacts = async () => {
    try {
      const data = await api.getContacts({ include_archived: true });
      setContacts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [filterType, refreshTrigger]);

  const effectiveSearch = (searchQuery || search).trim().toLowerCase();

  const filteredContacts = contacts.filter(c => {
    // Search
    if (effectiveSearch) {
      const matchName = c.name.toLowerCase().includes(effectiveSearch);
      const matchPhone = c.phone?.toLowerCase().includes(effectiveSearch);
      if (!matchName && !matchPhone) return false;
    }

    if (filterType === 'archived') return c.is_archived === 1;
    if (c.is_archived === 1) return false;

    if (filterType === 'has_debts') {
      return (c.active_debts_count || 0) > 0 || (c.total_for_me || 0) > 0 || (c.total_on_me || 0) > 0;
    }

    return true;
  });

  const handleArchive = async (id: string, archive: boolean) => {
    const res = await api.archiveContact(id, archive);
    if (res.success) {
      success(archive ? 'تمت أرشفة الشخص' : 'تمت استعادة الشخص من الأرشيف');
      loadContacts();
      onDataChange?.();
    } else {
      error(res.message || 'فشلت العملية');
    }
    setConfirmArchiveId(null);
  };

  const handleDelete = async (id: string) => {
    const res = await api.deleteContact(id);
    if (res.success) {
      success('تم حذف جهة الاتصال بنجاح');
      loadContacts();
      onDataChange?.();
    } else {
      error(res.message || 'فشل الحذف');
    }
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-5 animate-fade-in text-right">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <span>سجل الأشخاص والجهات</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">إدارة بيانات الأصدقاء، والأقارب، والأطراف المالية المرتبطة بالديون</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onOpenNewContact}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إضافة شخص جديد</span>
          </button>
        </div>
      </div>

      {/* Filters and View Switcher */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-10 pl-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterType === 'all'
                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            الكل ({contacts.filter(c => !c.is_archived).length})
          </button>
          <button
            onClick={() => setFilterType('has_debts')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterType === 'has_debts'
                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            لديهم ديون نشطة
          </button>
          <button
            onClick={() => setFilterType('archived')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filterType === 'archived'
                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            المؤرشفون ({contacts.filter(c => c.is_archived).length})
          </button>
        </div>

        {/* Grid/Table Switch */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            title="عرض كبطاقات"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-sky-600' : 'text-slate-400'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="عرض كجدول"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-800 text-sky-600' : 'text-slate-400'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contacts List / Grid */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          title="لم يتم العثور على أية جهات اتصال"
          description="يمكنك البدء بإضافة الأصدقاء والأقارب لتسجيل المعاملات المالية معهم."
          actionText="+ إضافة شخص الآن"
          onAction={onOpenNewContact}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(c => {
            const net = c.net_balance || 0;
            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Avatar & Name */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                          {c.name}
                        </h4>
                        {c.phone && (
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {c.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.is_archived === 1 && (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
                        مؤرشف
                      </span>
                    )}
                  </div>

                  {/* Contact Info snippets */}
                  {(c.email || c.address) && (
                    <div className="text-[11px] text-slate-400 space-y-1 mb-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {c.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.address && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Balances Pill */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 mb-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">مستحق لي (عنده)</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {formatMoney(c.total_for_me || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">مستحق عليّ (له)</span>
                      <span className="font-bold text-rose-600 font-mono">
                        {formatMoney(c.total_on_me || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Net Balance Status */}
                  <div className="flex items-center justify-between text-xs px-1 mb-4">
                    <span className="text-slate-400">صافي الموقف المالي:</span>
                    <span className={`font-black font-mono ${
                      net > 0 ? 'text-emerald-600' : net < 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}>
                      {formatMoney(net)}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => onViewStatement(c)}
                    className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>كشف حساب</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditContact(c)}
                      title="تعديل بيانات الشخص"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleArchive(c.id, c.is_archived === 0)}
                      title={c.is_archived ? 'استعادة من الأرشيف' : 'أرشفة'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      title="حذف"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">الاسم</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">البريد الإلكتروني</th>
                  <th className="py-3 px-4">مستحق لي</th>
                  <th className="py-3 px-4">مستحق عليّ</th>
                  <th className="py-3 px-4">صافي الرصيد</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContacts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{c.phone || '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{c.email || '-'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">{formatMoney(c.total_for_me || 0)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">{formatMoney(c.total_on_me || 0)}</td>
                    <td className="py-3 px-4 font-mono font-black">{formatMoney(c.net_balance || 0)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewStatement(c)}
                          className="px-2 py-1 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-semibold text-[11px]"
                        >
                          كشف حساب
                        </button>
                        <button
                          onClick={() => onEditContact(c)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="تأكيد حذف جهة الاتصال"
        message="هل أنت متأكد من رغبتك في حذف هذا الشخص نهائياً؟ تنبيه: سيتم حذف هذا الشخص مع كافة الديون والمدفوعات والإيصالات المرتبطة به بشكل كامل."
        confirmText="تأكيد الحذف نهائياً"
        isDestructive={true}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
