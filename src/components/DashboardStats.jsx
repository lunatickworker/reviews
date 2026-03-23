// frontend/src/components/DashboardStats.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi } from '../utils/api';

export default function DashboardStats() {
  const { token, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // 오늘 추가된 작업만 필터링
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.created_at);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime();
  });

  const stats = {
    total: todayTasks.length,
    completed: todayTasks.filter(t => t.review_status === 'completed').length,
    inProgress: todayTasks.filter(t => t.review_status === 'in_progress' || t.review_status === 'pending').length,
  };

  const pendingCount = stats.total - stats.completed - stats.inProgress;

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  if (loading) {
    return <div style={styles.container}><p>로딩 중...</p></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 오늘의 매장 작업 현황</h1>
        <p style={styles.date}>{new Date().toLocaleDateString('ko-KR')}</p>
      </div>

      <div style={styles.statsGrid}>
        {/* 총 매장 수 */}
        <div style={{ ...styles.statCard, borderLeft: '4px solid #3b82f6' }}>
          <div style={styles.statLabel}>오늘 작업할 총 매장</div>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.total}</div>
          <div style={styles.statDescription}>매장 주소 등록 완료</div>
        </div>

        {/* 완료된 매장 */}
        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
          <div style={styles.statLabel}>작업 완료 매장</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.completed}</div>
          <div style={styles.statDescription}>리뷰 작성 및 별점 완료</div>
        </div>

        {/* 진행중인 매장 */}
        <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }}>
          <div style={styles.statLabel}>작업 진행중 매장</div>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.inProgress}</div>
          <div style={styles.statDescription}>배포 진행 중</div>
        </div>

        {/* 대기중인 매장 */}
        <div style={{ ...styles.statCard, borderLeft: '4px solid #8b5cf6' }}>
          <div style={styles.statLabel}>작업 대기 매장</div>
          <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{pendingCount}</div>
          <div style={styles.statDescription}>배포 대기 중</div>
        </div>
      </div>

      {/* 진행률 */}
      <div style={styles.progressContainer}>
        <div style={styles.progressHeader}>
          <span>✅ 완료율</span>
          <span style={styles.progressPercent}>{completionRate}%</span>
        </div>
        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${completionRate}%`,
            }}
          />
        </div>
        <div style={styles.progressInfo}>
          {completionRate === 100 ? (
            <span style={{ color: '#10b981' }}>🎉 오늘의 모든 매장 작업이 완료되었습니다!</span>
          ) : (
            <span>{stats.total - stats.completed}개 매장 남음</span>
          )}
        </div>
      </div>

      {/* 최근 작업 리스트 */}
      <div style={styles.recentTasksContainer}>
        <h2 style={styles.recentTasksTitle}>📋 최근 작업 현황</h2>
        
        {todayTasks.length === 0 ? (
          <div style={styles.emptyState}>
            <p>오늘 등록된 매장이 없습니다.</p>
            <p style={{ fontSize: '12px', color: '#888' }}>배포 탭에서 매장을 등록해주세요.</p>
          </div>
        ) : (
          <div style={styles.taskList}>
            {todayTasks.map((task) => (
              <div key={task.id} style={styles.taskItem}>
                <div style={styles.taskInfo}>
                  <div style={styles.taskName}>{task.place_name || '로딩 중...'}</div>
                  {task.notes && <div style={styles.taskNotes}>{task.notes}</div>}
                </div>
                <div style={styles.taskStatus}>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(task.review_status),
                  }}>
                    {getStatusLabel(task.review_status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 상태에 따른 색상 반환
function getStatusColor(status) {
  const colors = {
    'completed': '#d1fae5',
    'in_progress': '#dbeafe',
    'pending': '#f3e8ff',
    'failed': '#fee2e2'
  };
  return colors[status] || '#f3f4f6';
}

// 상태에 따른 레이블 반환
function getStatusLabel(status) {
  const labels = {
    'completed': '✅ 완료',
    'in_progress': '⏳ 진행중',
    'pending': '⏹️ 대기',
    'failed': '❌ 실패'
  };
  return labels[status] || status;
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

  date: {
    fontSize: '14px',
    color: '#d1d5db',
    marginTop: '8px',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },

  statCard: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
  },

  statLabel: {
    fontSize: '14px',
    color: '#e5e7eb',
    marginBottom: '12px',
    fontWeight: '500',
  },

  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },

  statDescription: {
    fontSize: '12px',
    color: '#d1d5db',
  },

  progressContainer: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
  },

  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#e5e7eb',
  },

  progressPercent: {
    color: '#10b981',
    fontSize: '18px',
    fontWeight: 'bold',
  },

  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },

  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
    transition: 'width 0.3s ease',
  },

  progressInfo: {
    fontSize: '12px',
    color: '#e5e7eb',
    textAlign: 'center',
  },

  recentTasksContainer: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '20px',
  },

  recentTasksTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#e5e7eb',
  },

  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
  },

  taskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.1)',
  },

  taskInfo: {
    flex: 1,
  },

  taskName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#e5e7eb',
    marginBottom: '4px',
  },

  taskNotes: {
    fontSize: '12px',
    color: '#d1d5db',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  taskStatus: {
    marginLeft: '12px',
  },

  statusBadge: {
    fontSize: '12px',
    fontWeight: '500',
    padding: '6px 12px',
    borderRadius: '6px',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },

  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    color: '#d1d5db',
  },

  accessDenied: {
    padding: '32px',
    textAlign: 'center',
  },
};
