import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { accountApi } from '../utils/api';
import { Alert, Toast, ToastContainer } from './common';

/**
 * 계정 선택 모달
 * 배포 시 사용할 Google 계정을 선택
 */
export function SelectAccountModal({ isOpen, onClose, onSelect, loading = false }) {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    setError('');
    try {
      const data = await accountApi.getAll(token);
      setAccounts(data || []);
      if (data?.length > 0) {
        setSelectedAccount(data[0].id);
      }
    } catch (err) {
      setError('계정 목록을 불러올 수 없습니다.');
      console.error(err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSelect = () => {
    if (!selectedAccount) {
      setError('계정을 선택해주세요.');
      return;
    }
    const selected = accounts.find(a => a.id === selectedAccount);
    onSelect(selected);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>📱 로그인할 계정 선택</h2>
        
        {error && <Alert type="error" message={error} />}

        {loadingAccounts ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>로딩 중...</div>
        ) : accounts.length === 0 ? (
          <Alert type="warning" message="사용 가능한 계정이 없습니다. 관리자에게 문의하세요." />
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <option value="">-- 계정 선택 --</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: 'white',
              color: '#333',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            취소
          </button>
          <button
            onClick={handleSelect}
            disabled={loading || !selectedAccount || accounts.length === 0}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#007bff',
              color: 'white',
              cursor: loading || !selectedAccount ? 'not-allowed' : 'pointer',
              opacity: loading || !selectedAccount ? 0.6 : 1,
            }}
          >
            {loading ? '진행 중...' : '계속 진행'}
          </button>
        </div>
      </div>
    </div>
  );
}
