
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface LineConfig {
  key: string;
  color: string;
  name: string;
  yAxisId?: string;
}

interface CustomLineChartProps {
  data: any[];
  xAxisKey?: string;
  lines: LineConfig[];
  height?: number | string;
  showGrid?: boolean;
  showLegend?: boolean;
}

export const CustomLineChart: React.FC<CustomLineChartProps> = ({
  data,
  xAxisKey = 'name',
  lines,
  height = 300,
  showGrid = true,
  showLegend = true
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
        <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
          labelStyle={{ color: '#64748b', marginBottom: '4px' }}
        />
        {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />}
        {lines.map((line) => (
          <Line
            key={line.key}
            yAxisId={line.yAxisId || 'left'}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={3}
            dot={{ r: 4, fill: line.color, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
