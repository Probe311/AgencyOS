
import React from 'react';
import { LucideIcon, Upload } from 'lucide-react';

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  icon?: LucideIcon;
  dropzoneText?: string;
  helpText?: string;
  accept?: string;
  containerClassName?: string;
  dropzoneClassName?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  label,
  icon: Icon = Upload,
  dropzoneText = 'Cliquez pour upload',
  helpText,
  accept,
  containerClassName = '',
  dropzoneClassName = '',
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `file-input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor={inputId}
          className={`
            flex flex-col items-center justify-center 
            w-full h-32 
            border-2 border-slate-300 dark:border-slate-600 
            border-dashed 
            rounded-2xl 
            cursor-pointer 
            bg-white dark:bg-slate-800 
            shadow-sm
            transition-all duration-500 
            hover:bg-slate-50 dark:hover:bg-slate-700 
            hover:border-slate-400 dark:hover:border-slate-500
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${dropzoneClassName}
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Icon className="w-8 h-8 mb-3 text-slate-400 dark:text-slate-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-bold">{dropzoneText}</span>
            </p>
            {helpText && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {helpText}
              </p>
            )}
          </div>
          <input
            id={inputId}
            type="file"
            accept={accept}
            className={`hidden ${className}`}
            {...props}
          />
        </label>
      </div>
    </div>
  );
};

