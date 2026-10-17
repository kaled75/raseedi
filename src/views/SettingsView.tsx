import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Coins, 
  Shield, 
  Sparkles, 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  KeyRound, 
  Database,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { AuditLog } from '../types';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, theme, toggleTheme, hideBalances, toggleHideBalances } = useSettings();
  const { success, error, warning } = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'currency' | 'privacy' | 'demo' | 'maintenance'>('general');

  // Form states
  const [appName, setAppName] = useState(settings.app_name || 'رَصيدي');
  const [ownerName, setOwnerName] = useState(settings.owner_name || '');
  const [currencyCode, setCurrencyCode] = useState(settings.currency || 'LYD');
  const [currencyDecimals, setCurrencyDecimals] = useState(settings.currency_decimals || '2');
  const [symbolPosition, setSymbolPosition] = useState(settings.currency_symbol_position || 'after');
  const [lockTimeout, setLockTimeout] = useState(settings.lock_timeout_minutes || '15');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Demo status
  const [hasDemoData, setHasDemoData] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const [integrityStatus, setIntegrityStatus] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Reset all data state
  const [confirmResetAllOpen, setConfirmResetAllOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    setAppName(settings.app_name || 'رَصيدي');
    setOwnerName(settings.owner_name || '');
    setCurrencyCode(settings.currency || 'LYD');
    setCurrencyDecimals(settings.currency_decimals || '2');
    setSymbolPosition(settings.currency_symbol_position || 'after');
    setLockTimeout(settings.lock_timeout_minutes || '15');

    api.getDemoStatus().then(res => setHasDemoData(res.hasDemo));
    api.getAuditLogs(15).then(setAuditLogs);
  }, [settings]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updateSettings({
      app_name: appName.trim(),
      owner_name: ownerName.trim()
    });
    if (ok) success('تم حفظ الإعدادات العامة بنجاح');
  };

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updateSettings({
      currency: currencyCode.trim(),
      currency_decimals: currencyDecimals,
      currency_symbol_position: symbolPosition
    });
    if (ok) success('تم حفظ إعدادات العملة بنجاح');
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updateSettings({
      lock_timeout_minutes: lockTimeout
    });
    if (ok) success('تم حفظ إعدادات الخصوصية والقفل بنجاح');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      error('كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل');
      return;
    }
    setPasswordLoading(true);
    const res = await api.changePassword(currentPassword, newPassword, passwordHint);
    if (res.success) {
      success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setPasswordHint('');
    } else {
      error(res.message || 'فشل تغيير كلمة المرور');
    }
    setPasswordLoading(false);
  };

  const handleSeedDemo = async () => {
    setDemoLoading(true);
    const res = await api.seedDemoData();
    if (res.success) {
      success('تمت إضافة البيانات التجريبية بنجاح. يمكنك استكشاف التطبيق وتجربة الميزات.');
      setHasDemoData(true);
    } else {
      error(res.message || 'فشلت إضافة البيانات التجريبية');
    }
    setDemoLoading(false);
  };

  const handlePurgeDemo = async () => {
    setDemoLoading(true);
    const res = await api.purgeDemoData();
    if (res.success) {
      success(`تم حذف كافة السجلات التجريبية (${res.count} سجل) دون المساس ببياناتك الفعلية.`);
      setHasDemoData(false);
    } else {
      error(res.message || 'فشل الحذف');
    }
    setDemoLoading(false);
  };

  const handleCheckIntegrity = async () => {
    const res = await api.checkDatabaseIntegrity();
    setIntegrityStatus(res.message);
    if (res.ok) {
      success('فحص السلامة: قاعدة البيانات سليمة 100%');
    } else {
      error(res.message);
    }
  };

  const handleResetAllData = async () => {
    setResetLoading(true);
    try {
      const res = await api.resetAllData();
      if (res.success) {
        success('تم تصفير كافة البيانات وإعادة التطبيق إلى نقطة الصفر بنجاح 🔄');
        setConfirmResetAllOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        error(res.message || 'فشل تصفير البيانات');
      }
    } catch (e: any) {
      error(e?.message || 'حدث خطأ أثناء تصفير البيانات');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-600" />
          <span>إعدادات التطبيق والتخصيص</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          تخصيص العملات، وتفضيلات الخصوصية والقفل، وإدارة الحماية، وفحص سلامة قاعدة البيانات
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'general', label: 'الإعدادات العامة', icon: <Settings className="w-4 h-4" /> },
          { id: 'currency', label: 'العملة والأرقام', icon: <Coins className="w-4 h-4" /> },
          { id: 'privacy', label: 'الحماية والخصوصية', icon: <Shield className="w-4 h-4" /> },
          { id: 'demo', label: 'البيانات التجريبية', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'maintenance', label: 'الصيانة والتدقيق', icon: <Wrench className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: General */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs max-w-xl space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم التطبيق المعروض
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم صاحب السجلات (يظهر في ترويسة التقارير)
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="مثال: محمد الصادق"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="pt-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              مظهر الواجهة (المظهر الرئيسي هو الفاتح)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'light' })}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-center font-bold transition-all ${
                  theme === 'light'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ☀️ الوضع الفاتح (الافتراضي)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-center font-bold transition-all ${
                  theme === 'dark'
                    ? 'border-sky-500 bg-slate-800 text-sky-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                🌙 الوضع الداكن
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/30"
            >
              حفظ التعديلات العامة
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Currency */}
      {activeTab === 'currency' && (
        <form onSubmit={handleSaveCurrency} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs max-w-xl space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رمز أو اسم العملة (الافتراضي: الدينار الليبي LYD)
            </label>
            <input
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              placeholder="LYD أو د.ل أو USD"
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                عدد الخانات العشرية (الأقراش / الدراهم)
              </label>
              <select
                value={currencyDecimals}
                onChange={(e) => setCurrencyDecimals(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="0">0 (بدون كسور: 100)</option>
                <option value="2">2 (قرشان: 100.50)</option>
                <option value="3">3 (ثلاثة دراهم: 100.500)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                موضع رمز العملة
              </label>
              <select
                value={symbolPosition}
                onChange={(e) => setSymbolPosition(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="after">بعد المبلغ (مثال: 1,500.00 LYD)</option>
                <option value="before">قبل المبلغ (مثال: LYD 1,500.00)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/30"
            >
              حفظ إعدادات العملة
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Privacy and Password */}
      {activeTab === 'privacy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl text-xs">
          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <KeyRound className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">تغيير كلمة المرور المحلية</h3>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                تلميح جديد لكلمة المرور (اختياري)
              </label>
              <input
                type="text"
                value={passwordHint}
                onChange={(e) => setPasswordHint(e.target.value)}
                placeholder="تلميح لتذكر كلمة المرور..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {passwordLoading ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
            </button>
          </form>

          {/* Privacy & Auto-lock */}
          <form onSubmit={handleSavePrivacy} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Shield className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">مهلة القفل التلقائي والخصوصية</h3>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  قفل التطبيق تلقائياً بعد فترة خمول
                </label>
                <select
                  value={lockTimeout}
                  onChange={(e) => setLockTimeout(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                >
                  <option value="5">بعد 5 دقائق من الخمول</option>
                  <option value="15">بعد 15 دقيقة من الخمول (مستحسن)</option>
                  <option value="30">بعد 30 دقيقة</option>
                  <option value="60">بعد ساعة واحدة</option>
                  <option value="0">تعطيل القفل التلقائي</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold block text-slate-800 dark:text-slate-200">إخفاء الأرصدة في لوحة التحكم</span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">عرض أرقام الأرصدة كنجوم (••••••) لمنع استراق النظر</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hideBalances}
                    onChange={toggleHideBalances}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all"
            >
              حفظ تفضيلات الخصوصية
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Demo Data */}
      {activeTab === 'demo' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs max-w-xl space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">وضع البيانات التجريبية (Demo Mode)</h3>
              <p className="text-slate-400 text-[11px]">تجربة كافة ميزات وتقارير التطبيق ببيانات واقعية</p>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            وفقاً لضوابط التطبيق: يتم تمييز السجلات التجريبية بوسم <span className="font-mono text-indigo-600 font-bold">[تجريبي]</span>، ويمكن حذفها بضغطة زر واحدة في أي وقت دون المساس ببياناتك المالية الحقيقية.
          </p>

          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">حالة البيانات التجريبية:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                hasDemoData ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500'
              }`}>
                {hasDemoData ? 'مفعلة وموجودة بالنظام' : 'غير مضافة'}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {!hasDemoData ? (
                <button
                  type="button"
                  onClick={handleSeedDemo}
                  disabled={demoLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm"
                >
                  {demoLoading ? 'جاري الإضافة...' : 'إدراج البيانات التجريبية 🪄'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePurgeDemo}
                  disabled={demoLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{demoLoading ? 'جاري الحذف...' : 'حذف البيانات التجريبية بالكامل 🧹'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Maintenance & Audit Logs */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 max-w-4xl text-xs">
          {/* Integrity Check */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-5 h-5 text-sky-600" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">فحص سلامة قاعدة البيانات (PRAGMA integrity_check)</h4>
              </div>
              <p className="text-slate-400 text-xs">
                التحقق البرمجي من سلامة الفهارس والجداول والقيود في ملف SQLite المحلي.
              </p>
              {integrityStatus && (
                <p className="font-bold text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{integrityStatus}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleCheckIntegrity}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs shrink-0"
            >
              بدء فحص السلامة الآن
            </button>
          </div>

          {/* Audit Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3">
              سجل التدقيق المحاسبي (Audit Logs)
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-[11px] text-right">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">العملية</th>
                    <th className="py-2 px-3">النوع</th>
                    <th className="py-2 px-3">التفاصيل</th>
                    <th className="py-2 px-3">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="py-2 px-3 font-bold text-sky-600">{log.action}</td>
                      <td className="py-2 px-3 text-slate-500">{log.entity_type}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-xs">{log.details}</td>
                      <td className="py-2 px-3 text-slate-400">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Danger Zone: Reset All Data */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-bold text-sm">تصفير وإعادة تعيين النظام بالكامل (Wipe / Reset All Data)</h4>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-xl">
                حذف كافة جهات الاتصال، والديون، والمدفوعات والإيصالات، وسجلات التدقيق بالكامل وإعادة ضبط التطبيق إلى نقطة الصفر كأنه مثبت لأول مرة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setConfirmResetAllOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تصفير كل شيء والبدء من الصفر ⚠️</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Reset All Data */}
      <ConfirmDialog
        isOpen={confirmResetAllOpen}
        title="⚠️ تأكيد تصفير كل شيء والبدء من الصفر"
        message="تحذير شديد الأهمية: هذا الإجراء سيقوم بحذف كافة الأشخاص والديون وسجلات السداد نهائياً ولا يمكن التراجع عنه! هل أنت متأكد تماماً من رغبتك في تصفير كل شيء الآن؟"
        confirmText={resetLoading ? "جاري التصفير..." : "نعم، تصفير كل شيء نهائياً"}
        isDestructive={true}
        onConfirm={handleResetAllData}
        onCancel={() => setConfirmResetAllOpen(false)}
      />
    </div>
  );
};
