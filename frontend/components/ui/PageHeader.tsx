import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface PageHeaderAction {
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  title?: string;
  disabled?: boolean;
  element?: React.ReactNode; // Pour des éléments custom
  className?: string; // Pour des classes personnalisées
}

export interface ViewToggleOption {
  value: string;
  icon?: LucideIcon;
  title: string;
}

export interface PageHeaderProps {
  icon?: LucideIcon;
  iconBgColor?: string; // Couleur de fond de l'icône (ex: 'bg-indigo-100 dark:bg-indigo-900/20')
  iconColor?: string; // Couleur de l'icône (ex: 'text-indigo-600 dark:text-indigo-400')
  title: string;
  description?: string;
  leftActions?: PageHeaderAction[];
  rightActions?: PageHeaderAction[];
  viewToggle?: {
    value: string;
    options: ViewToggleOption[];
    onChange: (value: string) => void;
  };
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  iconBgColor = 'bg-indigo-100 dark:bg-indigo-900/20',
  iconColor = 'text-indigo-600 dark:text-indigo-400',
  title,
  description,
  leftActions = [],
  rightActions = [],
  viewToggle,
  className = '',
  titleClassName = '',
  descriptionClassName = ''
}) => {
  return (
    <div className={`shrink-0 w-full mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
        {/* Section gauche : Icône, titre, description, et actions de gauche */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
          {Icon && (
              <div className={`p-2 ${iconBgColor} ${iconColor} rounded-lg flex-shrink-0`}>
              <Icon size={24} />
            </div>
          )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-shrink-0">
                  <h1 className={`text-2xl font-bold text-slate-900 dark:text-white whitespace-nowrap ${titleClassName}`}>
            {title}
          </h1>
          {description && (
                    <p className={`text-slate-500 dark:text-slate-400 text-sm ${descriptionClassName}`}>
                      {description}
                    </p>
          )}
        </div>
                {/* Actions de gauche sur la même ligne */}
                {leftActions.length > 0 && (
                  <div className="flex items-center gap-3 mt-0.5">
              {leftActions.map((action, index) => (
                <React.Fragment key={index}>
                  {action.element ? (
                    action.element
                  ) : (
                          <div className={action.className || ''}>
                    <Button
                      variant={action.variant || 'outline'}
                      onClick={action.onClick}
                      icon={action.icon}
                      title={action.title}
                      disabled={action.disabled}
                    >
                      {action.label}
                    </Button>
                          </div>
                  )}
                </React.Fragment>
              ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section droite : Actions */}
        {(rightActions.length > 0 || viewToggle) && (
          <div className="min-w-0 overflow-x-auto overflow-y-visible px-2 -mx-2 pb-4">
            <div className="flex gap-3 items-center flex-shrink-0 min-w-max py-2">
              {/* View Toggle */}
              {viewToggle && (
                <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                  {viewToggle.options.map((option) => {
                    const OptionIcon = option.icon;
                    const isActive = viewToggle.value === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => viewToggle.onChange(option.value)}
                        className={`p-1.5 rounded transition-all duration-500 ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                        title={option.title}
                      >
                        {OptionIcon && <OptionIcon size={18} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Actions de droite */}
              {rightActions.length > 0 && (
                <div className="flex gap-2">
              {rightActions.map((action, index) => (
                <React.Fragment key={index}>
                  {action.element ? (
                    action.element
                  ) : (
                        <div className={action.className || ''}>
                    <Button
                      variant={action.variant || 'outline'}
                      onClick={action.onClick}
                      icon={action.icon}
                      title={action.title}
                      disabled={action.disabled}
                    >
                      {action.label}
                    </Button>
                        </div>
                  )}
                </React.Fragment>
              ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

