import React, { useState, useEffect } from 'react';
import { 
  DatabaseBackup, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  FileCheck, 
  RefreshCw,
  HardDrive,
  FolderOpen,
  Folder,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SaveLocationModal } from '../components/common/SaveLocationModal';

export const BackupView: React.FC = () => {
  const { success, error, warning } = useToast();
  const { settings, updateSettings } = useSettings();

  const [loading, setLoading] = useState(false);
  const [customBackupDir, setCustomBackupDir] = useState(settings.backup_dir || '');
  const [lastBackupInfo, setLastBackupInfo] = useState<{ path: string; checksum: string } | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Restore flow state
  const [selectedBackupPath, setSelectedBackupPath] = useState<string | null>(null);
  const [inspectResult, setInspectResult] = useState<any | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    setCustomBackupDir(settings.backup_dir || '');
  }, [settings.backup_dir]);

  // 1. User picks exact location and file name via Save As Dialog
  const handleBackupWithSaveLocation = async () => {
    const defaultFilename = `raseedi-backup-${new Date().toISOString().slice(0, 10)}.sqlite3`;
    setLoading(true);
    try {
      const chosenPath = await api.selectBackupSavePath({ defaultName: defaultFilename });
      if (!chosenPath) {
        // User clicked cancel in Save As dialog
        return;
      }
      const res = await api.createBackup(chosenPath);
      if (res.success && res.backupPath) {
        setLastBackupInfo({
          path: res.backupPath,
          checksum: res.metadata?.checksumSha256 || 'تم التحقق'
        });
        success(`تم حفظ النسخة الاحتياطية بنجاح في المكان المختار: ${res.backupPath}`);
      } else {
        error(res.message || 'فشل إنشاء النسخة الاحتياطية');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        error(e?.message || 'خطأ أثناء النسخ الاحتياطي');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSaveBackup = async (chosenFileName: string) => {
    setLoading(true);
    try {
      const chosenPath = await api.selectBackupSavePath({ defaultName: chosenFileName }) || chosenFileName;
      const res = await api.createBackup(chosenPath);
      if (res.success && res.backupPath) {
        setLastBackupInfo({
          path: res.backupPath,
          checksum: res.metadata?.checksumSha256 || 'تم التحقق'
        });
        success(`تم حفظ وتنزيل النسخة الاحتياطية بنجاح: ${res.backupPath}`);
        setSaveModalOpen(false);
      } else {
        error(res.message || 'فشل إنشاء النسخة الاحتياطية');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        error(e?.message || 'خطأ أثناء النسخ الاحتياطي');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. User picks a dedicated backup folder
  const handleSelectCustomDir = async () => {
    try {
      const dirPath = await api.selectBackupDirPath();
      if (dirPath) {
        setCustomBackupDir(dirPath);
        await updateSettings({ backup_dir: dirPath });
        success(`تم تعيين مجلد النسخ الاحتياطي: ${dirPath}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Backup to the configured directory
  const handleBackupToConfiguredDir = async () => {
    // If no custom backup directory is configured, always redirect to Save As location picker
    if (!customBackupDir) {
      return handleBackupWithSaveLocation();
    }

    const confirmed = window.confirm(
      `هل تريد حفظ النسخة الاحتياطية مباشرة داخل المجلد التالي:\n\n${customBackupDir}\n\nاضغط [موافق] للمتابعة، أو [إلغاء] لتحديد مكان آخر.`
    );
    if (!confirmed) {
      return handleBackupWithSaveLocation();
    }

    setLoading(true);
    try {
      const res = await api.createBackup(customBackupDir);
      if (res.success && res.backupPath) {
        setLastBackupInfo({
          path: res.backupPath,
          checksum: res.metadata?.checksumSha256 || 'تم التحقق'
        });
        success(`تم إنشاء النسخة الاحتياطية بنجاح في: ${res.backupPath}`);
      } else {
        error(res.message || 'فشل إنشاء النسخة الاحتياطية');
      }
    } catch (e: any) {
      error(e?.message || 'خطأ أثناء النسخ الاحتياطي');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFileToRestore = async () => {
    try {
      const filePath = await api.selectBackupFile();
      if (!filePath) return;

      setSelectedBackupPath(filePath);
      setLoading(true);

      const inspection = await api.inspectBackup(filePath);
      setInspectResult(inspection);

      if (!inspection.valid) {
        error(inspection.message || 'الملف المختار غير صالح كنسخة احتياطية لتطبيق رَصيدي');
      } else {
        warning('تم التحقق من سلامة بنية الملف. راجع ملخص البيانات قبل التأكيد.');
      }
    } catch (e: any) {
      error(e?.message || 'فشل فحص الملف');
    } finally {
      setLoading(false);
    }
  };

  const executeRestore = async () => {
    if (!selectedBackupPath) return;

    setLoading(true);
    try {
      const res = await api.restoreBackup(selectedBackupPath);
      if (res.success) {
        success('تمت استعادة البيانات بنجاح تام! يرجى إعادة تحميل الواجهة.');
        setInspectResult(null);
        setSelectedBackupPath(null);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        error(res.message || 'فشلت عملية الاستعادة');
      }
    } catch (e: any) {
      error(e?.message || 'خطأ أثناء الاستعادة');
    } finally {
      setLoading(false);
      setConfirmRestore(false);
    }
  };

  const copyPathToClipboard = (pathText: string) => {
    navigator.clipboard.writeText(pathText);
    setCopiedPath(true);
    success('تم نسخ مسار الملف إلى الحافظة');
    setTimeout(() => setCopiedPath(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <DatabaseBackup className="w-5 h-5 text-sky-600" />
          <span>إدارة النسخ الاحتياطي وتحديد مكان الحفظ</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          يمكنك اختيار مجلد أو مسار حفظ مخصص (على فلاش ميموري USB، أو قرص D، أو سطح المكتب)، والتحقق من بصمة SHA-256 قبل الاستعادة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Backup Box with Location Picker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">
              إنشاء نسخة احتياطية واختيار مكان الحفظ
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              اختر أين تريد حفظ ملف النسخة الاحتياطية لتتمكن من تخزينه في مكان آمن، أو على وسيط خارجي مثل فلاش ديسك.
            </p>

            {/* Folder Selection Option */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs mb-4 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                مجلد النسخ الاحتياطي الحالي:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={customBackupDir || 'المجلد الافتراضي (مجلد بيانات التطبيق)'}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2.5 text-xs font-mono text-slate-600 dark:text-slate-300 truncate"
                />
                <button
                  type="button"
                  onClick={handleSelectCustomDir}
                  title="تغيير مجلد الحفظ الافتراضي"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>تصفح مجلد...</span>
                </button>
              </div>
            </div>

            {/* Last Backup Summary */}
            {lastBackupInfo && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs mb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-200 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ النسخة بنجاح:</span>
                  </div>
                  <button
                    onClick={() => copyPathToClipboard(lastBackupInfo.path)}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    {copiedPath ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ المسار</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate dir-ltr text-left">
                  {lastBackupInfo.path}
                </div>
                <div className="font-mono text-[10px] text-slate-400 truncate dir-ltr text-left">
                  SHA-256: {lastBackupInfo.checksum}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {/* Action 1: Choose location right now */}
            <button
              onClick={handleBackupWithSaveLocation}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{loading ? 'جاري النسخ...' : 'حفظ باسم... (اختر مكان واسم الملف الآن 💾)'}</span>
            </button>

            {/* Action 2: Quick backup to configured folder */}
            <button
              onClick={handleBackupToConfiguredDir}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>حفظ سريع في المجلد المحدد أعلاه</span>
            </button>
          </div>
        </div>

        {/* Restore Backup Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">
              استعادة البيانات من نسخة سابقة
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              اختر ملف نسخة احتياطية (.sqlite3 أو .db) من أي مجلد في جهازك. سيقوم النظام بفحص سلامة بنية الملف والجداول قبل أي تعديل.
            </p>

            {inspectResult && inspectResult.valid && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs mb-4 space-y-2">
                <div className="flex items-center gap-1.5 text-sky-600 font-bold">
                  <FileCheck className="w-4 h-4" />
                  <span>بيانات النسخة المحددة:</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">الأشخاص</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{inspectResult.metadata?.contactsCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">الديون</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{inspectResult.metadata?.debtsCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">المدفوعات</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{inspectResult.metadata?.paymentsCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSelectFileToRestore}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <HardDrive className="w-4 h-4" />
              <span>{selectedBackupPath ? 'تغيير الملف المختار...' : 'اختيار ملف النسخة الاحتياطية (.sqlite3)'}</span>
            </button>

            {inspectResult && inspectResult.valid && (
              <button
                onClick={() => setConfirmRestore(true)}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بدء استعادة البيانات</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Safety Guarantee Info */}
      <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold block mb-0.5">ضمان الأمان والنسخ الاحتياطي الذاتي:</span>
          عند استعادة أي نسخة احتياطية، يُنشئ التطبيق تلقائياً نسخة احتياطية احترازية من بياناتك الحالية قبل تطبيق الاستعادة لضمان عدم فقدان أي معاملة.
        </div>
      </div>

      {/* Confirmation Dialog before Restore */}
      <ConfirmDialog
        isOpen={confirmRestore}
        title="تأكيد استبدال البيانات الحالية"
        message="هل أنت متأكد من رغبتك في استعادة هذه النسخة الاحتياطية؟ سيتم استبدال البيانات الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية. سيتم إنشاء نسخة احتياطية تلقائية من بياناتك الحالية قبل الاستبدال."
        confirmText="تأكيد الاستعادة"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={executeRestore}
        onCancel={() => setConfirmRestore(false)}
      />

      {/* Interactive Save Location Modal */}
      <SaveLocationModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={handleConfirmSaveBackup}
        title="تحديد مكان واسم حفظ النسخة الاحتياطية"
        defaultFileName={`raseedi-backup-${new Date().toISOString().slice(0, 10)}.sqlite3`}
        extension="sqlite3"
        fileTypeLabel="نسخة احتياطية لقاعدة البيانات (SQLite)"
        loading={loading}
      />
    </div>
  );
};
