import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const baseClasses = "inline-flex items-center justify-center px-3 py-1 rounded-2xl text-[10px] font-bold uppercase tracking-wide";
  
  const variants = {
    default: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
    outline: "border-2 border-slate-200 text-slate-500 bg-transparent dark:border-slate-700 dark:text-slate-400",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
    warning: "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
    danger: "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30",
    info: "bg-primary-50 text-primary-600 border border-primary-100 dark:bg-primary-500/20 dark:text-primary-400 dark:border-primary-500/30"
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};