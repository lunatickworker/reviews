import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi } from '../utils/api';

export default function TaskManagement() {
  const { token, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', order: 'desc' });

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
      // 10초마다 새로고침
      const interval = setInterval(fetchTasks, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <p>🔒 이 메뉴는 관리자만 이용 가능합니다.</p>
        </div>
      </div>
    );
  }

  // 오늘 진행이 완료되거나 실패된 작업만 필터링
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedOrFailedTasks = tasks.filter(task => {
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
                    <div style={styles.taskName}>{task.place_name || '미지정'}</div>
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
    fontSize: '40px',
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
    fontSize: '13px',
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
    fontSize: '13px',
    color: '#e5e7eb',
    verticalAlign: 'middle',
  },

  taskName: {
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '4px',
  },

  notes: {
    fontSize: '11px',
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
    fontSize: '12px',
    fontWeight: '500',
  },

  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },

  dateText: {
    fontSize: '12px',
    color: '#d1d5db',
    whiteSpace: 'nowrap',
  },

  accessDenied: {
    padding: '32px',
    textAlign: 'center',
  },
};
