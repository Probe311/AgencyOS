import React from 'react';
import { PageHeader, PageHeaderProps } from './PageHeader';
import { PageSidebar, PageSidebarProps } from './PageSidebar';

export interface PageLayoutProps {
  header: PageHeaderProps;
  sidebar?: React.ReactNode;
  sidebarProps?: Omit<PageSidebarProps, 'children'>; // Props pour PageSidebar (width, className, sticky)
  sidebarPosition?: 'left' | 'right'; // Position de la sidebar (par défaut 'right')
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string; // Classes pour le conteneur body
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  header,
  sidebar,
  sidebarProps = { width: 'w-72' },
  sidebarPosition = 'right',
  children,
  className = '',
  contentClassName = '',
  bodyClassName = ''
}) => {
  return (
    <div className={`animate-in fade-in duration-500 h-full flex flex-col min-w-0 ${className}`}>
      {/* Header avec largeur fixe - indépendant de la sidebar */}
      <div className="shrink-0 w-full">
        <PageHeader {...header} />
      </div>

      {/* Body avec sidebar optionnelle - peut avoir overflow */}
      <div className={`flex gap-6 min-w-0 overflow-hidden flex-1 min-h-0 ${bodyClassName}`}>
        {/* Sidebar optionnelle à gauche */}
        {sidebar && sidebarPosition === 'left' && (
          <PageSidebar {...sidebarProps}>
            {sidebar}
          </PageSidebar>
        )}

        {/* Contenu principal */}
        <div className={`flex-1 min-w-0 max-w-full min-h-0 overflow-y-auto ${sidebar ? '' : 'w-full'} ${contentClassName}`}>
          {children}
        </div>

        {/* Sidebar optionnelle à droite */}
        {sidebar && sidebarPosition === 'right' && (
          <PageSidebar {...sidebarProps}>
            {sidebar}
          </PageSidebar>
        )}
      </div>
    </div>
  );
};

