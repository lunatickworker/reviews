// frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../utils/api';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(userId, password);
      login(data.token, data.user);
    } catch (err) {
      setError(err.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>
      <div style={styles.box}>
        <div style={styles.header}>
          <h1 style={styles.title}>🗺️ Google Maps</h1>
          <h2 style={styles.subtitle}>자동화 관리 시스템</h2>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>아이디</label>
            <input
              type="text"
              placeholder="user123"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>❌ {error}</p>
            </div>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? '🔄 로그인 중...' : '✓ 로그인'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            관리자만 이 시스템에 접근할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },

  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(230, 190, 255, 0.3) 0%, rgba(255, 214, 232, 0.3) 50%, rgba(177, 156, 217, 0.2) 100%)',
    backdropFilter: 'blur(50px)',
    zIndex: -1,
  },

  box: {
    background: 'rgba(255, 245, 250, 0.7)',
    backdropFilter: 'blur(20px)',
    padding: '50px 40px',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(230, 190, 255, 0.3)',
    minWidth: '380px',
  },

  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },

  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#6b4c8a',
    margin: '0 0 8px 0',
  },

  subtitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#b19cd9',
    margin: '0',
    letterSpacing: '0.5px',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b4c8a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  input: {
    padding: '14px 16px',
    border: '1.5px solid rgba(200, 150, 255, 0.4)',
    borderRadius: '10px',
    fontSize: '14px',
    backgroundColor: 'rgba(230, 190, 255, 0.15)',
    color: '#5a3f7d',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    outline: 'none',
  },

  button: {
    padding: '14px 20px',
    backgroundColor: 'rgba(177, 156, 217, 0.5)',
    border: '1.5px solid rgba(177, 156, 217, 0.7)',
    borderRadius: '10px',
    color: '#6b4c8a',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    marginTop: '10px',
  },

  errorBox: {
    padding: '12px 16px',
    backgroundColor: 'rgba(214, 51, 132, 0.15)',
    border: '1px solid rgba(214, 51, 132, 0.4)',
    borderRadius: '8px',
    backdropFilter: 'blur(5px)',
  },

  errorText: {
    margin: '0',
    fontSize: '14px',
    color: '#d63384',
    fontWeight: '500',
  },

  footer: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(200, 150, 255, 0.2)',
    textAlign: 'center',
  },

  footerText: {
    margin: '0',
    fontSize: '12px',
    color: '#b19cd9',
    fontStyle: 'italic',
  },
};
