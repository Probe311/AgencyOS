import React from 'react';

export interface PageSidebarProps {
  children: React.ReactNode;
  width?: string; // Ex: 'w-72', 'w-80', etc.
  className?: string;
  sticky?: boolean; // Si true, la sidebar reste fixe lors du scroll
}

export const PageSidebar: React.FC<PageSidebarProps> = ({
  children,
  width = 'w-72',
  className = '',
  sticky = false
}) => {
  const stickyClass = sticky ? 'sticky top-0 self-start' : '';
  
  return (
    <aside className={`${width} flex-shrink-0 h-full flex flex-col min-h-0 ${stickyClass} ${className}`}>
      {children}
    </aside>
  );
};

