import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi, logsApi } from '../utils/api';

export default function ReviewAnalytics() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, review, image
  const [dateRange, setDateRange] = useState('today'); // today, week, month

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await mapApi.getTasks(token);
        setTasks(data || []);
      } catch (error) {
        console.error('작업 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // 날짜 범위에 따라 필터링
  const getFilteredTasks = () => {
    let filtered = tasks;

    // 날짜 범위 필터
    const now = new Date();
    const taskDate = new Date(selectedDate);

    if (dateRange === 'today') {
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate.toLocaleDateString() === now.toLocaleDateString();
      });
    } else if (dateRange === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate >= sevenDaysAgo && tDate <= now;
      });
    } else if (dateRange === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate >= thirtyDaysAgo && tDate <= now;
      });
    } else if (dateRange === 'custom' && selectedDate) {
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate.toLocaleDateString() === taskDate.toLocaleDateString();
      });
    }

    // 타입 필터 (리뷰/이미지)
    if (filterType === 'review') {
      filtered = filtered.filter(task => task.review_status && task.review_status !== 'pending');
    } else if (filterType === 'image') {
      filtered = filtered.filter(task => task.image_status && task.image_status !== 'pending');
    }

    // 검색 필터 (매장이름)
    if (searchText.trim()) {
      filtered = filtered.filter(task =>
        task.place_name && task.place_name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  // 작업계정 추출
  const getWorkAccount = (task) => {
    if (task.users && task.users.user_id) {
      return task.users.user_id.split('@')[0];
    }
    return '미지정';
  };

  // 로그 조회
  const handleViewLogs = async (task) => {
    setLogLoading(true);
    try {
      const logData = await logsApi.getByTaskId(task.task_id, 100, token);
      setLogs(logData || []);
      setShowLogModal(true);
    } catch (error) {
      console.error('로그 조회 실패:', error);
      setLogs([]);
      setShowLogModal(true);
    } finally {
      setLogLoading(false);
    }
  };

  // 통계 계산
  const statistics = {
    total: filteredTasks.length,
    completedReview: filteredTasks.filter(t => t.review_status === 'completed').length,
    failedReview: filteredTasks.filter(t => t.review_status === 'failed').length,
    completedImage: filteredTasks.filter(t => t.image_status === 'completed').length,
    failedImage: filteredTasks.filter(t => t.image_status === 'failed').length,
  };

  const reviewSuccessRate = statistics.total > 0
    ? Math.round((statistics.completedReview / statistics.total) * 100)
    : 0;

  const imageSuccessRate = statistics.total > 0
    ? Math.round((statistics.completedImage / statistics.total) * 100)
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 리뷰작성현황</h1>
        <p style={styles.subtitle}>리뷰 및 이미지 리뷰 작업 통계 및 분석</p>
      </div>

      {/* 필터 섹션 */}
      <div style={styles.filterSection}>
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>기간</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={styles.select}
            >
              <option value="today">오늘</option>
              <option value="week">최근 7일</option>
              <option value="month">최근 30일</option>
              <option value="custom">특정 날짜</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div style={styles.filterGroup}>
              <label style={styles.label}>날짜</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          )}

          <div style={styles.filterGroup}>
            <label style={styles.label}>작업유형</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.select}
            >
              <option value="all">전체</option>
              <option value="review">리뷰 작성</option>
              <option value="image">이미지 리뷰</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>매장명 검색</label>
            <input
              type="text"
              placeholder="매장이름 입력..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <button
            onClick={() => {
              setSearchText('');
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setDateRange('today');
              setFilterType('all');
            }}
            style={styles.resetButton}
          >
            초기화
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #3b82f6' }}>
          <div style={styles.statLabel}>총 작업</div>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{statistics.total}</div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
          <div style={styles.statLabel}>리뷰 완료</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{statistics.completedReview}</div>
          <div style={styles.statDescription}>{reviewSuccessRate}% 성공</div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #ef4444' }}>
          <div style={styles.statLabel}>리뷰 실패</div>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{statistics.failedReview}</div>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
          <div style={styles.statLabel}>이미지 완료</div>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{statistics.completedImage}</div>
          <div style={styles.statDescription}>{imageSuccessRate}% 성공</div>
        </div>
      </div>

      {/* 리스트 섹션 */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px' }}>
          로딩 중...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={styles.emptyState}>
          <p>해당하는 작업이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>매장명</th>
                <th style={styles.th}>작업계정</th>
                <th style={styles.th}>리뷰</th>
                <th style={styles.th}>이미지</th>
                <th style={styles.th}>생성일</th>
                <th style={styles.th}>로그</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div style={styles.taskName}>{task.place_name || '미지정'}</div>
                    {task.notes && <div style={styles.notes}>{task.notes}</div>}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.accountBadge}>{getWorkAccount(task)}</span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: task.review_status === 'completed' ? '#10b981' :
                          task.review_status === 'failed' ? '#ef4444' : '#8b5cf6',
                      }}
                    >
                      {task.review_status === 'completed' ? '✅ 완료' :
                        task.review_status === 'failed' ? '❌ 실패' : '⏹️ 대기'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: task.image_status === 'completed' ? '#10b981' :
                          task.image_status === 'failed' ? '#ef4444' : '#8b5cf6',
                      }}
                    >
                      {task.image_status === 'completed' ? '✅ 완료' :
                        task.image_status === 'failed' ? '❌ 실패' : '⏹️ 대기'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.dateText}>
                      {new Date(task.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleViewLogs(task)}
                      style={styles.logButton}
                    >
                      📋 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 로그 모달 */}
      {showLogModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLogModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>📋 작업 로그</h2>
              <button
                onClick={() => setShowLogModal(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              {logLoading ? (
                <div style={{ textAlign: 'center', color: '#d1d5db', padding: '20px' }}>
                  로딩 중...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#d1d5db', padding: '20px' }}>
                  로그가 없습니다.
                </div>
              ) : (
                <div style={styles.logList}>
                  {logs.map((log, index) => (
                    <div key={index} style={styles.logItem}>
                      <div style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                      </div>
                      <div
                        style={{
                          ...styles.logMessage,
                          color: log.log_level === 'ERROR' ? '#ef4444' :
                            log.log_level === 'WARN' ? '#f59e0b' :
                            log.log_level === 'INFO' ? '#3b82f6' : '#8b96a8',
                        }}
                      >
                        [{log.log_level}] {log.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(15, 20, 25, 0.9) 0%, rgba(20, 30, 48, 0.8) 100%)',
    borderRadius: '12px',
    minHeight: '100vh',
  },

  header: {
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
    letterSpacing: '-0.5px',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },

  subtitle: {
    fontSize: '14px',
    color: '#d1d5db',
    margin: '0',
  },

  filterSection: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },

  filterRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  label: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e5e7eb',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  select: {
    padding: '8px 12px',
    background: 'rgba(40, 50, 70, 0.9)',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  searchInput: {
    padding: '8px 12px',
    background: 'rgba(40, 50, 70, 0.9)',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '16px',
    minWidth: '200px',
    transition: 'all 0.2s ease',
  },

  dateInput: {
    padding: '8px 12px',
    background: 'rgba(40, 50, 70, 0.9)',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },

  resetButton: {
    padding: '8px 16px',
    background: 'rgba(107, 114, 128, 0.2)',
    border: '1px solid rgba(107, 114, 128, 0.3)',
    borderRadius: '6px',
    color: '#d1d5db',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '15px',
    transition: 'all 0.2s ease',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },

  statCard: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '20px',
  },

  statLabel: {
    fontSize: '18px',
    color: '#e5e7eb',
    marginBottom: '12px',
    fontWeight: '500',
  },

  statValue: {
    fontSize: '45px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },

  statDescription: {
    fontSize: '15px',
    color: '#d1d5db',
  },

  tableWrapper: {
    overflowX: 'auto',
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '12px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px',
  },

  tableHeader: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
  },

  th: {
    padding: '16px 12px',
    textAlign: 'left',
    fontSize: '16px',
    fontWeight: '600',
    color: '#e5e7eb',
    whiteSpace: 'nowrap',
  },

  tableRow: {
    borderBottom: '1px solid rgba(124, 58, 237, 0.1)',
    transition: 'background-color 0.2s ease',
  },

  td: {
    padding: '14px 12px',
    fontSize: '16px',
    color: '#e5e7eb',
    verticalAlign: 'middle',
  },

  taskName: {
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '4px',
  },

  notes: {
    fontSize: '14px',
    color: '#d1d5db',
    marginTop: '4px',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  accountBadge: {
    display: 'inline-block',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '15px',
    fontWeight: '500',
  },

  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },

  dateText: {
    fontSize: '15px',
    color: '#d1d5db',
    whiteSpace: 'nowrap',
  },

  logButton: {
    padding: '6px 12px',
    background: 'rgba(124, 58, 237, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    color: '#a78bfa',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },

  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
    color: '#d1d5db',
  },

  accessDenied: {
    padding: '32px',
    textAlign: 'center',
  },

  // 모달 스타일
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  modal: {
    background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(26, 31, 46, 0.8) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
  },

  modalTitle: {
    fontSize: '23px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },

  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#d1d5db',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },

  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  logItem: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.1)',
    borderRadius: '6px',
    padding: '12px',
  },

  logTime: {
    fontSize: '14px',
    color: '#8b96a8',
    marginBottom: '4px',
    fontWeight: '500',
  },

  logMessage: {
    fontSize: '15px',
    lineHeight: '1.4',
    fontFamily: 'monospace',
  },
};
