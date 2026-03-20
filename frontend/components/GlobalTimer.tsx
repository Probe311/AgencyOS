
import React, { useEffect, useState } from 'react';
import { Pause, Play, StopCircle, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const GlobalTimer: React.FC = () => {
  const { activeTimer, stopTimer } = useAppStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!activeTimer) return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white pl-4 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
       <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-medium text-slate-400 max-w-[150px] truncate">{activeTimer.taskTitle}</span>
       </div>
       <div className="font-mono text-lg font-bold w-24 text-center">
          {formatTime(elapsed)}
       </div>
       <button 
          onClick={stopTimer}
          className="p-2 bg-slate-800 hover:bg-red-500 rounded-full transition-all duration-500 text-white"
       >
          <StopCircle size={16} />
       </button>
    </div>
  );
};
