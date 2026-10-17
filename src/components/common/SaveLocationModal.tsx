import React, { useState, useEffect } from 'react';
import { Download, FolderOpen, X, Check, FileCode, FileSpreadsheet, FileText, Database } from 'lucide-react';
import { Modal } from './Modal';

interface SaveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => Promise<void> | void;
  title: string;
  defaultFileName: string;
  extension: string;
  fileTypeLabel: string;
  loading?: boolean;
}

export const SaveLocationModal: React.FC<SaveLocationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  defaultFileName,
  extension,
  fileTypeLabel,
  loading = false
}) => {
  const [fileName, setFileName] = useState(defaultFileName);

  useEffect(() => {
    if (isOpen) {
      setFileName(defaultFileName);
    }
  }, [isOpen, defaultFileName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = fileName.trim().endsWith(`.${extension}`)
      ? fileName.trim()
      : `${fileName.trim()}.${extension}`;
    onConfirm(finalName);
  };

  const getIcon = () => {
    switch (extension) {
      case 'html':
        return <FileCode className="w-8 h-8 text-sky-600" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-600" />;
      case 'csv':
        return <FileText className="w-8 h-8 text-sky-600" />;
      default:
        return <Database className="w-8 h-8 text-indigo-600" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5 text-right">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs shrink-0">
            {getIcon()}
          </div>
          <div className="truncate">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{fileTypeLabel}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">امتداد الملف المختار: .{extension}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            اسم الملف المفضل للحفظ:
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder={`أدخل اسم الملف...`}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            سيتم فتح نافذة اختيار المجلد (Save As) أو تنزيل الملف مباشرة بهذا الاسم في جهازك.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || !fileName.trim()}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            <span>{loading ? 'جاري الحفظ...' : 'تأكيد وحفظ الملف 💾'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
