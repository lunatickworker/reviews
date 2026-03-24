// frontend/src/components/ReviewDeploy.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi, logsApi } from '../utils/api';

export default function ReviewDeploy() {
  const { token, isAdmin } = useAuth();
  const [shortUrl, setShortUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logsEndRef = useRef(null);

  // 작업 데이터 가져오기
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await mapApi.getTasks(token);
        setTasks(data || []);
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

    // 작업이 완료/실패 상태면 로그 요청 중지
    if (selectedTask.status === 'completed' || selectedTask.status === 'failed') {
      return;
    }

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
    // 3초마다 로그 새로고침 (진행중일 때만)
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [selectedTask, token]);

  // 로그 자동 스크롤
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // 선택된 작업이 완료/실패 상태가 되면 자동으로 선택 해제
  useEffect(() => {
    if (!selectedTask) return;
    
    const currentTask = tasks.find(t => t.id === selectedTask.id);
    if (currentTask && (currentTask.status === 'completed' || currentTask.status === 'failed')) {
      // 완료/실패 상태에서 10초 후 자동으로 선택 해제
      const timer = setTimeout(() => {
        setSelectedTask(null);
        setLogs([]);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedTask, tasks]);

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <p style={styles.deniedText}>🔒 이 메뉴는 관리자만 이용 가능합니다.</p>
        </div>
      </div>
    );
  }

  const handleStart = async () => {
    if (!shortUrl.trim()) {
      alert('단축 URL을 입력하세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await mapApi.automateMap(shortUrl, notes, token);
      setShortUrl('');
      setNotes('');
      
      // 작업 목록 새로고침
      const updatedTasks = await mapApi.getTasks(token);
      setTasks(updatedTasks || []);
    } catch (error) {
      alert(`❌ 오류: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredTasks = () => {
    if (filter === 'all') return tasks;
    if (filter === 'in_progress') return tasks.filter((t) => t.status === 'in_progress');
    if (filter === 'completed') return tasks.filter((t) => t.status === 'completed');
    if (filter === 'failed') return tasks.filter((t) => t.status === 'failed');
    return tasks;
  };

  const filteredTasks = getFilteredTasks();
  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  };

  const getReviewStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'in_progress': '#2196f3',
      'completed': '#4caf50',
      'failed': '#f44336'
    };
    return colors[status] || '#8b96a8';
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

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📝 리뷰 작성 현황</h2>

      {/* URL 입력 섹션 */}
      <div style={styles.inputSection}>
        <h3 style={styles.sectionSubtitle}>새 리뷰 작성 시작</h3>
        <div style={styles.inputGroup}>
          <input
            type="text"
            placeholder="단축 URL 입력 (예: https://maps.app.goo.gl/...)"
            value={shortUrl}
            onChange={(e) => setShortUrl(e.target.value)}
            style={styles.input}
            disabled={isSubmitting}
          />
          <button
            onClick={handleStart}
            disabled={isSubmitting}
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? '진행 중...' : '시작'}
          </button>
        </div>
        <textarea
          placeholder="작업 메모 (선택사항)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={styles.textarea}
          disabled={isSubmitting}
        />
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>전체</p>
          <p style={styles.statValue}>{stats.total}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>진행 중</p>
          <p style={{ ...styles.statValue, color: '#2196f3' }}>
            {stats.inProgress}
          </p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>완료</p>
          <p style={{ ...styles.statValue, color: '#4caf50' }}>
            {stats.completed}
          </p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>실패</p>
          <p style={{ ...styles.statValue, color: '#f44336' }}>
            {stats.failed}
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div style={styles.filterSection}>
        {['all', 'in_progress', 'completed', 'failed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterButton,
              ...(filter === f ? styles.filterButtonActive : {}),
            }}
          >
            {f === 'all' && '전체'}
            {f === 'in_progress' && '🔄 진행중'}
            {f === 'completed' && '✅ 완료'}
            {f === 'failed' && '❌ 실패'}
          </button>
        ))}
      </div>

      {/* 메인 콘텐츠: 작업 목록 + 로그 */}
      <div style={styles.mainContent}>
        {/* 작업 목록 */}
        <div style={styles.taskListSection}>
          <h3 style={styles.sectionTitle}>📋 작업 목록</h3>
          {filteredTasks.length === 0 ? (
            <p style={styles.emptyText}>작업이 없습니다.</p>
          ) : (
            <div style={styles.taskCardsContainer}>
              {filteredTasks.map((task) => (
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
                      <span style={styles.detailLabel}>단계:</span>
                      <span style={styles.currentStep}>
                        {task.current_step || '대기 중'}
                      </span>
                    </div>
                  </div>

                  <p style={styles.taskDate}>
                    {new Date(task.created_at).toLocaleString('ko-KR')}
                  </p>
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
            <div ref={logsEndRef} />
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

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '30px',
  },

  inputSection: {
    marginBottom: '30px',
    padding: '20px',
    background: 'rgba(37, 45, 66, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
  },

  sectionSubtitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
  },

  inputGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },

  input: {
    flex: 1,
    padding: '10px 15px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'rgba(30, 33, 57, 0.8)',
    color: '#e0e0e0',
    backdropFilter: 'blur(5px)',
  },

  textarea: {
    width: '100%',
    padding: '10px 15px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'rgba(30, 33, 57, 0.8)',
    color: '#e0e0e0',
    backdropFilter: 'blur(5px)',
    minHeight: '80px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },

  button: {
    padding: '10px 24px',
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
    border: '1px solid rgba(124, 58, 237, 0.6)',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
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
    fontSize: '15px',
    color: '#8b96a8',
    fontWeight: '500',
  },

  statValue: {
    margin: 0,
    fontSize: '35px',
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
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },

  filterButtonActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.4)',
    color: '#ffffff',
    borderColor: 'rgba(124, 58, 237, 0.6)',
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
    maxHeight: '700px',
    overflowY: 'auto',
  },

  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '15px',
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
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
  },

  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
  },

  taskDetails: {
    fontSize: '15px',
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

  taskDate: {
    margin: '10px 0 0 0',
    fontSize: '14px',
    color: '#8b96a8',
  },

  logsSection: {
    padding: '20px',
    background: 'rgba(37, 45, 66, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    minHeight: '700px',
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
    fontSize: '15px',
    color: '#8b96a8',
    flex: 1,
    marginLeft: '10px',
  },

  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#8b96a8',
    fontSize: '23px',
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
    fontSize: '15px',
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
    fontSize: '14px',
  },

  logLevel: {
    fontSize: '14px',
    fontWeight: '600',
  },

  logMessage: {
    color: '#e0e0e0',
    wordBreak: 'break-word',
  },

  accessDenied: {
    padding: '40px 20px',
    textAlign: 'center',
    background: 'rgba(218, 18, 125, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(218, 18, 125, 0.3)',
  },

  deniedText: {
    margin: '0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#ff6b9d',
  },
};
