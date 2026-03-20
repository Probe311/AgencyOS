
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface PieData {
  name: string;
  value: number;
  color?: string;
}

interface CustomPieChartProps {
  data: PieData[];
  height?: number | string;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  showTooltip?: boolean;
}

export const CustomPieChart: React.FC<CustomPieChartProps> = ({
  data,
  height = 300,
  innerRadius = 60,
  outerRadius = 80,
  colors = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'],
  showTooltip = true
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={5}
          dataKey="value"
          cornerRadius={6}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} strokeWidth={0} />
          ))}
        </Pie>
        {showTooltip && (
           <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
              labelStyle={{ color: '#64748b', marginBottom: '4px' }}
           />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};
