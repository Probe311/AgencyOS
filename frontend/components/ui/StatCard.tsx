import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  trend?: string;
  isNegative?: boolean;
  chartColor?: string;
  data?: Array<{ value: number }>;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  sub,
  trend,
  isNegative = false,
  chartColor = 'indigo',
  data = [],
  icon,
  className = '',
  onClick
}) => {
  const cardClasses = `bg-white dark:bg-slate-800 rounded-[30px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between min-h-[180px] transition-all duration-500 group ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`;

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-3">
          {icon || (
            <div className={`w-2.5 h-2.5 rounded-full ring-4 ${
              isNegative 
                ? 'bg-rose-500 ring-rose-100 dark:ring-rose-900/30' 
                : 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/30'
            }`}></div>
          )}
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
            {title}
          </p>
        </div>
        <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          {value}
        </h3>
        {(trend || sub) && (
          <div className="flex items-center gap-2">
            {trend && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                isNegative 
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' 
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
              }`}>
                {trend}
              </span>
            )}
            {sub && (
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">
                {sub}
              </span>
            )}
          </div>
        )}
      </div>
      
      {data.length > 0 && (
        <div className="absolute -bottom-4 -left-4 -right-4 h-36 opacity-25 pointer-events-none group-hover:scale-105 transition-all duration-500">
          {/* Chart would be rendered here if provided */}
          <div className="w-full h-full flex items-end justify-around">
            {data.map((item, index) => (
              <div
                key={index}
                className={`bg-${chartColor}-500 rounded-t`}
                style={{ 
                  height: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%`,
                  width: `${100 / data.length}%`
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

