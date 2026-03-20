import React from 'react';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: string;
  labelClassName?: string;
  containerClassName?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  size,
  labelClassName,
  containerClassName,
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`flex items-center ${containerClassName || ''}`}>
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {label && (
        <label htmlFor={checkboxId} className={`ml-2 text-sm text-slate-700 dark:text-slate-300 ${labelClassName || ''}`}>
          {label}
        </label>
      )}
    </div>
  );
};
