// frontend/src/components/common/Alert.jsx
import React from 'react';
import { getPageStyles, spacing } from '../../styles/theme';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

/**
 * 일관된 알림 컴포넌트
 * success, error, warning, info
 */
const Alert = ({ 
  type = 'info', 
  message, 
  onClose,
  icon: Icon,
}) => {

  const typeStyles = {
    success: {
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.3)',
      text: '#86efac',
      defaultIcon: FiCheckCircle,
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#fca5a5',
      defaultIcon: FiAlertCircle,
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: '#fcd34d',
      defaultIcon: FiAlertCircle,
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#93c5fd',
      defaultIcon: FiInfo,
    },
  };

  const currentStyle = typeStyles[type] || typeStyles.info;
  const IconComponent = Icon || currentStyle.defaultIcon;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.md,
        background: currentStyle.bg,
        border: `1px solid ${currentStyle.border}`,
        borderRadius: '8px',
        padding: `${spacing.md} ${spacing.lg}`,
        marginBottom: spacing.md,
        color: currentStyle.text,
        fontSize: '13px',
      }}
    >
      <IconComponent style={{ flexShrink: 0, marginTop: '2px' }} />
      <p style={{ margin: 0, flex: 1 }}>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: currentStyle.text,
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <FiX />
        </button>
      )}
    </div>
  );
};

export default Alert;
