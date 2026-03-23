import React, { useEffect, useState } from 'react';
import { mapApi, logsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function TaskDashboard() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  // 작업 데이터 가져오기
  useEffect(() => {
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
    
    if (token) {
      fetchTasks();
      // 10초마다 새로고침
      const interval = setInterval(fetchTasks, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // 선택된 작업의 로그 가져오기
  useEffect(() => {
    if (!selectedTask || !token) return;

    const fetchLogs = async () => {
      try {
        const taskId = `task_${selectedTask.id}`;
        const logsData = await logsApi.getByTaskId(taskId, 100, token);
        setLogs(logsData || []);
      } catch (error) {
        console.error('로그 조회 실패:', error);
      }
    };

    fetchLogs();
    // 3초마다 로그 새로고침
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [selectedTask, token]);

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

  // Google Maps로 이동
  const handleNavigateToPlace = (placeName) => {
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(placeName)}`;
    window.open(mapsUrl, '_blank');
  };

  const getReviewStatusLabel = (status) => {
    const labels = {
      'pending': '대기',
      'in_progress': '진행중',
      'completed': '완료',
      'failed': '실패'
    };
    return labels[status] || status;
  };

  const getReviewStatusColor = (status) => {
    const colors = {
      'pending': '#f57f17',
      'in_progress': '#1565c0',
      'completed': '#2e7d32',
      'failed': '#c62828'
    };
    return colors[status] || '#8b96a8';
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

      {/* 메인 콘텐츠: 작업 목록 + 로그 */}
      <div style={styles.mainContent}>
        {/* 작업 목록 */}
        <div style={styles.taskListSection}>
          <h3 style={styles.sectionTitle}>📋 작업 목록</h3>
          {tasks.length === 0 ? (
            <p style={styles.emptyText}>작업이 없습니다.</p>
          ) : (
            <div style={styles.taskCardsContainer}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    ...styles.taskCard,
                    ...(selectedTask?.id === task.id && styles.taskCardSelected),
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedTask(task)}
                >
                  <div style={styles.taskHeader}>
                    <h4 style={styles.taskTitle}>{task.place_name}</h4>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: `${getReviewStatusColor(task.status)}20`,
                      color: getReviewStatusColor(task.status)
                    }}>
                      {getReviewStatusLabel(task.status)}
                    </span>
                  </div>

                  <div style={styles.taskDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>리뷰:</span>
                      <span style={{
                        color: getReviewStatusColor(task.review_status || 'pending')
                      }}>
                        {getReviewStatusLabel(task.review_status || 'pending')}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>이미지:</span>
                      <span style={{
                        color: getReviewStatusColor(task.image_status || 'pending')
                      }}>
                        {getReviewStatusLabel(task.image_status || 'pending')}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>현재:</span>
                      <span style={styles.currentStep}>
                        {task.current_step || '대기 중'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToPlace(task.place_name);
                    }}
                    style={styles.viewMapButton}
                  >
                    🗺️ Google Maps
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 로그 뷰 */}
        {selectedTask && (
          <div style={styles.logsSection}>
            <div style={styles.logsHeader}>
              <h3 style={styles.sectionTitle}>📜 진행 로그</h3>
              <span style={styles.logsInfo}>{selectedTask.place_name}</span>
              <button
                onClick={() => setSelectedTask(null)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.logsContainer}>
              {logs.length === 0 ? (
                <p style={styles.emptyLogs}>로그가 없습니다.</p>
              ) : (
                <div style={styles.logsList}>
                  {logs.map((log, index) => (
                    <div key={index} style={styles.logEntry}>
                      <div style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleTimeString('ko-KR')}
                      </div>
                      <div style={{
                        ...styles.logLevel,
                        color: getLogLevelColor(log.log_level)
                      }}>
                        [{log.log_level}]
                      </div>
                      <div style={styles.logMessage}>{log.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getLogLevelColor(level) {
  const colors = {
    'DEBUG': '#90caf9',
    'INFO': '#81c784',
    'WARN': '#ffb74d',
    'ERROR': '#ef5350'
  };
  return colors[level] || '#8b96a8';
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },

  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    background: 'rgba(124, 58, 237, 0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
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
    color: '#8b96a8',
    fontWeight: '500',
  },

  statValue: {
    margin: '5px 0 0 0',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
  },

  progressSection: {
    marginBottom: '40px',
    padding: '20px',
    background: 'rgba(37, 45, 66, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '15px',
  },

  progressBar: {
    height: '30px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    overflow: 'hidden',
    marginBottom: '10px',
  },

  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #7c3aed, #da127d)',
    borderRadius: '15px',
    transition: 'width 0.3s ease',
  },

  progressText: {
    margin: 0,
    fontSize: '12px',
    color: '#8b96a8',
    fontWeight: '500',
  },

  mainContent: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 1fr) 1fr',
    gap: '20px',
    marginBottom: '20px',
  },

  taskListSection: {
    padding: '20px',
    background: 'rgba(37, 45, 66, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    maxHeight: '600px',
    overflowY: 'auto',
  },

  emptyText: {
    textAlign: 'center',
    color: '#8b96a8',
    padding: '40px 20px',
  },

  taskCardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  taskCard: {
    padding: '15px',
    background: 'rgba(37, 45, 66, 0.4)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },

  taskCardSelected: {
    background: 'rgba(124, 58, 237, 0.25)',
    border: '2px solid rgba(124, 58, 237, 0.6)',
    boxShadow: '0 0 12px rgba(124, 58, 237, 0.3)',
  },

  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },

  taskTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },

  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },

  taskDetails: {
    fontSize: '12px',
    margin: '10px 0',
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
    color: '#e0e0e0',
  },

  detailLabel: {
    color: '#8b96a8',
    fontWeight: '500',
  },

  currentStep: {
    color: '#90caf9',
    fontStyle: 'italic',
  },

  viewMapButton: {
    width: '100%',
    padding: '8px',
    marginTop: '10px',
    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(218, 18, 125, 0.2))',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '6px',
    color: '#7c3aed',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },

  logsSection: {
    padding: '20px',
    background: 'rgba(37, 45, 66, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
  },

  logsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
  },

  logsInfo: {
    fontSize: '12px',
    color: '#8b96a8',
    flex: 1,
    marginLeft: '10px',
  },

  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#8b96a8',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 5px',
  },

  logsContainer: {
    flex: 1,
    overflow: 'auto',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '10px',
  },

  emptyLogs: {
    textAlign: 'center',
    color: '#8b96a8',
    padding: '40px 20px',
  },

  logsList: {
    fontFamily: 'monospace',
    fontSize: '12px',
  },

  logEntry: {
    display: 'grid',
    gridTemplateColumns: '80px 60px 1fr',
    gap: '10px',
    padding: '8px',
    borderBottom: '1px solid rgba(124, 58, 237, 0.1)',
    marginBottom: '4px',
    alignItems: 'flex-start',
  },

  logTime: {
    color: '#90caf9',
    fontSize: '11px',
  },

  logLevel: {
    fontSize: '11px',
    fontWeight: '600',
  },

  logMessage: {
    color: '#e0e0e0',
    wordBreak: 'break-word',
  },
};
