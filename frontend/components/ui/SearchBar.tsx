
import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ containerClassName = '', className = '', ...props }) => {
  return (
    <div className={`relative group ${containerClassName}`}>
      <div className={`flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-500 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 hover:border-slate-300 dark:hover:border-slate-600 w-full`}>
        <Search size={18} className="text-slate-400 dark:text-slate-500 shrink-0 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-all duration-500" />
        <input 
          type="text" 
          className={`bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white font-medium ${className}`}
          {...props} 
        />
      </div>
    </div>
  );
};
