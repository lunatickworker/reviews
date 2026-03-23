// frontend/src/components/ReviewDeploy.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi } from '../utils/api';

export default function ReviewDeploy() {
  const { token, isAdmin } = useAuth();
  const [shortUrl, setShortUrl] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // 로그 자동 스크롤
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // SSE 연결 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const connectSSE = (sessionId) => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    
    // 기존 연결 종료
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `${API_BASE_URL}/automate-map/logs?sessionId=${sessionId}&token=${token}`
    );

    eventSource.onopen = () => {
      addLog('📡 실시간 로그 연결 성공');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(data.message);

        // 완료 시 연결 종료
        if (data.completed) {
          eventSource.close();
          setLoading(false);
          if (data.placeName) {
            setPlaceName(data.placeName);
          }
        }
      } catch (e) {
        addLog(event.data);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      addLog('❌ 로그 연결이 끊어졌습니다.');
      setLoading(false);
    };

    eventSourceRef.current = eventSource;
  };

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
    setLogs([]);
    setStatusMsg('자동화 시작...');
    setPlaceName('');

    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);

    try {
      addLog('🚀 자동화 요청 시작');
      
      // SSE 연결 시작
      connectSSE(newSessionId);

      // API 요청
      const data = await mapApi.automateMap(shortUrl, newSessionId, token);
      addLog(`✅ 응답: ${data.message}`);
      
      if (data.placeName) {
        setPlaceName(data.placeName);
      }
      
      setStatusMsg(data.message);
      setShortUrl('');
    } catch (e) {
      addLog(`❌ 오류: ${e.message}`);
      setStatusMsg(`오류: ${e.message}`);
      setLoading(false);
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🚀 배포</h2>
      <p style={styles.subtitle}>구글맵 단축 URL을 입력하면 자동으로 리뷰 작성이 진행됩니다.</p>

      {/* 입력 섹션 */}
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

      {/* 장소명 표시 */}
      {placeName && (
        <div style={styles.resultBox}>
          <p style={styles.resultLabel}>✅ 장소명</p>
          <p style={styles.placeName}>{placeName}</p>
        </div>
      )}

      {/* 실시간 로그 */}
      {(logs.length > 0 || loading) && (
        <div style={styles.logsContainer}>
          <div style={styles.logsHeader}>
            <h3 style={styles.logsTitle}>📋 실시간 진행 로그</h3>
            {loading && <span style={styles.loadingDot}>●</span>}
          </div>
          
          <div style={styles.logBox}>
            {logs.length === 0 ? (
              <p style={styles.emptyLog}>로그 메시지를 기다리는 중...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} style={styles.logLine}>
                  <span style={styles.logTime}>[{log.timestamp}]</span>
                  <span style={styles.logMessage}>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* 상태 메시지 */}
      {statusMsg && !loading && (
        <div style={{
          ...styles.messageBox,
          borderLeftColor: statusMsg.includes('오류') ? '#d63384' : '#9cb49f',
          backgroundColor: statusMsg.includes('오류') ? 'rgba(214, 51, 132, 0.1)' : 'rgba(156, 180, 159, 0.1)',
        }}>
          <p style={styles.messageText}>{statusMsg}</p>
        </div>
      )}

      {/* 가이드 */}
      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>ℹ️ 사용 가이드</h4>
        <ul style={styles.infoList}>
          <li>Google Maps의 단축 URL을 입력하세요.</li>
          <li>시작 버튼을 클릭하면 백그라운드에서 자동으로 진행됩니다.</li>
          <li>좌측 로그 패널에서 실시간 진행 상황을 확인할 수 있습니다.</li>
          <li>프로덕션 환경에서는 브라우저 창 없이 백그라운드에서 진행됩니다.</li>
          <li>2분 후 자동으로 종료되며, 작업이 기록됩니다.</li>
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

  logsContainer: {
    marginBottom: '20px',
  },

  logsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },

  logsTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b4c8a',
  },

  loadingDot: {
    fontSize: '12px',
    color: '#b19cd9',
    animation: 'pulse 1s infinite',
  },

  logBox: {
    backgroundColor: '#f5f5f5',
    border: '1px solid rgba(200, 150, 255, 0.3)',
    borderRadius: '8px',
    padding: '15px',
    fontFamily: 'monospace',
    fontSize: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
    lineHeight: '1.6',
  },

  emptyLog: {
    color: '#999',
    margin: 0,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  logLine: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
    color: '#333',
  },

  logTime: {
    color: '#999',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    minWidth: '90px',
  },

  logMessage: {
    color: '#555',
    wordBreak: 'break-word',
    flex: 1,
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
