import React, { useEffect, useState } from 'react';
import { mapApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ReviewStatistics() {
  const { token } = useAuth();
  const [statistics, setStatistics] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7days'); // 7days, 30days, all

  useEffect(() => {
    fetchStatistics();
  }, [token, dateRange]);

  const fetchStatistics = async () => {
    try {
      const data = await mapApi.getReviewStatistics(token, dateRange);
      setStatistics(data?.by_user || []);
      setDailyStats(data?.by_date || []);
    } catch (error) {
      console.error('통계 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalReviews = statistics.reduce((sum, user) => sum + (user.count || 0), 0);
  const topUser = statistics.length > 0 ? statistics[0] : null;

  if (loading) {
    return <div style={styles.loading}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📈 일일 리뷰 통계</h2>
        
        {/* 날짜 범위 선택 */}
        <div style={styles.dateFilterSection}>
          {['7days', '30days', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                ...styles.dateButton,
                ...(dateRange === range ? styles.dateButtonActive : {}),
              }}
            >
              {range === '7days' && '최근 7일'}
              {range === '30days' && '최근 30일'}
              {range === 'all' && '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 통계 */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>총 리뷰 작성</p>
          <p style={styles.summaryValue}>{totalReviews}</p>
        </div>
        {topUser && (
          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>최다 작성자</p>
            <p style={styles.summaryValue}>{topUser.user_id}</p>
            <p style={styles.summarySubValue}>{topUser.count}건</p>
          </div>
        )}
      </div>

      {/* 사용자별 통계 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>👤 사용자별 리뷰 작성 현황</h3>
        {statistics.length === 0 ? (
          <p style={styles.emptyText}>데이터가 없습니다.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>사용자 ID</th>
                  <th style={styles.th}>리뷰 작성 수</th>
                  <th style={styles.th}>비율</th>
                </tr>
              </thead>
              <tbody>
                {statistics.map((user, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{user.user_id}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge}>{user.count}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.progressWrapper}>
                        <div
                          style={{
                            ...styles.progressBar,
                            width: `${(user.count / (statistics[0]?.count || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span style={styles.percentage}>
                        {totalReviews > 0 ? ((user.count / totalReviews) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 날짜별 통계 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📅 날짜별 리뷰 작성 현황</h3>
        {dailyStats.length === 0 ? (
          <p style={styles.emptyText}>데이터가 없습니다.</p>
        ) : (
          <div style={styles.chartsGrid}>
            {dailyStats.map((stat, idx) => (
              <div key={idx} style={styles.chartCard}>
                <p style={styles.chartDate}>
                  {new Date(stat.date).toLocaleDateString('ko-KR')}
                </p>
                <p style={styles.chartValue}>{stat.count}</p>
                <p style={styles.chartLabel}>건</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 바 그래프로 표현한 날짜별 통계 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📊 일별 작성량 추이</h3>
        {dailyStats.length === 0 ? (
          <p style={styles.emptyText}>데이터가 없습니다.</p>
        ) : (
          <div style={styles.barChartContainer}>
            {dailyStats.map((stat, idx) => {
              const maxCount = Math.max(...dailyStats.map((s) => s.count || 0));
              const percentage = (stat.count / (maxCount || 1)) * 100;

              return (
                <div key={idx} style={styles.barItem}>
                  <div style={styles.barWrapper}>
                    <div
                      style={{
                        ...styles.bar,
                        height: `${Math.max(percentage, 10)}px`,
                      }}
                    />
                  </div>
                  <p style={styles.barLabel}>
                    {new Date(stat.date).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p style={styles.barValue}>{stat.count}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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

  header: {
    marginBottom: '30px',
  },

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6b4c8a',
    marginBottom: '15px',
  },

  dateFilterSection: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },

  dateButton: {
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

  dateButtonActive: {
    backgroundColor: 'rgba(200, 150, 255, 0.6)',
    color: '#5a3f7d',
    borderColor: 'rgba(200, 150, 255, 0.8)',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },

  summaryCard: {
    padding: '20px',
    background: 'rgba(230, 190, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(200, 150, 255, 0.4)',
    textAlign: 'center',
  },

  summaryLabel: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#b19cd9',
    fontWeight: '500',
  },

  summaryValue: {
    margin: '0 0 5px 0',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#6b4c8a',
  },

  summarySubValue: {
    margin: 0,
    fontSize: '12px',
    color: '#b19cd9',
  },

  section: {
    marginBottom: '30px',
    padding: '20px',
    background: 'rgba(230, 190, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(200, 150, 255, 0.3)',
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#6b4c8a',
    marginBottom: '20px',
  },

  emptyText: {
    textAlign: 'center',
    color: '#bbb',
    padding: '20px',
  },

  tableWrapper: {
    overflowX: 'auto',
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

  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: 'rgba(200, 150, 255, 0.4)',
    color: '#6b4c8a',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '12px',
  },

  progressWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '5px',
  },

  progressBar: {
    height: '20px',
    background: 'linear-gradient(90deg, #e6befc, #ffd6e8)',
    borderRadius: '10px',
    minWidth: '20px',
    transition: 'width 0.3s ease',
  },

  percentage: {
    fontSize: '12px',
    color: '#999',
    whiteSpace: 'nowrap',
  },

  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '15px',
  },

  chartCard: {
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(5px)',
    borderRadius: '10px',
    border: '1px solid rgba(200, 150, 255, 0.3)',
    textAlign: 'center',
  },

  chartDate: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#b19cd9',
    fontWeight: '500',
  },

  chartValue: {
    margin: '0 0 5px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#6b4c8a',
  },

  chartLabel: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
  },

  barChartContainer: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-end',
    height: '200px',
    padding: '20px 0',
    overflowX: 'auto',
  },

  barItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    flex: '0 0 auto',
    minWidth: '60px',
  },

  barWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '150px',
  },

  bar: {
    width: '40px',
    background: 'linear-gradient(180deg, #e6befc, #ffd6e8)',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(230, 190, 255, 0.4)',
  },

  barLabel: {
    margin: 0,
    fontSize: '12px',
    color: '#b19cd9',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },

  barValue: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#6b4c8a',
  },
};
