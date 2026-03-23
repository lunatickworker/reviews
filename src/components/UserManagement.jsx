// frontend/src/components/UserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, authApi } from '../utils/api';

export default function UserManagement() {
  const { token, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('agency');
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await userApi.getAll(token);
      setUsers(data);
    } catch (err) {
      setError('사용자 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);



  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserId || !newPassword) {
      alert('아이디와 비밀번호를 입력하세요.');
      return;
    }

    try {
      await authApi.register(newUserId, newPassword, newRole, token);
      alert('사용자가 생성되었습니다.');
      setNewUserId('');
      setNewPassword('');
      setNewRole('agency');
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await userApi.updateRole(userId, newRole, token);
      loadUsers();
      alert('권한이 업데이트되었습니다.');
    } catch (err) {
      setError('권한 업데이트 실패');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await userApi.delete(userId, token);
      loadUsers();
      alert('사용자가 삭제되었습니다.');
    } catch (err) {
      setError('사용자 삭제 실패');
    }
  };

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <p style={styles.deniedText}>🔒 이 메뉴는 관리자만 이용 가능합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 계정 관리</h2>
      {error && <p style={styles.error}>{error}</p>}

      <button onClick={() => setShowForm(!showForm)} style={styles.createButton}>
        {showForm ? '✕ 취소' : '➕ 새 계정 생성'}
      </button>

      {showForm && (
        <form onSubmit={handleCreateUser} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>아이디</label>
            <input
              type="text"
              placeholder="user123"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>권한</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={styles.input}>
              <option value="agency">에이전시</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <button type="submit" style={styles.submitButton}>
            생성
          </button>
        </form>
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ ...styles.th, width: '25%' }}>아이디</th>
              <th style={{ ...styles.th, width: '20%' }}>권한</th>
              <th style={{ ...styles.th, width: '20%' }}>상위명</th>
              <th style={{ ...styles.th, width: '20%' }}>생성일</th>
              <th style={{ ...styles.th, width: '15%' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={styles.loadingCell}>로딩 중...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="5" style={styles.emptyCellBG}>등록된 계정이 없습니다.</td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr key={user.id} style={{
                  ...styles.tr,
                  backgroundColor: idx % 2 === 0 ? 'rgba(230, 190, 255, 0.08)' : 'rgba(255, 192, 203, 0.08)',
                }}>
                  <td style={{ ...styles.td, width: '25%' }}>{user.user_id}</td>
                  <td style={{ ...styles.td, width: '20%' }}>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      style={styles.roleSelect}
                    >
                      <option value="agency">에이전시</option>
                      <option value="admin">관리자</option>
                    </select>
                  </td>
                  <td style={{ ...styles.td, width: '20%' }}>{user.superior_name || '-'}</td>
                  <td style={{ ...styles.td, width: '20%' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, width: '15%' }}>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      style={styles.deleteButton}
                    >
                      🗑️ 삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(37, 45, 66, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '30px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },

  title: {
    margin: '0 0 20px 0',
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
  },

  error: {
    padding: '12px 15px',
    backgroundColor: 'rgba(218, 18, 125, 0.15)',
    border: '1px solid rgba(218, 18, 125, 0.3)',
    borderRadius: '8px',
    color: '#ff6b9d',
    fontSize: '14px',
    marginBottom: '15px',
  },

  createButton: {
    padding: '12px 20px',
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
    border: '1px solid rgba(124, 58, 237, 0.6)',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '20px',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
  },

  form: {
    display: 'flex',
    gap: '15px',
    marginBottom: '25px',
    padding: '20px',
    background: 'rgba(124, 58, 237, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    backdropFilter: 'blur(5px)',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flex: '1 1 150px',
  },

  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  input: {
    padding: '10px 12px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: 'rgba(30, 33, 57, 0.8)',
    color: '#e0e0e0',
    backdropFilter: 'blur(5px)',
  },

  submitButton: {
    padding: '10px 20px',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    border: '1px solid rgba(76, 175, 80, 0.5)',
    borderRadius: '6px',
    color: '#76ff03',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
  },

  tableWrapper: {
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    overflow: 'hidden',
    background: 'rgba(37, 45, 66, 0.5)',
    backdropFilter: 'blur(5px)',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },

  headerRow: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
  },

  th: {
    padding: '12px 15px',
    textAlign: 'left',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  tr: {
    borderBottom: '1px solid rgba(124, 58, 237, 0.15)',
    transition: 'background-color 0.2s ease',
  },

  td: {
    padding: '12px 15px',
    color: '#e0e0e0',
  },

  loadingCell: {
    padding: '20px',
    textAlign: 'center',
    color: '#8b96a8',
    fontStyle: 'italic',
  },

  emptyCellBG: {
    padding: '20px',
    textAlign: 'center',
    color: '#8b96a8',
    fontStyle: 'italic',
  },

  roleSelect: {
    padding: '6px 8px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: 'rgba(30, 33, 57, 0.8)',
    color: '#e0e0e0',
    cursor: 'pointer',
  },

  deleteButton: {
    padding: '6px 10px',
    backgroundColor: 'rgba(218, 18, 125, 0.2)',
    border: '1px solid rgba(218, 18, 125, 0.4)',
    borderRadius: '4px',
    color: '#ff6b9d',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(3px)',
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
    fontSize: '16px',
    fontWeight: '600',
    color: '#ff6b9d',
  },
};
