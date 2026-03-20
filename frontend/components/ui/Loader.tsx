import React from 'react';
import { Hexagon } from 'lucide-react';

interface LoaderProps {
  size?: number;
  className?: string;
  variant?: 'default' | 'minimal';
}

export const Loader: React.FC<LoaderProps> = ({ 
  size = 40, 
  className = '',
  variant = 'default'
}) => {
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Hexagon 
          size={size} 
          className="animate-spin text-primary-600 dark:text-primary-400" 
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl flex items-center justify-center shadow-blue-lg"
          style={{ width: size, height: size }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
          <Hexagon 
            size={size * 0.6} 
            className="fill-white/90 animate-spin relative z-10" 
          />
        </div>
      </div>
    </div>
  );
};

