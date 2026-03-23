import React, { useEffect, useState } from 'react';
import { mapApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ImageReviewManagement() {
  const { token } = useAuth();
  const [imageReviews, setImageReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchImageReviews = async () => {
      try {
        const data = await mapApi.getImageReviews(token);
        setImageReviews(data || []);
      } catch (error) {
        console.error('이미지 리뷰 데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchImageReviews();
  }, [token]);

  const filteredReviews = imageReviews.filter((review) => {
    if (filter === 'pending') return review.status === 'pending';
    if (filter === 'completed') return review.status === 'completed';
    if (filter === 'failed') return review.status === 'failed';
    return true;
  });

  const stats = {
    total: imageReviews.length,
    pending: imageReviews.filter((r) => r.status === 'pending').length,
    completed: imageReviews.filter((r) => r.status === 'completed').length,
    failed: imageReviews.filter((r) => r.status === 'failed').length,
  };

  if (loading) {
    return <div style={styles.loading}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🖼️ 이미지 리뷰 현황</h2>

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

      {/* 이미지 리뷰 목록 - 카드 레이아웃 */}
      {filteredReviews.length === 0 ? (
        <p style={styles.emptyText}>이미지 리뷰가 없습니다.</p>
      ) : (
        <div style={styles.gridContainer}>
          {filteredReviews.map((review, idx) => (
            <div key={idx} style={styles.card}>
              <div style={styles.imageSection}>
                {review.image_url ? (
                  <img
                    src={review.image_url}
                    alt="리뷰"
                    style={styles.image}
                    onError={(e) => {
                      e.target.src = '🖼️';
                      e.target.style.lineHeight = '150px';
                      e.target.style.fontSize = '60px';
                    }}
                  />
                ) : (
                  <div style={styles.imagePlaceholder}>🖼️</div>
                )}
              </div>

              <div style={styles.cardContent}>
                <h4 style={styles.placeName}>{review.place_name || '-'}</h4>
                <p style={styles.date}>
                  {new Date(review.created_at).toLocaleDateString('ko-KR')}
                </p>

                <div style={styles.statusSection}>
                  <span style={getStatusStyle(review.status)}>
                    {getStatusLabel(review.status)}
                  </span>
                </div>

                {review.description && (
                  <p style={styles.description}>{review.description}</p>
                )}
              </div>
            </div>
          ))}
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
      display: 'inline-block',
    },
    completed: {
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      color: '#2e7d32',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
    },
    failed: {
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(244, 67, 54, 0.2)',
      color: '#c62828',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
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

  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },

  card: {
    background: 'rgba(37, 45, 66, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },

  imageSection: {
    width: '100%',
    height: '200px',
    backgroundColor: '#1a1f2e',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  imagePlaceholder: {
    fontSize: '60px',
    opacity: 0.5,
  },

  cardContent: {
    padding: '15px',
  },

  placeName: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  date: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#8b96a8',
  },

  statusSection: {
    marginBottom: '10px',
  },

  description: {
    margin: '10px 0 0 0',
    fontSize: '12px',
    color: '#b0b9c6',
    lineHeight: '1.4',
    maxHeight: '60px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
