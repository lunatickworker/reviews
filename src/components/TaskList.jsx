// frontend/src/components/TaskList.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../utils/api';

export default function TaskList() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskApi.getAll(token);
      setTasks(data);
    } catch (err) {
      setError('작업 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await taskApi.update(taskId, updates, token);
      loadTasks();
      alert('작업이 업데이트되었습니다.');
    } catch (err) {
      setError('작업 업데이트 실패');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await taskApi.delete(taskId, token);
      loadTasks();
      alert('작업이 삭제되었습니다.');
    } catch (err) {
      setError('작업 삭제 실패');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📋 작업 리스트 관리</h2>
      {error && <p style={styles.error}>{error}</p>}

      {loading ? (
        <p style={{ textAlign: 'center', color: '#b19cd9' }}>로딩 중...</p>
      ) : tasks.length === 0 ? (
        <div style={styles.emptyState}>
          <p>작업이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr style={styles.headerRow}>
                <th style={{ ...styles.th, width: '20%' }}>매장명</th>
                <th style={{ ...styles.th, width: '10%' }}>별점</th>
                <th style={{ ...styles.th, width: '12%' }}>이미지</th>
                <th style={{ ...styles.th, width: '12%' }}>상태</th>
                <th style={{ ...styles.th, width: '15%' }}>작업자</th>
                <th style={{ ...styles.th, width: '15%' }}>생성일</th>
                <th style={{ ...styles.th, width: '10%' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => (
                <tr key={task.id} style={{...styles.bodyRow, backgroundColor: index % 2 === 0 ? 'rgba(230, 190, 255, 0.1)' : 'rgba(255, 192, 203, 0.1)'}}>
                  <td style={{ ...styles.td, width: '20%' }}>{task.place_name}</td>
                  <td style={{ ...styles.td, width: '10%' }}>
                    <select
                      value={task.stars || 0}
                      onChange={(e) =>
                        handleUpdateTask(task.id, { stars: parseInt(e.target.value) })
                      }
                      style={styles.select}
                    >
                      <option value="0">0 ⭐</option>
                      <option value="1">1 ⭐</option>
                      <option value="2">2 ⭐</option>
                      <option value="3">3 ⭐</option>
                      <option value="4">4 ⭐</option>
                      <option value="5">5 ⭐</option>
                    </select>
                  </td>
                  <td style={{ ...styles.td, width: '12%' }}>
                    <input
                      type="checkbox"
                      checked={task.image_uploaded || false}
                      onChange={(e) =>
                        handleUpdateTask(task.id, { image_uploaded: e.target.checked })
                      }
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={{ ...styles.td, width: '12%' }}>
                    <select
                      value={task.status || 'pending'}
                      onChange={(e) =>
                        handleUpdateTask(task.id, { status: e.target.value })
                      }
                      style={styles.select}
                    >
                      <option value="pending">대기중</option>
                      <option value="in_progress">진행중</option>
                      <option value="completed">완료</option>
                    </select>
                  </td>
                  <td style={{ ...styles.td, width: '15%' }}>{task.user_id}</td>
                  <td style={{ ...styles.td, width: '15%' }}>{new Date(task.created_at).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, width: '10%' }}>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      style={styles.deleteButton}
                    >
                      삭제
                    </button>
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
    background: 'rgba(255, 240, 245, 0.4)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '25px',
    border: '1px solid rgba(219, 112, 147, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },

  title: {
    margin: '0 0 20px 0',
    color: '#6b4c8a',
    fontSize: '22px',
    fontWeight: '600',
  },

  error: {
    color: '#d63384',
    marginBottom: '15px',
    padding: '10px 12px',
    background: 'rgba(214, 51, 132, 0.1)',
    borderRadius: '6px',
    fontSize: '13px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#b19cd9',
    fontSize: '16px',
  },

  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '8px',
    overflow: 'hidden',
    backdropFilter: 'blur(5px)',
  },

  thead: {
    background: 'rgba(200, 150, 255, 0.3)',
  },

  headerRow: {
    borderBottom: '2px solid rgba(219, 112, 147, 0.3)',
  },

  th: {
    padding: '15px 12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#6b4c8a',
    fontSize: '13px',
    borderRight: '1px solid rgba(219, 112, 147, 0.2)',
    whiteSpace: 'nowrap',
  },

  bodyRow: {
    borderBottom: '1px solid rgba(219, 112, 147, 0.2)',
    transition: 'background-color 0.2s ease',
  },

  td: {
    padding: '14px 12px',
    fontSize: '13px',
    color: '#5a3f7d',
    borderRight: '1px solid rgba(219, 112, 147, 0.1)',
  },

  select: {
    padding: '6px 8px',
    border: '1px solid rgba(200, 150, 255, 0.4)',
    borderRadius: '6px',
    backgroundColor: 'rgba(230, 190, 255, 0.3)',
    color: '#6b4c8a',
    fontSize: '12px',
    cursor: 'pointer',
    width: '100%',
  },

  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: '#b19cd9',
  },

  deleteButton: {
    padding: '6px 12px',
    backgroundColor: 'rgba(214, 51, 132, 0.3)',
    color: '#d63384',
    border: '1px solid rgba(214, 51, 132, 0.5)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
};
