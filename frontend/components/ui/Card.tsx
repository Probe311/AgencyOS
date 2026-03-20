import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '',
  variant = 'default',
  padding = true,
  rounded = '3xl',
  onClick
}) => {
  const variantClasses = {
    default: 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm',
    elevated: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 shadow-xl',
    outlined: 'bg-transparent border-2 border-slate-200 dark:border-slate-700',
    interactive: 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer transition-all duration-500 hover:shadow-md hover:-translate-y-1 group'
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
    '3xl': 'rounded-3xl'
  };

  const baseClasses = `${variantClasses[variant]} ${roundedClasses[rounded]} ${paddingClasses} ${onClick ? 'cursor-pointer' : ''} ${className}`;

  if (onClick) {
    return (
      <div onClick={onClick} className={baseClasses}>
        {children}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
};

