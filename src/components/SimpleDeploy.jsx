import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storeApi, mapApi } from '../utils/api';
import { PageLayout, Alert } from './common';

const SimpleDeploy = () => {
  const { token, isAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deployingStoreId, setDeployingStoreId] = useState(null);

  useEffect(() => {
    const loadStores = async () => {
      try {
        setLoading(true);
        const data = await storeApi.getAll(token);
        setStores(data || []);
      } catch (err) {
        setError('매장 조회 실패');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadStores();
    }
  }, [token]);

  const handleDeploy = async (store) => {
    if (!window.confirm(`${store.store_name}을(를) 배포하시겠습니까?`)) {
      return;
    }

    setDeployingStoreId(store.id);
    setError('');
    
    try {
      // 1️⃣ 배포 실행 - mapApi.automateMap 사용
      await mapApi.automateMap(
        store.address,
        store.review_message || '',
        store.id,
        store.total_count || 1,
        token
      );

      // 2️⃣ 배포 완료 후 deployed_count 증가
      const result = await storeApi.deploy(store.id, token);
      
      setSuccessMessage(`✅ ${store.store_name} 배포가 완료되었습니다. (${result.store.deployed_count}/${result.store.total_count})`);
      setTimeout(() => setSuccessMessage(''), 3000);

      // 3️⃣ 매장 목록 새로고침
      const updatedStores = stores.map(s => s.id === store.id ? result.store : s);
      setStores(updatedStores);
    } catch (err) {
      setError(`배포 실패: ${err.message}`);
      console.error(err);
    } finally {
      setDeployingStoreId(null);
    }
  };

  if (!isAdmin) {
    return (
      <PageLayout title="🚀 배포" description="관리자만 접근 가능합니다">
        <div style={{ textAlign: 'center', padding: '40px', color: '#b8c5d6' }}>
          🔒 이 메뉴는 관리자만 이용 가능합니다.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="🚀 배포" 
      description={`${stores.length}개 매장 관리`}
    >
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError('')}
          duration={3000}
        />
      )}

      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
          duration={3000}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b8c5d6' }}>
          로드 중...
        </div>
      ) : stores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b8c5d6' }}>
          등록된 매장이 없습니다.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {stores.map((store) => (
            <div
              key={store.id}
              style={{
                background: 'linear-gradient(135deg, rgba(70, 130, 180, 0.1) 0%, rgba(70, 130, 180, 0.05) 100%)',
                border: '1px solid rgba(70, 130, 180, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#e8eef5', marginBottom: '4px' }}>
                  {store.store_name}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                  등록자: {store.user?.user_id || '-'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <span style={{ color: '#b8c5d6' }}>하루: </span>
                  <span style={{ color: '#93c5fd', fontWeight: '600' }}>
                    {store.daily_frequency || 1}회
                  </span>
                </div>
                <div>
                  <span style={{ color: '#b8c5d6' }}>총: </span>
                  <span style={{ color: '#93c5fd', fontWeight: '600' }}>
                    {store.total_count || 1}회
                  </span>
                </div>
              </div>

              {store.review_message && (
                <div style={{ fontSize: '12px', marginBottom: '12px', color: '#a0aec0' }}>
                  💡 {store.review_message.substring(0, 50)}
                  {store.review_message.length > 50 ? '...' : ''}
                </div>
              )}

              <button
                onClick={() => handleDeploy(store)}
                disabled={deployingStoreId === store.id}
                style={{
                  width: '100%',
                  padding: '10px',
                  background:
                    deployingStoreId === store.id
                      ? 'rgba(107, 114, 128, 0.4)'
                      : 'rgba(34, 197, 94, 0.9)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: deployingStoreId === store.id ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  opacity: deployingStoreId === store.id ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                }}
              >
                {deployingStoreId === store.id ? '배포 중...' : '🚀 즉시 배포'}
              </button>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default SimpleDeploy;
