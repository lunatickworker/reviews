// frontend/src/components/common/ToastContainer.jsx
import React, { useState, useCallback } from 'react';
import Toast from './Toast';

export const useToast = () => {
  // 이것은 useContext와 함께 사용할 것입니다
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{ pointerEvents: 'auto' }}
        >
          <Toast
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration || 3000}
            onClose={removeToast}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
