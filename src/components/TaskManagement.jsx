import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi, storeApi, taskApi } from '../utils/api';

export default function TaskManagement() {
  const { token, isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', order: 'desc' });
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ placeName: '', stars: 0, storeId: null });

  // 매장 조회 및 작업 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        // agency 사용자는 자신의 매장만 조회
        if (!isAdmin) {
          const storeData = await storeApi.getAll(token);
          setStores(storeData || []);
          if (storeData && storeData.length > 0) {
            setSelectedStore(storeData[0].id);
          }
        } else {
          // admin은 모든 데이터 조회 가능
          const storeData = await storeApi.getAll(token);
          setStores(storeData || []);
        }

        const taskData = await mapApi.getTasks(token);
        setTasks(taskData || []);
      } catch (error) {
        console.error('데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
      // 10초마다 새로고침
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [token, isAdmin]);

  // 조직격리: 에이전시 사용자는 자신의 매장 작업만 필터링
  let displayTasks = tasks;
  if (!isAdmin && selectedStore) {
    displayTasks = tasks.filter(task => task.store_id === selectedStore);
  }

  // 오늘 진행이 완료되거나 실패된 작업만 필터링
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedOrFailedTasks = displayTasks.filter(task => {
    const taskDate = new Date(task.created_at);
    taskDate.setHours(0, 0, 0, 0);
    return (
      taskDate.getTime() === today.getTime() &&
      (task.review_status === 'completed' || task.review_status === 'failed')
    );
  });

  // 정렬
  const sortedTasks = [...completedOrFailedTasks].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig({
      key,
      order: sortConfig.key === key && sortConfig.order === 'asc' ? 'desc' : 'asc',
    });
  };

  // 작업 계정 추출 (이메일의 @ 앞부분)
  const getWorkAccount = (task) => {
    if (task.users && task.users.user_id) {
      return task.users.user_id.split('@')[0];
    }
    return '미지정';
  };

  // 별점 상태 매핑
  const getReviewStatus = (status) => {
    if (status === 'completed') return '완료';
    if (status === 'failed') return '실패';
    return '대기';
  };

  // 상태 매핑
  const getStatusLabel = (status) => {
    const labels = {
      'completed': '완료',
      'in_progress': '진행중',
      'pending': '대기',
      'failed': '오류',
    };
    return labels[status] || status;
  };

  // 이미지 상태 매핑
  const getImageStatus = (status) => {
    if (status === 'completed') return '완료';
    if (status === 'failed') return '실패';
    return '대기';
  };

  // 생성일 포맷 (시간까지 표시)
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // 매장 웹사이트 URL 가져오기
  const getStoreWebsiteAdmin = (storeId) => {
    const store = stores.find(s => s.id === storeId);
    return store?.address || null;
  };

  // 매장 클릭 핸들러
  const handleStoreClickAdmin = (storeId) => {
    const website = getStoreWebsiteAdmin(storeId);
    if (website) {
      window.open(website, '_blank', 'noopener,noreferrer');
    }
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    const colors = {
      '완료': '#10b981',
      '진행중': '#f59e0b',
      '오류': '#ef4444',
      '대기': '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📋 작업 관리</h1>
        </div>
        <p style={{ textAlign: 'center', color: '#d1d5db' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📋 작업 관리</h1>
        <p style={styles.subtitle}>
          완료 및 실패된 작업 ({sortedTasks.length}개)
        </p>
      </div>

      {sortedTasks.length === 0 ? (
        <div style={styles.emptyState}>
          <p>오늘 완료되거나 실패된 작업이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('place_name')}>
                  매장명 {sortConfig.key === 'place_name' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                </th>
                <th style={styles.th}>작업계정</th>
                <th style={styles.th}>리뷰</th>
                <th style={styles.th}>상태</th>
                <th style={styles.th}>이미지</th>
                <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => handleSort('created_at')}>
                  생성일 {sortConfig.key === 'created_at' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <tr key={task.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <div
                      style={{
                        ...styles.taskName,
                        cursor: getStoreWebsiteAdmin(task.store_id) ? 'pointer' : 'default',
                        color: getStoreWebsiteAdmin(task.store_id) ? '#60a5fa' : styles.taskName.color,
                        textDecoration: getStoreWebsiteAdmin(task.store_id) ? 'underline' : 'none',
                        transition: 'color 0.2s ease',
                      }}
                      onClick={() => handleStoreClickAdmin(task.store_id)}
                      onMouseEnter={(e) => {
                        if (getStoreWebsiteAdmin(task.store_id)) {
                          e.currentTarget.style.color = '#93c5fd';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (getStoreWebsiteAdmin(task.store_id)) {
                          e.currentTarget.style.color = '#60a5fa';
                        }
                      }}
                    >
                      {task.place_name || '미지정'}
                    </div>
                    {task.notes && <div style={styles.notes}>{task.notes}</div>}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.accountBadge}>{getWorkAccount(task)}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge}>
                      {getReviewStatus(task.review_status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(getStatusLabel(task.status)),
                      }}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge}>
                      {getImageStatus(task.image_status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.dateText}>{formatDateTime(task.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    fontSize: '15px',
    color: '#d1d5db',
    margin: '0',
  },

  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
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

  accessDenied: {
    padding: '32px',
    textAlign: 'center',
  },

  storeSelector: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(124, 58, 237, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
  },

  label: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e0e0e0',
    whiteSpace: 'nowrap',
  },

  storeSelect: {
    padding: '8px 12px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    fontSize: '16px',
    backgroundColor: 'rgba(30, 33, 57, 0.8)',
    color: '#e0e0e0',
    cursor: 'pointer',
    flex: 1,
    maxWidth: '300px',
  },

  loadingCell: {
    padding: '20px',
    textAlign: 'center',
    color: '#8b96a8',
  },

  emptyCell: {
    padding: '20px',
    textAlign: 'center',
    color: '#8b96a8',
  },
};
