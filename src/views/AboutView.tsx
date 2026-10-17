import React from 'react';
import { Coins, ShieldCheck, Database, Lock, Laptop, CheckCircle2 } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl animate-fade-in text-right">
      {/* Branding Hero */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xs text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-600 via-sky-700 to-indigo-700 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-sky-600/20 mb-4">
          <Coins className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
          رَصيدي | Raseedi — Personal Debt Manager
        </h2>
        <p className="text-sky-600 dark:text-sky-400 font-bold text-sm mb-3">
          «أموالك واضحة، وديونك تحت السيطرة»
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
          تطبيق مكتبي متكامل واحترافي لإدارة الديون المالية الشخصية بينك وبين أصدقائك وأقاربك، يدعم تسجيل وتتبع المعاملات، والسداد الجزئي والكامل، وتوليد تقارير HTML مستقلة ومحمية، مع حماية بياناتك محلياً بنسبة 100%.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <ShieldCheck className="w-6 h-6 text-emerald-600 mb-3" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">خصوصية وأمان محلي</h3>
          <p className="text-slate-400 leading-relaxed">
            بياناتك لا تخرج من جهازك أبداً. لا توجد خوادم سحابية، مع قفل فوري بكلمة مرور مشفرة بـ PBKDF2 وSHA-512.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Database className="w-6 h-6 text-sky-600 mb-3" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">دقة محاسبية مطلقة</h3>
          <p className="text-slate-400 leading-relaxed">
            معالجة دقيقة للكسور والمنازل العشرية، منع الدفعات الزائدة، وتوثيق سجل التدقيق الكامل لكل حركة.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Laptop className="w-6 h-6 text-indigo-600 mb-3" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">تصدير HTML مستقل</h3>
          <p className="text-slate-400 leading-relaxed">
            إنشاء تقارير HTML تفاعلية مستقلة تعمل في أي متصفح دون اتصال بالإنترنت، ومحصنة ضد حقن الأكواد الخبيثة.
          </p>
        </div>
      </div>

      {/* System Technical Specifications */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-xs space-y-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
          المواصفات التقنية للبناء
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 font-mono">
          <div>
            <span className="text-slate-400 block text-[11px]">الإصدار الحالي:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">v1.0.0 Stable</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">قاعدة البيانات:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">SQLite (WAL Mode)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">البيئة المكتبية:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Electron Context Isolation</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">الواجهة والمحرك:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">React 19 + TypeScript</span>
          </div>
        </div>
      </div>
    </div>
  );
};
