import React from 'react';
import { Check, X } from 'lucide-react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  showIcon?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  labelPosition = 'right',
  size = 'md',
  disabled = false,
  className = '',
  containerClassName = '',
  showIcon = true
}) => {
  const sizeClasses = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
      icon: 'w-2 h-2'
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
      icon: 'w-3 h-3'
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
      icon: 'w-3.5 h-3.5'
    }
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const sizes = sizeClasses[size];

  const Label = label ? (
    <label 
      className={`${labelSizeClasses[size]} font-medium text-slate-700 dark:text-slate-300 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      {label}
    </label>
  ) : null;

  return (
    <div className={`flex items-center gap-3 ${containerClassName}`}>
      {label && labelPosition === 'left' && Label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex shrink-0 items-center rounded-full transition-all duration-500 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${sizes.track} ${checked ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        <span
          className={`inline-flex items-center justify-center transform rounded-full bg-white shadow-lg transition-all duration-500 ease-in-out ${sizes.thumb} ${checked ? sizes.translate : 'translate-x-0.5'}`}
        >
          {showIcon && (
            <>
              {checked ? (
                <Check className={`${sizes.icon} text-indigo-600 dark:text-indigo-600`} strokeWidth={3} />
              ) : (
                <X className={`${sizes.icon} text-slate-400 dark:text-slate-500`} strokeWidth={3} />
              )}
            </>
          )}
        </span>
      </button>
      {label && labelPosition === 'right' && Label}
    </div>
  );
};
