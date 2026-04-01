// frontend/src/components/common/Alert.jsx
import React, { useEffect } from 'react';
import { spacing } from '../../styles/theme';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

/**
 * 크리스탈 글래스모르피즘 토스트 알림 컴포넌트
 */
const Alert = ({ 
  type = 'info', 
  message, 
  onClose,
  duration = 3000,
  isFloating = true,
  icon: Icon,
}) => {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.4)',
      text: '#86efac',
      shadow: 'rgba(34, 197, 94, 0.2)',
      defaultIcon: FiCheckCircle,
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.4)',
      text: '#fca5a5',
      shadow: 'rgba(239, 68, 68, 0.2)',
      defaultIcon: FiAlertCircle,
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.4)',
      text: '#fcd34d',
      shadow: 'rgba(245, 158, 11, 0.2)',
      defaultIcon: FiAlertCircle,
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.4)',
      text: '#93c5fd',
      shadow: 'rgba(59, 130, 246, 0.2)',
      defaultIcon: FiInfo,
    },
  };

  const currentStyle = typeStyles[type] || typeStyles.info;
  const IconComponent = Icon || currentStyle.defaultIcon;

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: currentStyle.bg,
    border: `1.5px solid ${currentStyle.border}`,
    color: currentStyle.text,
    padding: '14px 18px',
    borderRadius: '12px',
    minWidth: '320px',
    maxWidth: '480px',
    boxShadow: `
      0 8px 32px 0 ${currentStyle.shadow},
      0 0 1px 0 ${currentStyle.border}
    `,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };

  const floatingStyle = isFloating ? {
    ...baseStyle,
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    animation: 'slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  } : baseStyle;

  return (
    <>
      <div style={floatingStyle}>
        <IconComponent size={20} style={{ flexShrink: 0, opacity: 0.9 }} />
        <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', lineHeight: '1.4', opacity: 0.95 }}>
          {message}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '4px 4px 4px 8px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              opacity: 0.7,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default Alert;
