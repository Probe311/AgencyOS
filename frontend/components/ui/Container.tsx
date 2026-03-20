import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean | 'sm' | 'md' | 'lg';
}

export const Container: React.FC<ContainerProps> = ({ 
  children, 
  className = '',
  maxWidth = 'full',
  padding = true
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = padding === true 
    ? 'px-4 sm:px-6 lg:px-8' 
    : padding === 'sm' 
      ? 'px-2 sm:px-4' 
      : padding === 'md'
        ? 'px-4 sm:px-6'
        : padding === 'lg'
          ? 'px-6 sm:px-8 lg:px-12'
          : '';

  return (
    <div className={`w-full mx-auto ${maxWidthClasses[maxWidth]} ${paddingClasses} ${className}`}>
      {children}
    </div>
  );
};

