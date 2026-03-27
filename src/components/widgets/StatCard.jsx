import React from 'react';

/**
 * 통계 카드 위젯
 */
const StatCard = ({ label, count, percentage, color = 'purple', icon: Icon }) => {
  const colorMap = {
    purple: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7' },
    blue: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
    green: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
    orange: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316' },
  };

  const { bg, text } = colorMap[color] || colorMap.purple;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${text}33`,
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>
          {label}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>{count}</span>
          {percentage && (
            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>
              +{percentage}%
            </span>
          )}
        </div>
      </div>
      {Icon && (
        <div style={{ fontSize: '32px', opacity: 0.6, color: text }}>
          <Icon size={32} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
