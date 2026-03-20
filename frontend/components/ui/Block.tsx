import React from 'react';

interface BlockProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  hover?: boolean;
}

export const Block: React.FC<BlockProps> = ({ 
  children, 
  className = '',
  variant = 'default',
  padding = true,
  rounded = '2xl',
  hover = false
}) => {
  const variantClasses = {
    default: 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm',
    elevated: 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-md',
    outlined: 'bg-transparent border-2 border-slate-200 dark:border-slate-700',
    flat: 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800'
  };

  const paddingClasses = padding === true 
    ? 'p-6' 
    : padding === 'sm' 
      ? 'p-3' 
      : padding === 'md'
        ? 'p-4'
        : padding === 'lg'
          ? 'p-8'
          : padding === 'xl'
            ? 'p-10'
            : '';

  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full'
  };

  const hoverClass = hover ? 'transition-all duration-500 hover:shadow-md hover:-translate-y-0.5' : '';

  return (
    <div className={`${variantClasses[variant]} ${roundedClasses[rounded]} ${paddingClasses} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
};

