// frontend/src/components/common/Toast.jsx
import React, { useEffect } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const Toast = ({ id, type = 'info', message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const typeStyles = {
    success: {
      bg: 'rgba(34, 197, 94, 0.95)',
      border: 'rgba(34, 197, 94, 0.3)',
      text: '#fff',
      icon: FiCheckCircle,
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.95)',
      border: 'rgba(239, 68, 68, 0.3)',
      text: '#fff',
      icon: FiAlertCircle,
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.95)',
      border: 'rgba(245, 158, 11, 0.3)',
      text: '#fff',
      icon: FiAlertCircle,
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.95)',
      border: 'rgba(59, 130, 246, 0.3)',
      text: '#fff',
      icon: FiInfo,
    },
  };

  const currentStyle = typeStyles[type] || typeStyles.info;
  const IconComponent = currentStyle.icon;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: currentStyle.bg,
        border: `1px solid ${currentStyle.border}`,
        color: currentStyle.text,
        padding: '12px 16px',
        borderRadius: '8px',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <IconComponent size={20} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', lineHeight: '1.4' }}>
        {message}
      </div>
      <button
        onClick={() => onClose(id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <FiX size={18} />
      </button>

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
      `}</style>
    </div>
  );
};

export default Toast;
