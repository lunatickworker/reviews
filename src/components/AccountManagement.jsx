import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { accountApi } from '../utils/api';
import { PageLayout, Alert, PageCard, Loading } from './common';
import { FiPlus, FiTrash2, FiMail, FiCalendar } from 'react-icons/fi';

/**
 * 구글 계정 관리 페이지 (Admin/Agency만)
 */
export default function AccountManagement() {
  const { token, isAdmin, isAgency } = useAuth();
  const { showSuccess, showError } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await accountApi.getAll(token);
      setAccounts(data || []);
    } catch (err) {
      showError('계정 목록을 불러올 수 없습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, showError]);

  useEffect(() => {
    if (isAdmin) {
      fetchAccounts();
    }
  }, [isAdmin, fetchAccounts]);

  const addAccount = async () => {
    if (!newEmail.trim()) {
      showError('이메일을 입력하세요.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setAdding(true);
    try {
      const result = await accountApi.add(newEmail, token);
      setAccounts([result, ...accounts]);
      setNewEmail('');
      showSuccess(`✅ ${result.email} 계정이 추가되었습니다.`);
    } catch (err) {
      showError(`❌ ${err.message || '계정 추가에 실패했습니다.'}`);
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const deleteAccount = async (id, email) => {
    if (!window.confirm(`${email}을(를) 정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await accountApi.delete(id, token);
      setAccounts(accounts.filter(a => a.id !== id));
      showSuccess(`✅ ${email} 계정이 삭제되었습니다.`);
    } catch (err) {
      showError(`❌ ${err.message || '계정 삭제에 실패했습니다.'}`);
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <PageLayout title="구글 계정 관리" icon="🔐">
        <PageCard>
          <Alert type="error" message="관리자 권한이 필요합니다." />
        </PageCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="구글 계정 관리" icon="🔐">
      {/* 계정 추가 섹션 */}
      <PageCard>
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '15px',
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <FiPlus /> 새 계정 추가하기
          </h3>

          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !adding && addAccount()}
              disabled={adding}
              style={{
                flex: 1,
                minWidth: '250px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <button
              onClick={addAccount}
              disabled={adding || !newEmail.trim()}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: adding || !newEmail.trim() ? '#ccc' : '#2563eb',
                color: 'white',
                cursor: adding || !newEmail.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!adding && newEmail.trim()) {
                  e.target.style.background = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                if (!adding && newEmail.trim()) {
                  e.target.style.background = '#2563eb';
                }
              }}
            >
              {adding ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>
      </PageCard>

      {/* 계정 목록 섹션 */}
      <PageCard>
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '20px',
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            📋 등록된 계정 ({accounts.length})
          </h3>

          {loading ? (
            <Loading />
          ) : accounts.length === 0 ? (
            <Alert type="info" message="등록된 계정이 없습니다. 위의 이메일 주소를 입력하여 계정을 추가하세요." />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <FiMail style={{ color: '#2563eb', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1a1a1a',
                        wordBreak: 'break-all',
                      }}>
                        {account.email}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#6b7280',
                  }}>
                    <FiCalendar size={14} />
                    {new Date(account.created_at).toLocaleDateString('ko-KR')}
                  </div>

                  <button
                    onClick={() => deleteAccount(account.id, account.email)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#fee2e2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '4px',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#dc2626';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#fee2e2';
                      e.target.style.color = '#dc2626';
                    }}
                  >
                    <FiTrash2 size={14} /> 삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageCard>
    </PageLayout>
  );
}
