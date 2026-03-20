import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface ViewOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface ViewToggleProps {
  options: ViewOption[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'default' | 'pills' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  options,
  value,
  onChange,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  if (variant === 'pills' || variant === 'segmented') {
    return (
      <div className={`inline-flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl ${className}`}>
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-500
                ${size === 'sm' ? 'text-xs px-3 py-1.5' : size === 'md' ? 'text-sm' : 'text-base px-5 py-2.5'}
                ${isActive 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }
              `.trim().replace(/\s+/g, ' ')}
            >
              {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant default - boutons séparés
  return (
    <div className={`flex gap-2 ${className}`}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        
        return (
          <Button
            key={option.value}
            onClick={() => onChange(option.value)}
            variant={isActive ? 'primary' : 'outline'}
            size={size}
            icon={Icon}
            className={isActive ? '' : 'border-slate-200 dark:border-slate-700'}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};

