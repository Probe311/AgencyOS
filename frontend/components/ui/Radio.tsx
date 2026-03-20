import React from 'react';
import { Circle, CircleDot } from 'lucide-react';

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  labelClassName?: string;
  containerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Radio: React.FC<RadioProps> = ({
  label,
  labelClassName = '',
  containerClassName = '',
  size = 'md',
  className = '',
  checked,
  disabled,
  onChange,
  id,
  name,
  value,
  ...props
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const iconSize = sizeClasses[size];

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-center gap-2 ${containerClassName}`}>
      <label 
        htmlFor={radioId}
        className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <input 
          type="radio" 
          id={radioId}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
          {...props}
        />
        {checked ? (
          <CircleDot 
            className={`${iconSize} text-indigo-600 dark:text-indigo-400 transition-all duration-500`}
            strokeWidth={2}
          />
        ) : (
          <Circle 
            className={`${iconSize} text-slate-400 dark:text-slate-500 transition-all duration-500`}
            strokeWidth={2}
          />
        )}
      </label>
      {label && (
        <label 
          htmlFor={radioId}
          className={`${labelSizeClasses[size]} font-medium text-slate-700 dark:text-slate-300 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${labelClassName}`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

