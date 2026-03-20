import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'right' | 'top' | 'bottom' | 'left';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'right', delay = 200 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  return (
    <div 
      className="relative flex items-center" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-[100] px-2.5 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${
          position === 'right' ? 'left-full ml-2.5' : 
          position === 'left' ? 'right-full mr-2.5' :
          position === 'top' ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2' :
          'top-full mt-2.5 left-1/2 -translate-x-1/2'
        }`}>
          {content}
          {/* Arrow */}
          <div className={`absolute w-2 h-2 bg-slate-800 transform rotate-45 ${
             position === 'right' ? 'top-1/2 -translate-y-1/2 -left-1' :
             position === 'left' ? 'top-1/2 -translate-y-1/2 -right-1' :
             position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
             'top-[-4px] left-1/2 -translate-x-1/2'
          }`}></div>
        </div>
      )}
    </div>
  );
};