import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  FileCode, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Check, 
  Download, 
  Settings2,
  Calendar,
  Users,
  FolderOpen,
  Folder
} from 'lucide-react';
import { Contact } from '../types';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { SaveLocationModal } from '../components/common/SaveLocationModal';

export const ExportView: React.FC = () => {
  const { currency, settings } = useSettings();
  const { success, error } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reportType, setReportType] = useState<'all' | 'for_me' | 'on_me' | 'contact' | 'overdue' | 'settled'>('all');
  const [reportTitle, setReportTitle] = useState('التقرير المالي الشامل للديون والمعاملات');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showPayments, setShowPayments] = useState(true);
  const [reportTheme, setReportTheme] = useState<'light' | 'dark'>('light');
  const [reportLang, setReportLang] = useState<'ar' | 'en'>('ar');
  const [loading, setLoading] = useState(false);

  // Custom save directory state
  const [customExportDir, setCustomExportDir] = useState<string>('');

  // Interactive Save Modal state
  const [saveModal, setSaveModal] = useState<{
    isOpen: boolean;
    title: string;
    defaultFileName: string;
    extension: string;
    fileTypeLabel: string;
    actionType: 'html' | 'xlsx' | 'csv_debts' | 'csv_payments' | 'csv_contacts';
  }>({
    isOpen: false,
    title: '',
    defaultFileName: '',
    extension: 'html',
    fileTypeLabel: '',
    actionType: 'html'
  });

  useEffect(() => {
    api.getContacts({ include_archived: false }).then(setContacts);
  }, []);

  const handleSelectExportDir = async () => {
    try {
      const chosenDir = await api.selectExportDirPath({ title: 'اختيار مجلد حفظ التقارير' });
      if (chosenDir) {
        setCustomExportDir(chosenDir);
        success(`تم تحديد مجلد حفظ التقارير: ${chosenDir}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportHtml = async () => {
    const defaultFilename = `تقرير_ديون_${new Date().toISOString().slice(0, 10)}.html`;
    setLoading(true);
    try {
      const chosenPath = await api.selectSaveFilePath({
        defaultName: defaultFilename,
        extension: 'html',
        title: 'تحديد مكان واسم حفظ تقرير HTML'
      });

      if (!chosenPath) {
        // User clicked cancel in Save As dialog
        return;
      }

      const res = await api.exportHtml(chosenPath, {
        title: reportTitle.trim() || 'تقرير رَصيدي المالي',
        reportType,
        contactId: selectedContactId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        showPhone,
        showNotes,
        showPayments,
        theme: reportTheme,
        language: reportLang,
        ownerName: settings.owner_name || '',
        currency
      });

      if (res.success) {
        success(`تم حفظ تقرير HTML بنجاح في المكان المحدد: ${chosenPath}`);
      } else {
        error(res.message || 'فشل التصدير');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        error(e?.message || 'حدث خطأ أثناء التصدير');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async (type: 'debts' | 'payments' | 'contacts') => {
    const typeLabel = type === 'debts' ? 'الديون' : type === 'payments' ? 'المدفوعات' : 'الأشخاص';
    const defaultFilename = `سجل_${typeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    setLoading(true);
    try {
      const chosenPath = await api.selectSaveFilePath({
        defaultName: defaultFilename,
        extension: 'csv',
        title: `تحديد مكان واسم حفظ ملف CSV (${typeLabel})`
      });

      if (!chosenPath) return;

      const res = await api.exportCsv(chosenPath, type);
      if (res.success) {
        success(`تم حفظ ملف CSV بنجاح في المكان المحدد: ${chosenPath}`);
      } else {
        error(res.message || 'فشل تصدير CSV');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        error(e?.message || 'حدث خطأ أثناء التصدير');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportXlsx = async () => {
    const defaultFilename = `سجلات_رصيدي_الشاملة_${new Date().toISOString().slice(0, 10)}.xlsx`;
    setLoading(true);
    try {
      const chosenPath = await api.selectSaveFilePath({
        defaultName: defaultFilename,
        extension: 'xlsx',
        title: 'تحديد مكان واسم حفظ مصنف Excel'
      });

      if (!chosenPath) return;

      const res = await api.exportXlsx(chosenPath);
      if (res.success) {
        success(`تم حفظ مصنف Excel بنجاح في المكان المحدد: ${chosenPath}`);
      } else {
        error(res.message || 'فشل التصدير إلى Excel');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        error(e?.message || 'حدث خطأ أثناء التصدير');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async (chosenFileName: string) => {
    setLoading(true);
    try {
      if (saveModal.actionType === 'html') {
        const res = await api.exportHtml(chosenFileName, {
          title: reportTitle.trim() || 'تقرير رَصيدي المالي',
          reportType,
          contactId: selectedContactId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          showPhone,
          showNotes,
          showPayments,
          theme: reportTheme,
          language: reportLang,
          ownerName: settings.owner_name || '',
          currency
        });

        if (res.success) {
          success(`تم حفظ وتنزيل تقرير HTML بنجاح: ${chosenFileName}`);
          setSaveModal(prev => ({ ...prev, isOpen: false }));
        } else {
          error(res.message || 'فشل التصدير');
        }
      } else if (saveModal.actionType === 'xlsx') {
        const res = await api.exportXlsx(chosenFileName);
        if (res.success) {
          success(`تم حفظ وتنزيل مصنف Excel بنجاح: ${chosenFileName}`);
          setSaveModal(prev => ({ ...prev, isOpen: false }));
        } else {
          error(res.message || 'فشل التصدير إلى Excel');
        }
      } else {
        const type = saveModal.actionType === 'csv_debts' ? 'debts' : saveModal.actionType === 'csv_payments' ? 'payments' : 'contacts';
        const res = await api.exportCsv(chosenFileName, type);
        if (res.success) {
          success(`تم حفظ وتنزيل ملف CSV بنجاح: ${chosenFileName}`);
          setSaveModal(prev => ({ ...prev, isOpen: false }));
        } else {
          error(res.message || 'فشل تصدير CSV');
        }
      }
    } catch (e: any) {
      error(e?.message || 'حدث خطأ أثناء الحفظ والتنزيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-sky-600" />
          <span>مركز التصدير واختيار مكان الحفظ</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          إنشاء تقارير HTML تفاعلية ومستقلة، وتصدير جداول Excel وCSV مع إمكانية تحديد مجلد أو مسار الحفظ الذي تفضله في جهازك
        </p>
      </div>

      {/* Global Save Location Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 shrink-0">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              مجلد الحفظ المفضل (اختياري):
            </span>
            <span className="text-[11px] text-slate-400 font-mono block truncate max-w-md dir-ltr text-left">
              {customExportDir || 'سؤال وتحديد مكان الحفظ في كل عملية (Save As Prompt)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSelectExportDir}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
            <span>{customExportDir ? 'تغيير المجلد...' : 'اختيار مجلد مسبق للحفظ...'}</span>
          </button>
          {customExportDir && (
            <button
              type="button"
              onClick={() => setCustomExportDir('')}
              className="text-slate-400 hover:text-rose-500 text-[11px]"
            >
              إعادة ضبط
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main HTML Report Builder */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileCode className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              تخصيص وتوليد تقرير HTML التفاعلي المستقل
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Title */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان التقرير
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Scope / Type */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع ونطاق التقرير
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'كافة الديون' },
                  { id: 'for_me', label: 'المستحقة لي (إقراض)' },
                  { id: 'on_me', label: 'المستحقة عليّ (اقتراض)' },
                  { id: 'overdue', label: 'الديون المتأخرة فقط' },
                  { id: 'settled', label: 'الديون المسددة بالكامل' },
                  { id: 'contact', label: 'شخص محدد' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReportType(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                      reportType === item.id
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Contact Selector if chosen */}
            {reportType === 'contact' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اختر الشخص المطلوب
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="">-- اختر من القائمة --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold block text-slate-700 dark:text-slate-300 mb-2">خيارات المحتوى والخصوصية:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPhone}
                  onChange={(e) => setShowPhone(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>تضمين أرقام الهواتف في التقرير</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNotes}
                  onChange={(e) => setShowNotes(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>تضمين الملاحظات والتفاصيل الوصفية للديون</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPayments}
                  onChange={(e) => setShowPayments(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>تضمين سجل الدفعات والحركات المسددة المرتبطة</span>
              </label>
            </div>

            {/* Theme and Language */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مظهر التقرير</label>
                <select
                  value={reportTheme}
                  onChange={(e) => setReportTheme(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                >
                  <option value="light">مظهر فاتح (مثالي للطباعة)</option>
                  <option value="dark">مظهر داكن عصري</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">لغة واتجاه التقرير</label>
                <select
                  value={reportLang}
                  onChange={(e) => setReportLang(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                >
                  <option value="ar">اللغة العربية (يمين إلى يسار RTL)</option>
                  <option value="en">English (Left to Right LTR)</option>
                </select>
              </div>
            </div>

            {/* Export HTML Button */}
            <button
              onClick={handleExportHtml}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              <Download className="w-4 h-4" />
              <span>{loading ? 'جاري فتح نافذة الحفظ...' : 'تصدير واختيار مكان حفظ تقرير HTML 🌐'}</span>
            </button>
          </div>
        </div>

        {/* Other Formats Column */}
        <div className="space-y-4">
          {/* Excel XLSX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <FileSpreadsheet className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">مصنف Excel (XLSX)</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              تصدير مصنف إكسل احترافي يحتوي على 3 أوراق عمل مستقلة ومنسقة (الديون، الأشخاص، المدفوعات).
            </p>
            <button
              onClick={handleExportXlsx}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير واختيار مكان حفظ Excel (.xlsx)</span>
            </button>
          </div>

          {/* CSV Files */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-sky-600 mb-2">
              <FileText className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">ملفات CSV مخصصة</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              تصدير ملفات نصية مجدولة بترميز UTF-8 مع BOM لضمان عدم تلف الحروف العربية عند الفتح في إكسل.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleExportCsv('debts')}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right flex items-center justify-between"
              >
                <span>تصدير واختيار مكان حفظ الديون (CSV)</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleExportCsv('payments')}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right flex items-center justify-between"
              >
                <span>تصدير واختيار مكان حفظ المدفوعات (CSV)</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleExportCsv('contacts')}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right flex items-center justify-between"
              >
                <span>تصدير واختيار مكان حفظ الأشخاص (CSV)</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Save Location Modal */}
      <SaveLocationModal
        isOpen={saveModal.isOpen}
        onClose={() => setSaveModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmSave}
        title={saveModal.title}
        defaultFileName={saveModal.defaultFileName}
        extension={saveModal.extension}
        fileTypeLabel={saveModal.fileTypeLabel}
        loading={loading}
      />
    </div>
  );
};
