// frontend/src/components/common/Loading.jsx
import React from 'react';
import { getPageStyles } from '../../styles/theme';

/**
 * 일관된 로딩 표시 컴포넌트
 */
const Loading = ({ message = '데이터 로드 중...' }) => {
  const styles = getPageStyles();

  return (
    <div style={styles.loading}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(168, 85, 247, 0.2)',
            borderTop: '4px solid #a855f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ margin: 0, fontSize: '14px' }}>{message}</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Loading;
