
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useFocusManagement } from '../../lib/hooks/useFocusManagement';
import { useKeyboardNavigation } from '../../lib/hooks/useKeyboardNavigation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  headerActions, 
  size = 'lg',
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = ariaLabelledBy || `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  const { saveFocus, restoreFocus, focusFirst } = useFocusManagement();
  
  const { containerRef } = useKeyboardNavigation({
    enabled: isOpen,
    onEscape: onClose,
    trapFocus: true,
  });

  useEffect(() => {
    if (isOpen) {
      saveFocus();
      // Focus le premier élément focusable après le rendu
      setTimeout(() => {
        if (modalRef.current) {
          focusFirst(modalRef.current);
        }
      }, 100);
    } else {
      restoreFocus();
    }
  }, [isOpen, saveFocus, restoreFocus, focusFirst]);

  useEffect(() => {
    if (isOpen) {
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';
      // Annoncer l'ouverture aux lecteurs d'écran
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = `Modal ${title} ouvert`;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-10xl'
  };

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={ariaDescribedBy}
    >
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all duration-500" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        ref={(node) => {
          modalRef.current = node;
          if (containerRef && typeof containerRef === 'function') {
            containerRef(node);
          } else if (containerRef && 'current' in containerRef) {
            (containerRef as React.MutableRefObject<HTMLElement | null>).current = node;
          }
        }}
        className={`modal-content bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full ${sizeClasses[size]} z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 focus:outline-none`}
        tabIndex={-1}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl shrink-0">
          <h3 id={titleId} className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <Button 
               onClick={onClose} 
               variant="ghost"
               className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all duration-500 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-95 h-auto"
               icon={X}
               aria-label="Fermer la modal"
            />
          </div>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar text-slate-600 dark:text-slate-300">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
