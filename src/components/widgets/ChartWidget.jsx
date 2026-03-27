import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * 차트 위젯
 * 다양한 차트 정보를 표시하는 위젯
 */
const ChartWidget = ({ title, type = 'line', data, lines, bars, colors = [], height = 300 }) => {
  const COLORS = colors.length > 0 ? colors : ['#8b5cf6', '#3b82f6', '#22c55e', '#f97316'];

  const chartProps = {
    data,
    margin: { top: 20, right: 30, left: 0, bottom: 0 },
  };

  let chart = null;

  if (type === 'line') {
    chart = (
      <LineChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#e5e7eb' }}
        />
        <Legend />
        {lines?.map((line, idx) => (
          <Line
            key={idx}
            type="monotone"
            dataKey={line}
            stroke={COLORS[idx % COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    );
  } else if (type === 'bar') {
    chart = (
      <BarChart {...chartProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#e5e7eb' }}
        />
        <Legend />
        {bars?.map((bar, idx) => (
          <Bar key={idx} dataKey={bar} fill={COLORS[idx % COLORS.length]} />
        ))}
      </BarChart>
    );
  } else if (type === 'pie') {
    chart = (
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#e5e7eb' }}
        />
      </PieChart>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(37, 45, 66, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid rgba(124, 58, 237, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '16px', fontWeight: '600' }}>
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {chart}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartWidget;
