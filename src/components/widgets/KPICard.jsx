import React from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

/**
 * KPI 카드 위젯
 * 주요 지표를 시각화하는 카드 컴포넌트
 */
const KPICard = ({ 
  title, 
  value, 
  unit, 
  change, 
  trend = 'up',
  icon: Icon,
  color = 'purple',
  onClick 
}) => {
  const colors = {
    purple: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' },
    blue: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
    green: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
    orange: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', text: '#f97316' },
    red: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' },
  };

  const colorScheme = colors[color] || colors.purple;
  const TrendIcon = trend === 'up' ? FiArrowUp : FiArrowDown;
  const trendColor = trend === 'up' ? '#22c55e' : '#ef4444';

  return (
    <div
      onClick={onClick}
      style={{
        background: colorScheme.bg,
        border: `1px solid ${colorScheme.border}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = `0 10px 30px ${colorScheme.text}22`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#9ca3af', fontWeight: '600' }}>
            {title}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#fff' }}>
              {value}
            </h3>
            {unit && <span style={{ fontSize: '14px', color: '#6b7280' }}>{unit}</span>}
          </div>
          {change !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
              <TrendIcon size={16} color={trendColor} />
              <span style={{ fontSize: '13px', color: trendColor, fontWeight: '600' }}>
                {change}%
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: colorScheme.text + '22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={24} color={colorScheme.text} />
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
