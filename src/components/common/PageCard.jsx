// frontend/src/components/common/PageCard.jsx
import React from 'react';
import { colors, borderRadius, spacing, shadows } from '../../styles/theme';

/**
 * 일관된 카드 컴포넌트
 * 모든 페이지에서 동일한 스타일의 카드 사용
 * variant: default, elevated, bordered, colorful
 */
const PageCard = ({ 
  children, 
  title, 
  subtitle,
  actions,
  variant = 'default',
  color = 'default', // default, purple, blue, green, orange, red
  style = {},
  padding = 'md',
}) => {
  const paddingMap = {
    sm: spacing.md,
    md: spacing.lg,
    lg: spacing.xl,
  };

  const colorSchemes = {
    default: {
      bg: colors.background.card,
      border: colors.border,
      text: colors.text.primary,
    },
    purple: {
      bg: 'rgba(168, 85, 247, 0.08)',
      border: 'rgba(168, 85, 247, 0.3)',
      text: '#a855f7',
    },
    blue: {
      bg: 'rgba(59, 130, 246, 0.08)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#3b82f6',
    },
    green: {
      bg: 'rgba(34, 197, 94, 0.08)',
      border: 'rgba(34, 197, 94, 0.3)',
      text: '#22c55e',
    },
    orange: {
      bg: 'rgba(249, 115, 22, 0.08)',
      border: 'rgba(249, 115, 22, 0.3)',
      text: '#f97316',
    },
    red: {
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#ef4444',
    },
  };

  const colorScheme = colorSchemes[color] || colorSchemes.default;

  const variantStyles = {
    default: {
      background: colorScheme.bg,
      border: `1px solid ${colorScheme.border}`,
      borderRadius: borderRadius.lg,
      backdropFilter: 'blur(10px)',
    },
    elevated: {
      background: colorScheme.bg,
      border: `1px solid ${colorScheme.border}`,
      borderRadius: borderRadius.lg,
      backdropFilter: 'blur(10px)',
      boxShadow: shadows.lg,
    },
    bordered: {
      background: colorScheme.bg,
      border: `2px solid ${colorScheme.border}`,
      borderRadius: borderRadius.lg,
      backdropFilter: 'blur(10px)',
    },
    colorful: {
      background: `linear-gradient(135deg, ${colorScheme.bg} 0%, rgba(37, 45, 66, 0.5) 100%)`,
      border: `1px solid ${colorScheme.border}`,
      borderRadius: borderRadius.lg,
      backdropFilter: 'blur(10px)',
      boxShadow: `0 8px 32px ${colorScheme.text}1a`,
    },
  };

  return (
    <div
      style={{
        ...variantStyles[variant],
        padding: paddingMap[padding],
        ...style,
      }}
    >
      {(title || subtitle || actions) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing.md,
            paddingBottom: spacing.md,
            borderBottom: `1px solid ${colorScheme.border}`,
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colorScheme.text,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: colors.text.muted,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default PageCard;
