
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface BarConfig {
  key: string;
  color: string;
  name: string;
  stackId?: string;
}

interface CustomBarChartProps {
  data: any[];
  xAxisKey?: string;
  bars: BarConfig[];
  height?: number | string;
  showGrid?: boolean;
  showLegend?: boolean;
}

export const CustomBarChart: React.FC<CustomBarChartProps> = ({
  data,
  xAxisKey = 'name',
  bars,
  height = 300,
  showGrid = true,
  showLegend = true
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
        <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
          labelStyle={{ color: '#64748b', marginBottom: '4px' }}
        />
        {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />}
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color}
            stackId={bar.stackId}
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
