import React, { useEffect, useState } from 'react';
import { 
  Coins, 
  ShieldCheck, 
  Database, 
  Laptop, 
  Mail, 
  ExternalLink, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Code2, 
  Award,
  Layers
} from 'lucide-react';
import { api } from '../utils/api';

interface AboutViewProps {
  onNavigateBack?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigateBack }) => {
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    let isMounted = true;
    api.getVersion().then(ver => {
      if (isMounted && ver) setAppVersion(ver);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleOpenLink = (url: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    api.openExternal(url);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in text-right pb-10" dir="rtl">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            حول البرنامج
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تفاصيل التطبيق والمواصفات الفنية وبيانات المصمم والمطور
          </p>
        </div>

        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-sky-600" />
            العودة للرئيسية
          </button>
        )}
      </div>

      {/* Hero Branding Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xs text-center flex flex-col items-center relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-500/10 dark:bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-600 via-sky-700 to-indigo-700 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-sky-600/20 mb-4 ring-4 ring-sky-100 dark:ring-sky-950/50">
          <Coins className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-1 tracking-tight">
          رَصيدي | Raseedi
        </h2>
        <p className="text-sky-600 dark:text-sky-400 font-bold text-sm mb-2">
          «أموالك واضحة، وديونك تحت السيطرة»
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 mb-4">
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          الإصدار الرسمي: v{appVersion} (Stable Desktop Edition)
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed text-center">
          تطبيق مكتبي متكامل واحترافي مصمم لإدارة وتتبع الديون والالتزامات المالية الشخصية بين الأفراد،
          يعمل محلياً بالكامل بأقصى درجات الأمان وحماية الخصوصية، مع دقة محاسبية متناهية تمنع أخطاء السداد وتجاوز الأرصدة، ونظام متقدم لتوليد تقارير HTML المستقلة وإيصالات القبض والصرف المعتمدة.
        </p>
      </div>

      {/* Dedicated Designer & Developer Card (بطاقة بيانات المصمم والمطور) */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-sky-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-2 border-sky-200 dark:border-sky-900/60 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
                فريق التطوير والملكية الفكرية
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                بيانات المصمم والمطور
              </h3>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
            <Award className="w-3.5 h-3.5" />
            المصمم المعتمد
          </span>
        </div>

        {/* Designer Name Spotlight */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 mb-5 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
            تصميم وتطوير:
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-wide text-sky-700 dark:text-sky-400">
            خالد الرماح ابورقيقة
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            مهندس برمجيات ومطور حلول تقنية متخصصة في هندسة تطبيقات سطح المكتب والويب، مع التركيز على تجربة المستخدم العربية المتقنة، والأنظمة المالية الآمنة.
          </p>
        </div>

        {/* Contact & Social Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Card */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-slate-400 block">البريد الإلكتروني:</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono select-all">
                  kl2009k@gmail.com
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => handleOpenLink('mailto:kl2009k@gmail.com', e)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>إرسال بريد إلكتروني (mailto)</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          </div>

          {/* Facebook Card */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                {/* Official Facebook SVG Logo */}
                <svg className="w-5 h-5 fill-current text-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-slate-400 block">صفحة فيسبوك:</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                  Khaled.Alrammah.AbuRaqiqa
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => handleOpenLink('https://www.facebook.com/Khaled.Alrammah.AbuRaqiqa', e)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <span>فتح صفحة فيسبوك في المتصفح</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
            خصوصية وأمان محلي 100%
          </h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            بياناتك لا تخرج من جهازك إطلاقاً؛ لا خوادم سحابية ولا تتبع خارجي، مع تشفير كلمات المرور باستخدام خوارزمية PBKDF2 الموثوقة مع ملح Salt و SHA-512.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
            دقة محاسبية مطلقة
          </h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            معالجة دقيقة للمنازل العشرية خالية من أخطاء الفاصلة العائمة، ومنع قاطع لتجاوز الرصيد المتبقي (Overpayment Prevention)، مع معاملات ذرية متسلسلة.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Laptop className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1.5">
            تصدير وتقارير مستقلة
          </h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            توليد كشوفات حساب وتقارير مالية تفاعلية بصيغة HTML تعمل ذاتياً بدون إنترنت، بالإضافة إلى دعم تصدير ملفات Excel المصنفة وملفات CSV مع ترميز UTF-8 BOM.
          </p>
        </div>
      </div>

      {/* System Technical Specifications */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <Layers className="w-4 h-4 text-sky-600" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            المواصفات التقنية للبناء والتشغيل
          </h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-mono">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px] mb-0.5 font-sans">إصدار التطبيق:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">v{appVersion} Production</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px] mb-0.5 font-sans">محرك البيانات:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">SQLite (WAL Engine)</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px] mb-0.5 font-sans">البيئة البرمجية:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Electron ContextBridge</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <span className="text-slate-400 block text-[11px] mb-0.5 font-sans">واجهة المستخدم:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">React 19 + TypeScript</span>
          </div>
        </div>
      </div>

      {/* Footer Rights Notice */}
      <div className="text-center text-[11px] text-slate-400 pt-2">
        جميع الحقوق محفوظة © {new Date().getFullYear()} — تطبيق رَصيدي (Raseedi) | تصميم وتطوير خالد الرماح ابورقيقة
      </div>
    </div>
  );
};
