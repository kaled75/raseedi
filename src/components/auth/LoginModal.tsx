import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginModal: React.FC = () => {
  const { isConfigured, isLocked, hasCompletedSetup, hint, login, setupPassword, skipSetup } = useAuth();
  const { success, error } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hintInput, setHintInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. If unlocked and setup is completed (or was skipped), never show modal
  if (!isLocked && (isConfigured || hasCompletedSetup)) return null;

  const handleSkip = async () => {
    setLoading(true);
    try {
      await skipSetup();
      success('مرحباً بك في رَصيدي! يمكنك تفعيل كلمة المرور في أي وقت من الإعدادات.');
    } catch (e: any) {
      console.error('Error skipping setup:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (!isConfigured) {
        if (password.length < 4) {
          setErrorMessage('كلمة المرور يجب أن لا تقل عن 4 خانات');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('كلمتا المرور غير متطابقتين');
          setLoading(false);
          return;
        }
        const res = await setupPassword(password, hintInput);
        if (res.success) {
          success('تم تفعيل حماية التطبيق بكلمة مرور بنجاح، مرحباً بك في رَصيدي');
          setPassword('');
          setConfirmPassword('');
        } else {
          setErrorMessage(res.message || 'حدث خطأ أثناء حفظ كلمة المرور');
        }
      } else {
        const res = await login(password);
        if (res.success) {
          success('تم تسجيل الدخول بنجاح');
          setPassword('');
        } else {
          setErrorMessage(res.message || 'كلمة المرور غير صحيحة');
          error(res.message || 'فشل تسجيل الدخول');
        }
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
        {/* App Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-sky-500/30">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
          {!isConfigured ? 'حماية التطبيق بكلمة مرور (اختياري)' : 'تطبيق رَصيدي مقفل'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {!isConfigured
            ? 'يمكنك تعيين كلمة مرور الآن لتأمين سجلاتك، أو تخطي هذه الخطوة والدخول مباشرة واستخدام التطبيق بكل حرية.'
            : 'أدخل كلمة المرور للوصول إلى لوحة التحكم والبيانات المالية.'}
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold text-right">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {!isConfigured ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-4 pl-10 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isConfigured && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تأكيد كلمة المرور
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تلميح كلمة المرور (اختياري)
                </label>
                <input
                  type="text"
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  placeholder="مثال: سنة تخرج، اسم صديق..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />
              </div>
            </>
          )}

          {isConfigured && hint && (
            <div className="text-right">
              {showHint ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  تلميح كلمة المرور: {hint}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 inline-flex items-center gap-1 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>هل نسيت كلمة المرور؟ عرض التلميح</span>
                </button>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-sm transition-all shadow-md shadow-sky-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'جاري الحفظ...' : (!isConfigured ? 'تأكيد وتفعيل كلمة المرور' : 'فتح التطبيق')}</span>
            </button>

            {!isConfigured && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>تخطي الآن والمتابعة بدون كلمة مرور</span>
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>
            {!isConfigured 
              ? 'يمكنك دائماً تفعيل كلمة المرور أو تغييرها لاحقاً من الإعدادات' 
              : 'تشفير محلي قوي (PBKDF2 مع SHA-512)'}
          </span>
        </div>
      </div>
    </div>
  );
};
