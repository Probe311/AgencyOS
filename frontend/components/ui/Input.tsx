
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, error, containerClassName = '', className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <div 
          className={`
            flex items-center gap-3 
            bg-white dark:bg-slate-800 
            px-4 py-3 
            rounded-2xl 
            border border-slate-200 dark:border-slate-700 
            shadow-sm 
            transition-all duration-500 
            w-full
            ${error ? 'border-rose-300 dark:border-rose-600' : ''}
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'focus-within:border-primary-500 dark:focus-within:border-primary-500 focus-within:shadow-blue-sm hover:border-slate-300 dark:hover:border-slate-600'}
          `}
        >
          {Icon && (
            <Icon 
              size={18} 
              className={`text-slate-400 dark:text-slate-500 shrink-0 transition-all duration-500 ${!props.disabled ? 'group-focus-within:text-primary-500' : ''}`} 
            />
          )}
          <input 
            className={`bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-900 dark:text-white font-medium ${className}`}
            {...props} 
          />
        </div>
      </div>
      {error && (
        <span className="text-xs text-rose-500 font-medium ml-1">
          {error}
        </span>
      )}
    </div>
  );
};
