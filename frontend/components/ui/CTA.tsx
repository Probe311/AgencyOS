import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface CTAProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CTA: React.FC<CTAProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled = false
}) => {
  // Pour CTA, on inverse l'icône si position right
  const displayIcon = iconPosition === 'right' ? undefined : Icon;
  const DisplayIconRight = iconPosition === 'right' ? Icon : undefined;

  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      icon={displayIcon}
      isLoading={isLoading}
      fullWidth={fullWidth}
      className={className}
      disabled={disabled || isLoading}
    >
      {children}
      {DisplayIconRight && (
        <DisplayIconRight 
          size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} 
          className="ml-2" 
        />
      )}
    </Button>
  );
};

