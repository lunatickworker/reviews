// frontend/src/components/SimpleDeploy.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi, logsApi } from '../utils/api';

export default function SimpleDeploy() {
  const { token, isAdmin } = useAuth();
  const [shortUrl, setShortUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDeployment, setCurrentDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const logsContainerRef = useRef(null);

  // 현재 진행중인 배포 확인 (실시간)
  useEffect(() => {
    if (!currentDeployment || !token) return;

    const fetchLogs = async () => {
      try {
        const taskId = `task_${currentDeployment.id}`;
        const logsData = await logsApi.getByTaskId(taskId, 50, token);
        setLogs(logsData || []);

        // 배포 상태 확인
        if (currentDeployment.review_status === 'completed' || currentDeployment.review_status === 'failed') {
          // 완료/실패 상태면 10초 후 초기화
          const timer = setTimeout(() => {
            setCurrentDeployment(null);
            setLogs([]);
          }, 10000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('로그 조회 실패:', error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [currentDeployment, token]);

  // 로그 자동 스크롤 (컨테이너 내부만)
  useEffect(() => {
    if (logsContainerRef.current && logs.length > 0) {
      // 로그 컨테이너 내부에서만 아래로 스크롤
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <p>🔒 이 메뉴는 관리자만 이용 가능합니다.</p>
        </div>
      </div>
    );
  }

  const handleDeploy = async () => {
    if (!shortUrl.trim()) {
      alert('매장 주소(단축 URL)를 입력하세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await mapApi.automateMap(shortUrl, notes, token);
      
      // 배포 시작됨
      setCurrentDeployment({
        id: data.dbTaskId,
        url: shortUrl,
        notes: notes,
        review_status: 'in_progress',
        startTime: new Date(),
      });

      // 입력 필드 초기화
      setShortUrl('');
      setNotes('');
      setLogs([]);
    } catch (error) {
      alert(`❌ 오류: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDeploymentStatus = () => {
    if (!currentDeployment) return '준비 완료';
    return {
      'pending': '⏹️ 대기',
      'in_progress': '⏳ 진행중',
      'completed': '✅ 완료',
      'failed': '❌ 실패',
    }[currentDeployment.review_status] || '진행중';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🚀 배포 (리뷰 작성)</h1>

      <div style={styles.mainContent}>
        {/* 좌측: 배포 설정 */}
        <div style={styles.leftPanel}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>배포 설정</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>매장 주소 (Google Maps 단축 URL)</label>
              <input
                type="text"
                placeholder="예: https://maps.app.goo.gl/ABC123XYZ..."
                value={shortUrl}
                onChange={(e) => setShortUrl(e.target.value)}
                style={styles.input}
                disabled={isSubmitting || !!currentDeployment}
              />
              <p style={styles.hint}>
                🔗 Google Maps에서 공유 &gt; 단축 URL 복사
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>리뷰 메세지 (선택사항)</label>
              <textarea
                placeholder="예: 신메뉴 추천! 맛있어요. 강추합니다."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={styles.textarea}
                disabled={isSubmitting || !!currentDeployment}
                rows="4"
              />
              <p style={styles.hint}>
                💬 입력한 메세지가 리뷰에 자동 입력됩니다
              </p>
            </div>

            <button
              onClick={handleDeploy}
              disabled={isSubmitting || !!currentDeployment}
              style={{
                ...styles.deployButton,
                opacity: isSubmitting || !!currentDeployment ? 0.6 : 1,
                cursor: isSubmitting || !!currentDeployment ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? '배포 중...' : !!currentDeployment ? '진행중' : '배포 시작'}
            </button>

            {currentDeployment && (
              <div style={styles.deployInfo}>
                <p style={styles.deployUrl}>
                  📍 {currentDeployment.url}
                </p>
                {currentDeployment.notes && (
                  <p style={styles.deployNotes}>
                    💬 {currentDeployment.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 진행 상황 */}
        <div style={styles.rightPanel}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              진행 상황 {currentDeployment && getDeploymentStatus()}
            </h2>

            {currentDeployment ? (
              <>
                <div style={styles.statusInfo}>
                  <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>상태:</span>
                    <span style={{
                      ...styles.statusValue,
                      color: {
                        'pending': '#8b5cf6',
                        'in_progress': '#f59e0b',
                        'completed': '#10b981',
                        'failed': '#ef4444',
                      }[currentDeployment.review_status]
                    }}>
                      {getDeploymentStatus()}
                    </span>
                  </div>
                  <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>시작 시간:</span>
                    <span style={styles.statusValue}>
                      {currentDeployment.startTime.toLocaleTimeString('ko-KR')}
                    </span>
                  </div>
                </div>

                {/* 로그 */}
                <div style={styles.logsContainer}>
                  <h3 style={styles.logsTitle}>📝 실시간 로그</h3>
                  <div style={styles.logsList} ref={logsContainerRef}>
                    {logs.length === 0 ? (
                      <p style={styles.emptyLog}>로그를 기다리는 중...</p>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} style={styles.logLine}>
                          <span style={styles.logTime}>
                            {new Date(log.timestamp).toLocaleTimeString('ko-KR')}
                          </span>
                          <span style={{
                            ...styles.logMessage,
                            color: {
                              'DEBUG': '#6b7280',
                              'INFO': '#10b981',
                              'WARN': '#f59e0b',
                              'ERROR': '#ef4444',
                            }[log.log_level] || '#e5e7eb'
                          }}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 완료 메세지 */}
                {currentDeployment.review_status === 'completed' && (
                  <div style={styles.successMessage}>
                    ✅ 배포가 완료되었습니다!
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      브라우저에서 리뷰를 작성하고 제출해주세요.
                    </p>
                  </div>
                )}

                {currentDeployment.review_status === 'failed' && (
                  <div style={styles.errorMessage}>
                    ❌ 배포에 실패했습니다.
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      로그를 확인하고 다시 시도해주세요.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '48px', marginBottom: '12px' }}>🚀</p>
                <p style={{ color: '#9ca3af', marginBottom: '8px' }}>
                  아직 배포가 진행중이 아닙니다.
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                  좌측에서 매장 정보를 입력하고 배포를 시작하세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 안내 사항 */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>ℹ️ 배포 사용 가이드</h3>
        <ul style={styles.infoList}>
          <li>배포는 한 번에 하나의 매장만 진행됩니다.</li>
          <li>배포 중에는 새로운 배포를 시작할 수 없습니다.</li>
          <li>진행 상황은 실시간 로그에서 확인할 수 있습니다.</li>
          <li>배포 완료 후 브라우저에서 최종 확인하고 제출해주세요.</li>
          <li>전체 작업 현황은 대시보드에서 확인하세요.</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(15, 20, 25, 0.9) 0%, rgba(20, 30, 48, 0.8) 100%)',
    borderRadius: '12px',
    height: 'auto',
  },

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '16px',
  },

  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '16px',
  },

  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  card: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    backdropFilter: 'blur(10px)',
  },

  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  formGroup: {
    marginBottom: '12px',
  },

  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#d1d5db',
    marginBottom: '8px',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '13px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },

  hint: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '6px',
  },

  deployButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    marginTop: '8px',
  },

  deployInfo: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: '8px',
    borderLeft: '3px solid #7c3aed',
  },

  deployUrl: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0 0 6px 0',
    wordBreak: 'break-all',
  },

  deployNotes: {
    fontSize: '12px',
    color: '#d1d5db',
    margin: 0,
    fontStyle: 'italic',
  },

  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    marginBottom: '16px',
  },

  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },

  statusLabel: {
    color: '#9ca3af',
  },

  statusValue: {
    color: '#e5e7eb',
    fontWeight: '500',
  },

  logsContainer: {
    marginTop: '16px',
  },

  logsTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: '12px',
  },

  logsList: {
    height: '300px',
    overflowY: 'auto',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    boxSizing: 'border-box',
  },

  logLine: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },

  logTime: {
    color: '#6b7280',
    minWidth: '70px',
    flexShrink: 0,
  },

  logMessage: {
    color: '#e5e7eb',
    wordBreak: 'break-word',
  },

  emptyLog: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '20px 0',
    fontSize: '12px',
  },

  successMessage: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
  },

  errorMessage: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#7f1d1d',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
  },

  emptyState: {
    textAlign: 'center',
    padding: '20px 12px',
    color: '#9ca3af',
  },

  infoBox: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    backdropFilter: 'blur(10px)',
  },

  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: '8px',
    marginTop: 0,
  },

  infoList: {
    fontSize: '12px',
    color: '#d1d5db',
    margin: '0',
    paddingLeft: '16px',
  },

  accessDenied: {
    padding: '32px',
    textAlign: 'center',
    color: '#9ca3af',
  },
};
