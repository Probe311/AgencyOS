
import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, containerClassName = '', className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{label}</label>}
      <div className="relative group">
        <div className={`flex items-start gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-500 focus-within:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 w-full ${error ? 'border-rose-300 focus-within:border-rose-500' : ''}`}>
          <textarea 
            className={`bg-transparent border-none outline-none text-sm w-full h-full placeholder:text-slate-400 text-slate-900 dark:text-white font-medium resize-y min-h-[120px] ${className}`}
            {...props}
          />
        </div>
      </div>
      {error && <span className="text-xs text-rose-500 font-medium ml-1">{error}</span>}
    </div>
  );
};
