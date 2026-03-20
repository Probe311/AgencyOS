import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  onClose?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type = 'info', onClose, duration = 3000 }) => {
  React.useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/20',
      border: 'border-emerald-600 dark:border-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      textColor: 'text-emerald-900 dark:text-emerald-200',
      Icon: CheckCircle2,
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-500/20',
      border: 'border-rose-600 dark:border-rose-400',
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-rose-900 dark:text-rose-200',
      Icon: XCircle,
    },
    info: {
      bg: 'bg-primary-50 dark:bg-primary-500/20',
      border: 'border-primary-600 dark:border-primary-400',
      iconColor: 'text-primary-600 dark:text-primary-400',
      textColor: 'text-primary-900 dark:text-primary-200',
      Icon: Info,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/20',
      border: 'border-amber-600 dark:border-amber-400',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-900 dark:text-amber-200',
      Icon: Info,
    },
  };

  const { bg, border, iconColor, textColor, Icon } = config[type];

  return (
    <div
      className={`
        ${bg}
        border-l-4 ${border}
        rounded-lg shadow-lg
        px-4 py-3
        flex items-start gap-3
        min-w-[300px] max-w-[500px]
        animate-in slide-in-from-right fade-in duration-200
        pointer-events-auto
      `}
    >
      <Icon className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />
      <p className={`${textColor} text-sm font-medium flex-1`}>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className={`${iconColor} hover:opacity-70 transition-all duration-500 flex-shrink-0 mt-0.5`}
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

