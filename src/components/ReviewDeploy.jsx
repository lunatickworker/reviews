// frontend/src/components/ReviewDeploy.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi } from '../utils/api';

export default function ReviewDeploy() {
  const { token, isAdmin } = useAuth();
  const [shortUrl, setShortUrl] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <p style={styles.deniedText}>🔒 이 메뉴는 관리자만 이용 가능합니다.</p>
        </div>
      </div>
    );
  }

  const handleStart = async () => {
    if (!shortUrl.trim()) {
      alert('단축 URL을 입력하세요.');
      return;
    }
    setLoading(true);
    setStatusMsg('자동화 진행 중...');
    setPlaceName('');

    try {
      const data = await mapApi.automateMap(shortUrl, `task_${Date.now()}`, token);
      setPlaceName(data.placeName);
      setStatusMsg(data.message);
      setShortUrl('');
    } catch (e) {
      setStatusMsg(`오류: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🚀 배포</h2>
      <p style={styles.subtitle}>구글맵 단축 URL을 입력하면 자동으로 리뷰 작성 페이지가 열립니다.</p>

      <div style={styles.inputGroup}>
        <input
          type="text"
          placeholder="단축 URL 입력 (예: https://maps.app.goo.gl/...)"
          value={shortUrl}
          onChange={(e) => setShortUrl(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '진행 중...' : '시작'}
        </button>
      </div>

      {placeName && (
        <div style={styles.resultBox}>
          <p style={styles.resultLabel}>✅ 장소명</p>
          <p style={styles.placeName}>{placeName}</p>
        </div>
      )}

      {statusMsg && (
        <div style={{
          ...styles.messageBox,
          borderLeftColor: loading ? '#b19cd9' : statusMsg.includes('오류') ? '#d63384' : '#9cb49f',
          backgroundColor: loading ? 'rgba(177, 156, 217, 0.1)' : statusMsg.includes('오류') ? 'rgba(214, 51, 132, 0.1)' : 'rgba(156, 180, 159, 0.1)',
        }}>
          <p style={styles.messageText}>{statusMsg}</p>
        </div>
      )}

      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>ℹ️ 사용 가이드</h4>
        <ul style={styles.infoList}>
          <li>Google Maps의 단축 URL을 입력하세요.</li>
          <li>시작 버튼을 클릭하면 브라우저가 자동으로 열립니다.</li>
          <li>리뷰 작성 페이지가 자동으로 포커스됩니다.</li>
          <li>직접 리뷰를 작성하면 작업이 자동으로 기록됩니다.</li>
          <li>2분 후 자동으로 종료되며, 세션은 저장됩니다.</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(255, 240, 245, 0.4)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '30px',
    border: '1px solid rgba(219, 112, 147, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },

  title: {
    margin: '0 0 10px 0',
    color: '#6b4c8a',
    fontSize: '24px',
    fontWeight: '600',
  },

  subtitle: {
    margin: '0 0 25px 0',
    color: '#b19cd9',
    fontSize: '14px',
  },

  inputGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '25px',
  },

  input: {
    flex: 1,
    padding: '12px 15px',
    border: '1px solid rgba(200, 150, 255, 0.4)',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'rgba(230, 190, 255, 0.2)',
    color: '#5a3f7d',
    backdropFilter: 'blur(5px)',
  },

  button: {
    padding: '12px 24px',
    backgroundColor: 'rgba(177, 156, 217, 0.4)',
    border: '1px solid rgba(177, 156, 217, 0.6)',
    borderRadius: '8px',
    color: '#6b4c8a',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
  },

  resultBox: {
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(156, 180, 159, 0.15)',
    border: '1px solid rgba(156, 180, 159, 0.3)',
    borderRadius: '8px',
    backdropFilter: 'blur(5px)',
  },

  resultLabel: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b5a7d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  placeName: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#2e7d32',
  },

  messageBox: {
    marginBottom: '20px',
    padding: '15px',
    borderLeft: '4px solid',
    borderRadius: '8px',
    backdropFilter: 'blur(5px)',
  },

  messageText: {
    margin: '0',
    fontSize: '14px',
    color: '#5a3f7d',
    fontWeight: '500',
  },

  infoBox: {
    padding: '20px',
    background: 'rgba(200, 150, 255, 0.1)',
    border: '1px solid rgba(200, 150, 255, 0.3)',
    borderRadius: '8px',
    backdropFilter: 'blur(5px)',
  },

  infoTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b4c8a',
  },

  infoList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#5a3f7d',
    lineHeight: '1.8',
  },

  accessDenied: {
    padding: '40px 20px',
    textAlign: 'center',
    background: 'rgba(214, 51, 132, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(214, 51, 132, 0.3)',
  },

  deniedText: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#d63384',
  },
};
