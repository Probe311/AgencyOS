
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[] | { value: string, label: string }[];
  error?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, containerClassName = '', className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">{label}</label>}
      <div className="relative group">
        <div className={`flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-500 focus-within:border-indigo-500 hover:border-slate-300 dark:hover:border-slate-600 w-full ${error ? 'border-rose-300 focus-within:border-rose-500' : ''}`}>
          <select 
            className={`bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-900 dark:text-white font-medium appearance-none cursor-pointer ${className}`}
            {...props}
          >
            {options.map((opt, idx) => {
              const value = typeof opt === 'string' ? opt : opt.value;
              const label = typeof opt === 'string' ? opt : opt.label;
              return <option key={idx} value={value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{label}</option>;
            })}
          </select>
          <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 shrink-0 pointer-events-none group-focus-within:text-indigo-500 transition-all duration-500" />
        </div>
      </div>
      {error && <span className="text-xs text-rose-500 font-medium ml-1">{error}</span>}
    </div>
  );
};
