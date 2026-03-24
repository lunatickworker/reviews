// frontend/src/components/UserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, authApi } from '../utils/api';

export default function UserManagement() {
  const { token, user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('agency');
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userApi.getAll(token);
      setUsers(data);
    } catch (err) {
      setError('사용자 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [token]);

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

  const handleOpenPasswordModal = (userId, userName) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setPasswordInput('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!passwordInput) {
      alert('새 비밀번호를 입력하세요.');
      return;
    }

    if (passwordInput.length < 4) {
      alert('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    try {
      await userApi.updatePassword(selectedUserId, passwordInput, token);
      alert('비밀번호가 변경되었습니다.');
      setShowPasswordModal(false);
      setPasswordInput('');
      setSelectedUserId(null);
      loadUsers();
    } catch (err) {
      setError('비밀번호 변경 실패');
    }
  };

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>👥 팀원 관리</h2>
        {error && <p style={styles.error}>{error}</p>}

        <button onClick={() => setShowForm(!showForm)} style={styles.createButton}>
          {showForm ? '✕ 취소' : '➕ 새 팀원 추가'}
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
              </select>
            </div>
            <button type="submit" style={styles.submitButton}>
              추가
            </button>
          </form>
        )}

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={{ ...styles.th, width: '22%' }}>아이디</th>
                <th style={{ ...styles.th, width: '18%' }}>권한</th>
                <th style={{ ...styles.th, width: '17%' }}>상위명</th>
                <th style={{ ...styles.th, width: '18%' }}>생성일</th>
                <th style={{ ...styles.th, width: '25%' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={styles.loadingCell}>로딩 중...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.emptyCellBG}>등록된 팀원이 없습니다.</td>
                </tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id} style={{
                    ...styles.tr,
                    backgroundColor: idx % 2 === 0 ? 'rgba(230, 190, 255, 0.08)' : 'rgba(255, 192, 203, 0.08)',
                  }}>
                    <td style={{ ...styles.td, width: '22%' }}>{user.user_id}</td>
                    <td style={{ ...styles.td, width: '18%' }}>
                      <span style={styles.roleText}>{user.role === 'admin' ? '관리자' : '에이전시'}</span>
                    </td>
                    <td style={{ ...styles.td, width: '17%' }}>{user.superior_name || '-'}</td>
                    <td style={{ ...styles.td, width: '18%' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={{ ...styles.td, width: '25%' }}>
                      <button
                        onClick={() => handleOpenPasswordModal(user.id, user.user_id)}
                        style={styles.passwordButton}
                      >
                        🔐 비밀번호
                      </button>
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

        {showPasswordModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>🔐 비밀번호 변경</h3>
              <p style={styles.modalSubtitle}>사용자: <strong>{selectedUserName}</strong></p>
              
              <div style={styles.modalFormGroup}>
                <label style={styles.modalLabel}>새 비밀번호</label>
                <input
                  type="password"
                  placeholder="새 비밀번호 입력"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChangePassword()}
                  style={styles.modalInput}
                  autoFocus
                />
              </div>

              <div style={styles.modalButtonGroup}>
                <button
                  onClick={handleChangePassword}
                  style={styles.modalConfirmButton}
                >
                  변경
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setSelectedUserId(null);
                  }}
                  style={styles.modalCancelButton}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 {isAdmin ? '전체 계정 관리' : '팀원 관리'}</h2>
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
              {isAdmin && <option value="admin">관리자</option>}
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
              <th style={{ ...styles.th, width: '22%' }}>아이디</th>
              <th style={{ ...styles.th, width: '18%' }}>권한</th>
              <th style={{ ...styles.th, width: '17%' }}>상위명</th>
              <th style={{ ...styles.th, width: '18%' }}>생성일</th>
              <th style={{ ...styles.th, width: '25%' }}>관리</th>
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
                  <td style={{ ...styles.td, width: '22%' }}>{user.user_id}</td>
                  <td style={{ ...styles.td, width: '18%' }}>
                    <span style={styles.roleText}>{user.role === 'admin' ? '관리자' : '에이전시'}</span>
                  </td>
                  <td style={{ ...styles.td, width: '17%' }}>{user.superior_name || '-'}</td>
                  <td style={{ ...styles.td, width: '18%' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ ...styles.td, width: '25%' }}>
                    <button
                      onClick={() => handleOpenPasswordModal(user.id, user.user_id)}
                      style={styles.passwordButton}
                    >
                      🔐 비밀번호
                    </button>
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

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>🔐 비밀번호 변경</h3>
            <p style={styles.modalSubtitle}>사용자: <strong>{selectedUserName}</strong></p>
            
            <div style={styles.modalFormGroup}>
              <label style={styles.modalLabel}>새 비밀번호</label>
              <input
                type="password"
                placeholder="새 비밀번호 입력"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChangePassword()}
                style={styles.modalInput}
                autoFocus
              />
            </div>

            <div style={styles.modalButtonGroup}>
              <button
                onClick={handleChangePassword}
                style={styles.modalConfirmButton}
              >
                변경
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setSelectedUserId(null);
                }}
                style={styles.modalCancelButton}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
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
    fontSize: '18px',
    marginBottom: '15px',
  },

  createButton: {
    padding: '12px 20px',
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
    border: '1px solid rgba(124, 58, 237, 0.6)',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '18px',
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
    fontSize: '15px',
    fontWeight: '600',
    color: '#e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  input: {
    padding: '10px 12px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    fontSize: '16px',
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
    fontSize: '16px',
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
    fontSize: '16px',
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
    fontSize: '15px',
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

  roleText: {
    padding: '6px 8px',
    borderRadius: '4px',
    fontSize: '15px',
    color: '#9ca3af',
    display: 'inline-block',
  },

  deleteButton: {
    padding: '6px 10px',
    backgroundColor: 'rgba(218, 18, 125, 0.2)',
    border: '1px solid rgba(218, 18, 125, 0.4)',
    borderRadius: '4px',
    color: '#ff6b9d',
    cursor: 'pointer',
    fontSize: '15px',
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
    fontSize: '20px',
    fontWeight: '600',
    color: '#ff6b9d',
  },

  passwordButton: {
    padding: '6px 10px',
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    border: '1px solid rgba(33, 150, 243, 0.4)',
    borderRadius: '4px',
    color: '#64b5f6',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(3px)',
    marginRight: '8px',
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)',
  },

  modal: {
    background: 'rgba(37, 45, 66, 0.95)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '12px',
    padding: '30px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(10px)',
  },

  modalTitle: {
    margin: '0 0 10px 0',
    fontSize: '25px',
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },

  modalSubtitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    color: '#a0aec0',
    textAlign: 'center',
  },

  modalFormGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '25px',
  },

  modalLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  modalInput: {
    padding: '12px 15px',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    fontSize: '18px',
    backgroundColor: 'rgba(30, 33, 57, 0.9)',
    color: '#e0e0e0',
    backdropFilter: 'blur(5px)',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },

  modalButtonGroup: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },

  modalConfirmButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'rgba(124, 58, 237, 0.4)',
    border: '1px solid rgba(124, 58, 237, 0.6)',
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
  },

  modalCancelButton: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    border: '1px solid rgba(158, 158, 158, 0.4)',
    borderRadius: '6px',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
  },
};
