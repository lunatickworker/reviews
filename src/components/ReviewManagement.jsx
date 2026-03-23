import React, { useEffect, useState } from 'react';
import { mapApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ReviewManagement() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [progressLogs, setProgressLogs] = useState([]);
  const [ratingInput, setRatingInput] = useState(0);
  const [notesInput, setNotesInput] = useState('');

  // 진행 로그 기록 함수
  const logProgress = (message) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    setProgressLogs(prev => [...prev, { timestamp, message }]);
  };

  // 리뷰 항목 클릭 시 진행 로그 시작
  const handleReviewClick = (review) => {
    setSelectedReview(review);
    setRatingInput(review.rating || 0);
    setNotesInput(review.notes || '');
    setProgressLogs([]);
    logProgress(`📄 페이지 오픈: ${review.place_name}`);
    setTimeout(() => logProgress(`📑 리뷰 탭 진입 준비 완료`), 500);
  };

  // 리뷰 작성 완료
  const handleReviewComplete = async () => {
    if (!selectedReview) return;
    
    logProgress(`✍️ 리뷰 작성 완료`);
    setTimeout(() => logProgress(`⭐ 별점 입력 대기 중... (${ratingInput}점)`), 800);
  };

  // 별점 주기
  const handleRatingSubmit = async () => {
    if (!selectedReview || ratingInput === 0) {
      alert('별점을 입력해주세요');
      return;
    }

    try {
      logProgress(`⭐ 별점 주기 시작... (${ratingInput}점)`);
      
      // DB에 저장
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE_URL}/reviews/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          id: selectedReview.id,
          rating: ratingInput,
          notes: notesInput,
          status: 'completed',
        }),
      });

      if (!response.ok) throw new Error('저장 실패');
      
      logProgress(`✅ 별점 주기 완료! (${ratingInput}점)`);
      logProgress(`💾 데이터베이스에 기록 완료`);
      logProgress(`🎉 진행중 → 완료 상태로 변경`);

      // 상태 업데이트
      setReviews(reviews.map(r => 
        r.id === selectedReview.id 
          ? { ...r, rating: ratingInput, notes: notesInput, status: 'completed' }
          : r
      ));

      setTimeout(() => {
        setSelectedReview(null);
        setRatingInput(0);
      }, 2000);
    } catch (error) {
      console.error('별점 저장 오류:', error);
      logProgress(`❌ 오류: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        console.log('📡 리뷰 조회 시작, token:', token?.substring(0, 20) + '...');
        const data = await mapApi.getReviews(token);
        console.log('✅ 리뷰 조회 성공:', data);
        setReviews(data || []);
        setLoading(false);
      } catch (error) {
        console.error('❌ 리뷰 데이터 조회 실패:', error);
        setLoading(false);
      }
    };

    if (token) fetchReviews();
  }, [token]);

  const filteredReviews = reviews.filter((review) => {
    if (filter === 'pending') return review.status === 'pending';
    if (filter === 'completed') return review.status === 'completed';
    if (filter === 'failed') return review.status === 'failed';
    return true;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    completed: reviews.filter((r) => r.status === 'completed').length,
    failed: reviews.filter((r) => r.status === 'failed').length,
  };

  if (loading) {
    return <div style={styles.loading}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>✍️ 리뷰 작성 현황</h2>

      <div style={styles.mainContent}>
        {/* 왼쪽: 리뷰 목록 및 통계 */}
        <div style={styles.leftPanel}>
          {/* 통계 */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>전체</p>
              <p style={styles.statValue}>{stats.total}</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>대기</p>
              <p style={{ ...styles.statValue, color: '#ffc107' }}>{stats.pending}</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>완료</p>
              <p style={{ ...styles.statValue, color: '#4caf50' }}>{stats.completed}</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>실패</p>
              <p style={{ ...styles.statValue, color: '#f44336' }}>{stats.failed}</p>
            </div>
          </div>

          {/* 필터 */}
          <div style={styles.filterSection}>
            {['all', 'pending', 'completed', 'failed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterButton,
                  ...(filter === f ? styles.filterButtonActive : {}),
                }}
              >
                {f === 'all' && '전체'}
                {f === 'pending' && '⏳ 대기'}
                {f === 'completed' && '✅ 완료'}
                {f === 'failed' && '❌ 실패'}
              </button>
            ))}
          </div>

          {/* 리뷰 목록 */}
          {filteredReviews.length === 0 ? (
            <p style={styles.emptyText}>리뷰가 없습니다.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>장소명</th>
                    <th style={styles.th}>별점</th>
                    <th style={styles.th}>생성일</th>
                    <th style={styles.th}>상태</th>
                    <th style={styles.th}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{review.place_name || '-'}</td>
                      <td style={styles.td}>
                        {'⭐'.repeat(review.rating || 0) || '-'}
                      </td>
                      <td style={styles.td}>
                        {new Date(review.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(review.status)}>
                          {getStatusLabel(review.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleReviewClick(review)}
                          style={{
                            ...styles.actionButton,
                            ...(selectedReview?.id === review.id ? styles.actionButtonActive : {}),
                          }}
                        >
                          {selectedReview?.id === review.id ? '진행 중' : '시작'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 오른쪽: 진행 로그 및 별점 입력 */}
        {selectedReview && (
          <div style={styles.rightPanel}>
            {/* 진행 로그 */}
            <div style={styles.logSection}>
              <h3 style={styles.logTitle}>📊 실시간 진행 로그</h3>
              <div style={styles.logContainer}>
                {progressLogs.length === 0 ? (
                  <p style={styles.logEmpty}>진행 로그가 없습니다</p>
                ) : (
                  progressLogs.map((log, idx) => (
                    <div key={idx} style={styles.logEntry}>
                      <span style={styles.logTime}>{log.timestamp}</span>
                      <span style={styles.logMessage}>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 별점 입력 */}
            <div style={styles.ratingSection}>
              <h3 style={styles.ratingTitle}>⭐ 별점 주기</h3>
              <p style={styles.placeName}>{selectedReview.place_name}</p>
              
              <div style={styles.ratingInputGroup}>
                <div style={styles.starGroup}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        setRatingInput(star);
                        logProgress(`⭐ ${star}점 선택`);
                      }}
                      style={{
                        ...styles.starButton,
                        ...(ratingInput >= star ? styles.starButtonActive : {}),
                      }}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <p style={styles.ratingValue}>{ratingInput > 0 ? `${ratingInput}점` : '별점 미선택'}</p>
              </div>

              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="추가 메모 (선택사항)"
                style={styles.notesInput}
              />

              <button
                onClick={handleReviewComplete}
                style={styles.completeButton}
              >
                ✍️ 리뷰 작성 완료
              </button>

              <button
                onClick={handleRatingSubmit}
                style={{
                  ...styles.submitButton,
                  opacity: ratingInput === 0 ? 0.5 : 1,
                }}
                disabled={ratingInput === 0}
              >
                ✅ 별점 저장 및 완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: '대기 중',
    completed: '완료',
    failed: '실패',
  };
  return labels[status] || status;
}

function getStatusStyle(status) {
  const styles = {
    pending: {
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(255, 193, 7, 0.2)',
      color: '#f57f17',
      fontSize: '12px',
      fontWeight: '600',
    },
    completed: {
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      color: '#2e7d32',
      fontSize: '12px',
      fontWeight: '600',
    },
    failed: {
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(244, 67, 54, 0.2)',
      color: '#c62828',
      fontSize: '12px',
      fontWeight: '600',
    },
  };
  return styles[status] || {};
}

const styles = {
  container: {
    padding: '20px',
  },

  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#8b96a8',
  },

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '30px',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },

  statCard: {
    padding: '20px',
    background: 'rgba(124, 58, 237, 0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    textAlign: 'center',
  },

  statLabel: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#8b96a8',
    fontWeight: '500',
  },

  statValue: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
  },

  filterSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },

  filterButton: {
    padding: '10px 20px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    color: '#b0b9c6',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    transition: 'all 0.3s ease',
  },

  filterButtonActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.4)',
    color: '#ffffff',
    borderColor: 'rgba(124, 58, 237, 0.6)',
  },

  emptyText: {
    textAlign: 'center',
    color: '#8b96a8',
    padding: '40px 20px',
  },

  tableWrapper: {
    overflowX: 'auto',
    background: 'rgba(37, 45, 66, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },

  thead: {
    background: 'rgba(124, 58, 237, 0.2)',
  },

  th: {
    padding: '12px',
    textAlign: 'left',
    color: '#ffffff',
    fontWeight: '600',
    borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
  },

  tr: {
    borderBottom: '1px solid rgba(124, 58, 237, 0.15)',
    transition: 'all 0.2s ease',
  },

  td: {
    padding: '12px',
    color: '#e0e0e0',
  },

  // 2단 레이아웃
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '20px',
    alignItems: 'start',
  },

  leftPanel: {
    minWidth: 0,
  },

  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    position: 'sticky',
    top: 100,
  },

  // 진행 로그 섹션
  logSection: {
    background: 'rgba(37, 45, 66, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    padding: '20px',
  },

  logTitle: {
    margin: '0 0 15px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
  },

  logContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '300px',
    overflowY: 'auto',
    background: 'rgba(15, 20, 25, 0.5)',
    borderRadius: '8px',
    padding: '12px',
  },

  logEntry: {
    display: 'flex',
    gap: '10px',
    fontSize: '12px',
    color: '#b0b9c6',
  },

  logTime: {
    color: '#7c3aed',
    fontWeight: '600',
    minWidth: '70px',
  },

  logMessage: {
    flex: 1,
    color: '#e0e0e0',
  },

  logEmpty: {
    textAlign: 'center',
    color: '#8b96a8',
    fontSize: '12px',
    padding: '20px 0',
  },

  // 별점 입력 섹션
  ratingSection: {
    background: 'rgba(37, 45, 66, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    padding: '20px',
  },

  ratingTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
  },

  placeName: {
    margin: '0 0 15px 0',
    fontSize: '12px',
    color: '#8b96a8',
    fontWeight: '500',
  },

  ratingInputGroup: {
    marginBottom: '15px',
  },

  starGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
    justifyContent: 'center',
  },

  starButton: {
    fontSize: '24px',
    background: 'rgba(124, 58, 237, 0.1)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '6px',
    padding: '8px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    opacity: 0.5,
  },

  starButtonActive: {
    opacity: 1,
    background: 'rgba(124, 58, 237, 0.5)',
    borderColor: 'rgba(124, 58, 237, 0.8)',
  },

  ratingValue: {
    textAlign: 'center',
    margin: 0,
    fontSize: '12px',
    color: '#7c3aed',
    fontWeight: '600',
  },

  notesInput: {
    width: '100%',
    height: '80px',
    padding: '10px',
    background: 'rgba(15, 20, 25, 0.6)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '12px',
    fontFamily: 'inherit',
    marginBottom: '12px',
    resize: 'none',
  },

  completeButton: {
    padding: '10px',
    background: 'rgba(124, 58, 237, 0.3)',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px',
    transition: 'all 0.3s ease',
    marginBottom: '8px',
  },

  submitButton: {
    padding: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #da127d)',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px',
    transition: 'all 0.3s ease',
  },

  actionButton: {
    padding: '6px 12px',
    background: 'rgba(124, 58, 237, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '4px',
    color: '#7c3aed',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },

  actionButtonActive: {
    background: 'rgba(124, 58, 237, 0.5)',
    borderColor: 'rgba(124, 58, 237, 0.7)',
    color: '#ffffff',
  },
};
