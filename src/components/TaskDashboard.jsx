import React, { useEffect, useState } from 'react';
import { mapApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function TaskDashboard() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const fetchTasks = async () => {
    try {
      const data = await mapApi.getTasks(token);
      setTasks(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('작업 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList) => {
    const total = taskList.length;
    const completed = taskList.filter((t) => t.status === 'completed').length;
    const inProgress = taskList.filter((t) => t.status === 'in_progress').length;
    const pending = taskList.filter((t) => t.status === 'pending').length;

    setStats({
      total,
      completed,
      pending,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  };

  if (loading) {
    return <div style={styles.loading}>로딩 중...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 작업 관리 현황</h2>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📌</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>전체 작업</p>
            <p style={styles.statValue}>{stats.total}</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>대기 중</p>
            <p style={styles.statValue}>{stats.pending}</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔄</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>진행 중</p>
            <p style={styles.statValue}>{stats.inProgress}</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>완료</p>
            <p style={styles.statValue}>{stats.completed}</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>📈</div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>완료율</p>
            <p style={styles.statValue}>{stats.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* 진행 바 */}
      <div style={styles.progressSection}>
        <h3 style={styles.sectionTitle}>작업 진행도</h3>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${stats.completionRate}%`,
            }}
          />
        </div>
        <p style={styles.progressText}>
          {stats.completed} / {stats.total} 작업 완료
        </p>
      </div>

      {/* 작업 목록 */}
      <div style={styles.taskListSection}>
        <h3 style={styles.sectionTitle}>📋 작업 목록</h3>
        {tasks.length === 0 ? (
          <p style={styles.emptyText}>작업이 없습니다.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>작업 위치</th>
                  <th style={styles.th}>카테고리</th>
                  <th style={styles.th}>설명</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>작성자</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={index} style={styles.tr}>
                    <td style={styles.td}>{task.place_name || '-'}</td>
                    <td style={styles.td}>{task.category || '-'}</td>
                    <td style={styles.td}>{task.description || '-'}</td>
                    <td style={styles.td}>
                      <span style={getStatusStyle(task.status)}>
                        {getStatusLabel(task.status)}
                      </span>
                    </td>
                    <td style={styles.td}>{task.creator_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: '대기 중',
    in_progress: '진행 중',
    completed: '완료',
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
    in_progress: {
      padding: '4px 10px',
      borderRadius: '4px',
      backgroundColor: 'rgba(33, 150, 243, 0.2)',
      color: '#1565c0',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },

  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    background: 'rgba(230, 190, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(200, 150, 255, 0.4)',
    transition: 'all 0.3s ease',
  },

  statIcon: {
    fontSize: '32px',
  },

  statContent: {
    flex: 1,
  },

  statLabel: {
    margin: 0,
    fontSize: '12px',
    color: '#b19cd9',
    fontWeight: '500',
  },

  statValue: {
    margin: '5px 0 0 0',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#6b4c8a',
  },

  progressSection: {
    marginBottom: '40px',
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
    marginBottom: '15px',
  },

  progressBar: {
    height: '30px',
    backgroundColor: 'rgba(200, 200, 200, 0.2)',
    borderRadius: '15px',
    overflow: 'hidden',
    marginBottom: '10px',
  },

  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #e6befc, #ffd6e8)',
    borderRadius: '15px',
    transition: 'width 0.3s ease',
  },

  progressText: {
    margin: 0,
    fontSize: '12px',
    color: '#b19cd9',
    fontWeight: '500',
  },

  taskListSection: {
    padding: '20px',
    background: 'rgba(230, 190, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(200, 150, 255, 0.3)',
  },

  emptyText: {
    textAlign: 'center',
    color: '#bbb',
    padding: '40px 20px',
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
};
