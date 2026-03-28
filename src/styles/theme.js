/**
 * 통합 디자인 테마 - 크리스탈 톤
 * 모든 페이지에서 사용할 일관된 전문성 있는 스타일
 */

export const colors = {
  // 배경
  background: {
    primary: 'linear-gradient(135deg, rgba(12, 20, 35, 0.99) 0%, rgba(20, 35, 55, 0.99) 100%)',
    secondary: 'rgba(20, 40, 65, 0.4)',
    tertiary: 'rgba(30, 50, 80, 0.6)',
    card: 'rgba(20, 40, 70, 0.35)',
  },

  // 텍스트
  text: {
    primary: '#e8eef5',
    secondary: '#b8c5d6',
    muted: '#7a8a9e',
  },

  // 보드/테두리
  border: 'rgba(70, 130, 180, 0.2)',
  borderLight: 'rgba(70, 130, 180, 0.1)',

  // 상태 색상
  success: '#4ba372',
  warning: '#d4a574',
  error: '#d45c5c',
  info: '#4682b4',

  // 크리스탈 카드 색상
  card: {
    crystal: { bg: 'rgba(70, 130, 180, 0.1)', border: 'rgba(70, 130, 180, 0.2)', text: '#6ca3d4' },
    blue: { bg: 'rgba(30, 60, 100, 0.15)', border: 'rgba(70, 130, 180, 0.2)', text: '#4682b4' },
    cyan: { bg: 'rgba(64, 135, 145, 0.1)', border: 'rgba(64, 135, 145, 0.2)', text: '#4a8fa8' },
    slate: { bg: 'rgba(50, 80, 110, 0.12)', border: 'rgba(70, 130, 180, 0.2)', text: '#7a9fb8' },
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const typography = {
  h1: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  h2: {
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  h3: {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  body: {
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  caption: {
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '1.4',
  },
};

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
};

export const shadows = {
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.12)',
  md: '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
  lg: '0 10px 24px 0 rgba(0, 0, 0, 0.18)',
  xl: '0 20px 40px 0 rgba(0, 0, 0, 0.2)',
};

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1400px',
};

export const getPageStyles = () => ({
  pageContainer: {
    background: colors.background.primary,
    minHeight: '100vh',
    padding: spacing.lg,
    color: colors.text.primary,
  },

  pageContent: {
    maxWidth: breakpoints.wide,
    margin: '0 auto',
  },

  pageHeader: {
    marginBottom: spacing.xl,
  },

  pageTitle: {
    ...typography.h1,
    margin: `0 0 ${spacing.sm} 0`,
    color: colors.text.primary,
    letterSpacing: '-0.5px',
  },

  pageDescription: {
    ...typography.body,
    margin: 0,
    color: colors.text.muted,
  },

  section: {
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    ...typography.h2,
    margin: `0 0 ${spacing.md} 0`,
    color: colors.text.primary,
  },

  card: {
    background: colors.background.card,
    backdropFilter: 'blur(8px)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.sm,
  },

  errorCard: {
    background: 'rgba(212, 92, 92, 0.08)',
    border: `1px solid rgba(212, 92, 92, 0.15)`,
    borderRadius: borderRadius.md,
    padding: `${spacing.md} ${spacing.lg}`,
    marginBottom: spacing.md,
    color: '#d9a8a8',
    ...typography.caption,
  },

  successCard: {
    background: 'rgba(75, 163, 114, 0.08)',
    border: `1px solid rgba(75, 163, 114, 0.15)`,
    borderRadius: borderRadius.md,
    padding: `${spacing.md} ${spacing.lg}`,
    marginBottom: spacing.md,
    color: '#b8d9c8',
    ...typography.caption,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: spacing.md,
  },

  gridWide: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: spacing.lg,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  tableHeader: {
    background: 'rgba(30, 50, 80, 0.6)',
    borderBottom: `1px solid ${colors.border}`,
    padding: spacing.md,
    textAlign: 'left',
    fontWeight: '700',
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    letterSpacing: '0.5px',
  },

  tableCell: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.borderLight}`,
    ...typography.body,
    verticalAlign: 'middle',
  },

  tableRowHover: {
    background: 'rgba(70, 130, 180, 0.1)',
    transition: 'background 0.2s ease',
  },

  tableRowStriped: {
    background: 'rgba(70, 130, 180, 0.04)',
  },

  tableRowAlternate: {
    background: 'rgba(255, 192, 203, 0.08)',
  },

  button: {
    primary: {
      background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
      color: colors.text.primary,
      border: 'none',
      padding: `${spacing.sm} ${spacing.md}`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      '&:hover': {
        opacity: 0.9,
      },
    },

    secondary: {
      background: colors.background.tertiary,
      color: colors.text.primary,
      border: `1px solid ${colors.border}`,
      padding: `${spacing.sm} ${spacing.md}`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },

    danger: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: '#fca5a5',
      border: `1px solid rgba(239, 68, 68, 0.3)`,
      padding: `${spacing.sm} ${spacing.md}`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
  },

  input: {
    width: '100%',
    padding: spacing.md,
    background: colors.background.tertiary,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    transition: 'all 0.2s ease',
    '&::placeholder': {
      color: colors.text.muted,
    },
    '&:focus': {
      outline: 'none',
      borderColor: colors.card.blue.border,
      background: colors.background.card,
    },
  },

  modal: {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    content: {
      background: colors.background.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto',
      border: `1px solid ${colors.border}`,
    },
  },

  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    color: colors.text.muted,
    ...typography.body,
  },
});

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  breakpoints,
  getPageStyles,
};
