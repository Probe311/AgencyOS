
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  options: Option[] | { value: string, label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  containerClassName?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  error, 
  containerClassName = '', 
  className = '',
  placeholder = 'Sélectionner...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Protection : si options n'est pas défini, retourner null ou un message d'erreur
  if (!options || !Array.isArray(options)) {
    console.warn('Dropdown: options must be an array');
    return null;
  }

  // Fermer le dropdown en cliquant en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Gestion du clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            const option = options[focusedIndex];
            const optionValue = typeof option === 'string' ? option : option.value;
            onChange?.(optionValue);
            setIsOpen(false);
            setFocusedIndex(-1);
          }
          break;
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, focusedIndex, options, onChange]);

  // Calculer la position du menu quand il s'ouvre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.bottom + 4, // fixed est relatif à la viewport
            left: rect.left,
            width: rect.width
          });
        }
      };
      
      updatePosition();
      
      // Mettre à jour la position lors du scroll ou resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Scroll vers l'option focusée
  useEffect(() => {
    if (focusedIndex >= 0 && menuRef.current) {
      const focusedElement = menuRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  const selectedOption = options.find(opt => {
    const optValue = typeof opt === 'string' ? opt : opt.value;
    return optValue === value;
  });

  const displayValue = selectedOption 
    ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
    : placeholder;

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`} ref={dropdownRef}>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center justify-between gap-3 
            bg-white dark:bg-slate-800 
            px-4 py-3 
            rounded-2xl 
            border border-slate-200 dark:border-slate-700 
            shadow-sm 
            transition-all duration-500 
            w-full 
            text-left
            ${error ? 'border-rose-300 dark:border-rose-600' : ''}
            ${isOpen ? 'border-primary-500 dark:border-primary-500 shadow-blue-sm' : 'hover:border-slate-300 dark:hover:border-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${className}
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label || 'Dropdown'}
        >
          <span className={`text-sm font-medium flex-1 truncate min-w-0 ${value ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} title={displayValue}>
            {displayValue}
          </span>
          <ChevronDown 
            size={16} 
            className={`text-slate-400 dark:text-slate-500 shrink-0 transition-all duration-500 ${isOpen ? 'transform rotate-180 text-primary-500' : ''}`} 
          />
        </button>

        {isOpen && (
          <>
            {/* Overlay pour fermer en cliquant en dehors */}
            <div 
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            {/* Menu avec position fixed pour échapper au contexte de stacking */}
            <div 
              ref={menuRef}
              className="
                fixed z-[9999]
                bg-white dark:bg-slate-800
                border border-slate-200 dark:border-slate-700
                rounded-2xl
                shadow-lg
                overflow-hidden
                animate-slide-up
                max-h-60 overflow-y-auto custom-scrollbar
              "
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`
              }}
              role="listbox"
            >
            {options.map((opt, idx) => {
              const optionValue = typeof opt === 'string' ? opt : opt.value;
              const optionLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = optionValue === value;
              const isFocused = idx === focusedIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(optionValue)}
                  className={`
                    w-full text-left
                    px-4 py-2.5
                    text-sm font-medium
                    transition-all duration-500
                    ${isSelected 
                      ? 'bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400' 
                      : 'text-slate-700 dark:text-slate-300'
                    }
                    ${isFocused && !isSelected 
                      ? 'bg-slate-50 dark:bg-slate-700/50' 
                      : ''
                    }
                    hover:bg-slate-50 dark:hover:bg-slate-700/50
                    ${!isSelected ? 'hover:text-slate-900 dark:hover:text-slate-100' : ''}
                  `}
                  role="option"
                  aria-selected={isSelected}
                >
                  {optionLabel}
                </button>
              );
            })}
          </div>
          </>
        )}
      </div>
      {error && (
        <span className="text-xs text-rose-500 font-medium ml-1">
          {error}
        </span>
      )}
    </div>
  );
};

