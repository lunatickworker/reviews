import React, { useCallback, useEffect, useState } from 'react';
import { mapApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ReviewManagement() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchReviews = useCallback(async () => {
    try {
      const data = await mapApi.getReviews(token);
      setReviews(data || []);
    } catch (error) {
      console.error('리뷰 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

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
                <th style={styles.th}>메모</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((review, idx) => (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.td}>{review.place_name || '-'}</td>
                  <td style={styles.td}>
                    {'⭐'.repeat(review.rating || 0)}
                  </td>
                  <td style={styles.td}>
                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={styles.td}>
                    <span style={getStatusStyle(review.status)}>
                      {getStatusLabel(review.status)}
                    </span>
                  </td>
                  <td style={styles.td}>{review.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    color: '#888',
  },

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6b4c8a',
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
    background: 'rgba(230, 190, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(200, 150, 255, 0.4)',
    textAlign: 'center',
  },

  statLabel: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#b19cd9',
    fontWeight: '500',
  },

  statValue: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#6b4c8a',
  },

  filterSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },

  filterButton: {
    padding: '10px 20px',
    border: '1px solid rgba(200, 150, 255, 0.4)',
    borderRadius: '8px',
    backgroundColor: 'rgba(230, 190, 255, 0.2)',
    color: '#6b4c8a',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    transition: 'all 0.3s ease',
  },

  filterButtonActive: {
    backgroundColor: 'rgba(200, 150, 255, 0.6)',
    color: '#5a3f7d',
    borderColor: 'rgba(200, 150, 255, 0.8)',
  },

  emptyText: {
    textAlign: 'center',
    color: '#bbb',
    padding: '40px 20px',
  },

  tableWrapper: {
    overflowX: 'auto',
    background: 'rgba(230, 190, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(200, 150, 255, 0.3)',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },

  thead: {
    background: 'rgba(200, 150, 255, 0.3)',
  },

  th: {
    padding: '12px',
    textAlign: 'left',
    color: '#6b4c8a',
    fontWeight: '600',
    borderBottom: '2px solid rgba(200, 150, 255, 0.4)',
  },

  tr: {
    borderBottom: '1px solid rgba(200, 150, 255, 0.2)',
    transition: 'all 0.2s ease',
  },

  td: {
    padding: '12px',
    color: '#555',
  },
};
