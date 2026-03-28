// frontend/src/components/SimpleDeploy.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleApi, storeApi, logsApi } from '../utils/api';
import { subscribeToTable } from '../utils/realtimeApi';

export default function SimpleDeploy() {
  const { token, isAdmin } = useAuth();
  const [shortUrl, setShortUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDeployment, setCurrentDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [totalCount, setTotalCount] = useState(1);
  const logsContainerRef = useRef(null);

  // 현재 진행중인 배포 확인 (실시간)
  useEffect(() => {
    if (!currentDeployment || !token) return;

    const fetchLogs = async () => {
      try {
        const taskId = `task_${currentDeployment.id}`;
        const logsData = await logsApi.getByTaskId(taskId, 50, token);
        setLogs(logsData || []);
      } catch (error) {
        console.error('로그 조회 실패:', error);
      }
    };

    if (currentDeployment) {
      fetchLogs();
    }
  }, [currentDeployment, token]);

  // 실시간 로그 구독
  useEffect(() => {
    if (!currentDeployment) return;

    const unsubscribe = subscribeToTable('logs', {
      onInsert: (newLog) => {
        if (newLog.task_id === `task_${currentDeployment.id}`) {
          setLogs(prev => [...prev, newLog]);
        }
      },
      onUpdate: (updatedLog) => {
        if (updatedLog.task_id === `task_${currentDeployment.id}`) {
          setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
        }
      },
      onDelete: (deletedLog) => {
        if (deletedLog.task_id === `task_${currentDeployment.id}`) {
          setLogs(prev => prev.filter(l => l.id !== deletedLog.id));
        }
      },
    });

    return () => unsubscribe();
  }, [currentDeployment]);

  // 로그 자동 스크롤 (사용자가 맨 아래에 있을 때만)
  useEffect(() => {
    if (!logsContainerRef.current || logs.length === 0) return;
    
    const container = logsContainerRef.current;
    // 현재 스크롤이 맨 아래에서 100px 이내인지 확인
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isAtBottom) {
      // 맨 아래에 있을 때만 자동 스크롤
      container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  // 매장 리스트 로드
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setStoresLoading(true);
        const data = await storeApi.getAll(token);
        setStores(data || []);
      } catch (error) {
        console.error('매장 조회 실패:', error);
        setStores([]);
      } finally {
        setStoresLoading(false);
      }
    };

    if (token) {
      fetchStores();
    }
  }, [token]);

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <p>🔒 이 메뉴는 관리자만 이용 가능합니다.</p>
        </div>
      </div>
    );
  }

  const handleDeploy = async () => {
    if (!selectedStoreId) {
      alert('매장을 선택해주세요.');
      return;
    }

    if (totalCount < 1) {
      alert('발행 횟수는 1회 이상이어야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await scheduleApi.create(selectedStoreId, 1, totalCount, token);
      
      setCurrentDeployment({
        id: data.schedule.id,
        storeName: stores.find(s => s.id === selectedStoreId)?.store_name,
        totalCount: totalCount,
        completedCount: 0,
        review_status: 'scheduled',
        startTime: new Date(),
      });

      setShortUrl('');
      setNotes('');
      setSelectedStoreId(null);
      setTotalCount(1);
      setLogs([]);
      
      setTimeout(() => {
        setCurrentDeployment(null);
      }, 5000);
    } catch (error) {
      alert(`❌ 오류: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDeploymentStatus = () => {
    if (!currentDeployment) return '준비 완료';
    return {
      'scheduled': '📅 예약됨',
      'pending': '⏹️ 대기',
      'in_progress': '⏳ 진행중',
      'completed': '✅ 완료',
      'failed': '❌ 실패',
    }[currentDeployment.review_status] || '진행중';
  };

  // 에이전시별로 매장 그룹화
  const groupStoresByAgency = (storeList) => {
    const grouped = {};
    storeList.forEach(store => {
      const agencyName = store.users?.user_id || store.user_id || '미지정';
      if (!grouped[agencyName]) {
        grouped[agencyName] = [];
      }
      grouped[agencyName].push(store);
    });
    return grouped;
  };

  // 정렬된 에이전시 그룹 반환
  const getSortedGroupedStores = () => {
    const grouped = groupStoresByAgency(stores);
    
    // 에이전시명 정렬
    const sortedAgencies = Object.keys(grouped).sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.localeCompare(b, 'ko-KR');
      } else {
        return b.localeCompare(a, 'ko-KR');
      }
    });

    // 에이전시 내 매장 정렬
    sortedAgencies.forEach(agency => {
      grouped[agency].sort((a, b) => {
        const nameA = a.store_name || '';
        const nameB = b.store_name || '';
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB, 'ko-KR');
        } else {
          return nameB.localeCompare(nameA, 'ko-KR');
        }
      });
    });

    return { grouped, sortedAgencies };
  };

  // 검색 필터링
  const filterStoresBySearch = (grouped) => {
    if (!searchText.trim()) return grouped;

    const filtered = {};
    Object.entries(grouped).forEach(([agency, storeList]) => {
      const matchingStores = storeList.filter(store =>
        store.store_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        agency.toLowerCase().includes(searchText.toLowerCase())
      );
      if (matchingStores.length > 0) {
        filtered[agency] = matchingStores;
      }
    });
    return filtered;
  };

  const { grouped, sortedAgencies } = getSortedGroupedStores();
  const filteredGrouped = filterStoresBySearch(grouped);
  const totalStores = stores.length;
  const visibleStores = Object.values(filteredGrouped).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🚀 배포 (리뷰 작성)</h1>

      <div style={styles.mainContent}>
        {/* 좌측: 배포 설정 + 진행 상황 */}
        <div style={styles.leftPanel}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>배포 설정</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>매장 주소 (Google Maps 단축 URL)</label>
              <input
                type="text"
                placeholder="예: https://maps.app.goo.gl/ABC123XYZ..."
                value={shortUrl}
                onChange={(e) => setShortUrl(e.target.value)}
                style={styles.input}
                disabled={isSubmitting || !!currentDeployment}
              />
              <p style={styles.hint}>
                🔗 Google Maps에서 공유 &gt; 단축 URL 복사
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>리뷰 메세지 (선택사항)</label>
              <textarea
                placeholder="예: 신메뉴 추천! 맛있어요. 강추합니다."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={styles.textarea}
                disabled={isSubmitting || !!currentDeployment}
                rows="4"
              />
              <p style={styles.hint}>
                💬 입력한 메세지가 리뷰에 자동 입력됩니다
              </p>
            </div>

            {selectedStoreId && (
              <div style={styles.formGroup}>
                <label style={styles.label}>설정된 발행 횟수</label>
                <div style={{
                  background: 'rgba(124, 58, 237, 0.15)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed' }}>
                    {totalCount}
                  </span>
                  <span style={{ color: '#9ca3af' }}>
                    회 자동 생성
                  </span>
                </div>
                <p style={styles.hint}>
                  ✅ 배포 시 {totalCount}개의 작업 기록이 생성됩니다
                </p>
              </div>
            )}

            <button
              onClick={handleDeploy}
              disabled={isSubmitting || !!currentDeployment}
              style={{
                ...styles.deployButton,
                opacity: isSubmitting || !!currentDeployment ? 0.6 : 1,
                cursor: isSubmitting || !!currentDeployment ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? '배포 중...' : !!currentDeployment ? '진행중' : '배포 시작'}
            </button>

            {currentDeployment && (
              <div style={styles.deployInfo}>
                <p style={styles.deployUrl}>
                  📍 {currentDeployment.url}
                </p>
                {currentDeployment.notes && (
                  <p style={styles.deployNotes}>
                    💬 {currentDeployment.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 진행 상황 */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              진행 상황 {currentDeployment && getDeploymentStatus()}
            </h2>

            {currentDeployment ? (
              <>
                <div style={styles.statusInfo}>
                  <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>상태:</span>
                    <span style={{
                      ...styles.statusValue,
                      color: {
                        'pending': '#8b5cf6',
                        'in_progress': '#f59e0b',
                        'completed': '#10b981',
                        'failed': '#ef4444',
                      }[currentDeployment.review_status]
                    }}>
                      {getDeploymentStatus()}
                    </span>
                  </div>
                  <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>시작 시간:</span>
                    <span style={styles.statusValue}>
                      {currentDeployment.startTime.toLocaleTimeString('ko-KR')}
                    </span>
                  </div>
                </div>

                {/* 로그 */}
                <div style={styles.logsContainer}>
                  <h3 style={styles.logsTitle}>📝 실시간 로그</h3>
                  <div style={styles.logsList} ref={logsContainerRef}>
                    {logs.length === 0 ? (
                      <p style={styles.emptyLog}>로그를 기다리는 중...</p>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} style={styles.logLine}>
                          <span style={styles.logTime}>
                            {new Date(log.timestamp).toLocaleTimeString('ko-KR')}
                          </span>
                          <span style={{
                            ...styles.logMessage,
                            color: {
                              'DEBUG': '#6b7280',
                              'INFO': '#10b981',
                              'WARN': '#f59e0b',
                              'ERROR': '#ef4444',
                            }[log.log_level] || '#e5e7eb'
                          }}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 완료 메세지 */}
                {currentDeployment.review_status === 'completed' && (
                  <div style={styles.successMessage}>
                    ✅ 배포가 완료되었습니다!
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      브라우저에서 리뷰를 작성하고 제출해주세요.
                    </p>
                  </div>
                )}

                {currentDeployment.review_status === 'failed' && (
                  <div style={styles.errorMessage}>
                    ❌ 배포에 실패했습니다.
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      로그를 확인하고 다시 시도해주세요.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '48px', marginBottom: '12px' }}>🚀</p>
                <p style={{ color: '#9ca3af', marginBottom: '8px' }}>
                  아직 배포가 진행중이 아닙니다.
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                  좌측에서 매장 정보를 입력하고 배포를 시작하세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 우측: 등록된 매장 리스트 */}
        <div style={styles.rightPanel}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📍 등록된 매장</h2>

            {/* 검색 및 정렬 */}
            <div style={styles.storesHeader}>
              <div style={styles.searchAndSort}>
                <input
                  type="text"
                  placeholder="매장명/에이전시명 검색..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={styles.searchInput}
                />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={styles.sortSelect}
                >
                  <option value="asc">가나다순</option>
                  <option value="desc">역순</option>
                </select>
              </div>
              <div style={styles.storesCount}>
                총 {totalStores}개 / 검색 {visibleStores}개
              </div>
            </div>

            {storesLoading ? (
              <div style={styles.loadingMessage}>로딩 중...</div>
            ) : stores.length === 0 ? (
              <div style={styles.emptyMessage}>등록된 매장이 없습니다.</div>
            ) : Object.keys(filteredGrouped).length === 0 ? (
              <div style={styles.emptyMessage}>검색 결과가 없습니다.</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.storesTable}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={{ ...styles.th, width: '16%' }}>매장명</th>
                      <th style={{ ...styles.th, width: '12%' }}>에이전시</th>
                      <th style={{ ...styles.th, width: '12%' }}>등록자</th>
                      <th style={{ ...styles.th, width: '18%' }}>주소</th>
                      <th style={{ ...styles.th, width: '16%' }}>리뷰 메세지</th>
                      <th style={{ ...styles.th, width: '8%' }}>발행횟수</th>
                      <th style={{ ...styles.th, width: '8%' }}>날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAgencies.map((agency) => 
                      filteredGrouped[agency] && filteredGrouped[agency].map((store, idx) => (
                        <tr 
                          key={store.id} 
                          onClick={() => {
                            setSelectedStoreId(store.id);
                            if (store.address) setShortUrl(store.address);
                            if (store.review_message) setNotes(store.review_message);
                            setTotalCount(store.total_count || 1);
                          }}
                          style={{
                            ...styles.tableRow,
                            backgroundColor: selectedStoreId === store.id 
                              ? 'rgba(124, 58, 237, 0.3)'
                              : idx % 2 === 0 ? 'rgba(230, 190, 255, 0.08)' : 'rgba(255, 192, 203, 0.08)',
                            border: selectedStoreId === store.id ? '2px solid #7c3aed' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ ...styles.td, width: '16%', fontWeight: '600' }}>
                            {store.store_name}
                          </td>
                          <td style={{ ...styles.td, width: '12%', fontSize: '14px', color: '#a78bfa' }}>
                            {agency}
                          </td>
                          <td style={{ ...styles.td, width: '12%', fontSize: '14px', color: '#f0b90b' }}>
                            {store.user?.user_id || '미등록'}
                          </td>
                          <td style={{ ...styles.td, width: '18%', fontSize: '13px' }}>
                            {store.address ? (
                              <a href={store.address} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {store.address.substring(0, 20)}...
                              </a>
                            ) : '-'}
                          </td>
                          <td style={{ ...styles.td, width: '16%', fontSize: '13px' }}>
                            {store.review_message || '-'}
                          </td>
                          <td style={{ ...styles.td, width: '8%', fontSize: '13px', fontWeight: '500', color: '#06b6d4', textAlign: 'center' }}>
                            {store.total_count || 1}회
                          </td>
                          <td style={{ ...styles.td, width: '8%', fontSize: '12px' }}>
                            {new Date(store.created_at).toLocaleDateString('ko-KR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(15, 20, 25, 0.9) 0%, rgba(20, 30, 48, 0.8) 100%)',
    borderRadius: '12px',
    height: 'auto',
  },

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '16px',
  },

  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },

  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  card: {
    background: 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(40, 50, 70, 0.6) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    backdropFilter: 'blur(10px)',
  },

  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 12px 0',
  },

  formGroup: {
    marginBottom: '12px',
  },

  label: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '500',
    color: '#d1d5db',
    marginBottom: '8px',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'rgba(40, 50, 70, 0.9)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '16px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'rgba(40, 50, 70, 0.9)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },

  hint: {
    fontSize: '14px',
    color: '#9ca3af',
    marginTop: '6px',
  },

  deployButton: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    marginTop: '8px',
  },

  deployInfo: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: '8px',
    borderLeft: '3px solid #7c3aed',
  },

  deployUrl: {
    fontSize: '15px',
    color: '#9ca3af',
    margin: '0 0 6px 0',
    wordBreak: 'break-all',
  },

  deployNotes: {
    fontSize: '15px',
    color: '#d1d5db',
    margin: 0,
    fontStyle: 'italic',
  },

  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    marginBottom: '16px',
  },

  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '15px',
  },

  statusLabel: {
    color: '#9ca3af',
  },

  statusValue: {
    color: '#e5e7eb',
    fontWeight: '500',
  },

  logsContainer: {
    marginTop: '16px',
  },

  logsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: '12px',
  },

  logsList: {
    height: '300px',
    overflowY: 'auto',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    boxSizing: 'border-box',
  },

  logLine: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '15px',
    fontFamily: 'monospace',
  },

  logTime: {
    color: '#6b7280',
    minWidth: '70px',
    flexShrink: 0,
  },

  logMessage: {
    color: '#e5e7eb',
    wordBreak: 'break-word',
  },

  emptyLog: {
    color: '#6b7280',
    textAlign: 'center',
    padding: '20px 0',
    fontSize: '15px',
  },

  successMessage: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '500',
  },

  errorMessage: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#7f1d1d',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '500',
  },

  emptyState: {
    textAlign: 'center',
    padding: '20px 12px',
    color: '#9ca3af',
  },

  // 매장 리스트 스타일
  storesHeader: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  searchAndSort: {
    display: 'flex',
    gap: '8px',
  },

  searchInput: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '15px',
    fontFamily: 'inherit',
  },

  sortSelect: {
    padding: '8px 12px',
    backgroundColor: 'rgba(40, 50, 70, 0.9)',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '16px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  storesCount: {
    fontSize: '14px',
    color: '#9ca3af',
    textAlign: 'right',
  },

  loadingMessage: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px',
    fontSize: '16px',
  },

  emptyMessage: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px',
    fontSize: '16px',
  },

  agencyGroups: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: 'calc(100vh - 300px)',
    overflowY: 'auto',
  },

  agencyGroup: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.15)',
    overflow: 'hidden',
  },

  agencyHeader: {
    padding: '12px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.2s ease',
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },

  agencyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  agencyToggle: {
    fontSize: '12px',
    color: '#9ca3af',
    minWidth: '12px',
  },

  agencyCount: {
    fontSize: '14px',
    color: '#9ca3af',
    fontWeight: 'normal',
  },

  storesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },

  storeItem: {
    background: 'rgba(124, 58, 237, 0.08)',
    border: '1px solid rgba(124, 58, 237, 0.1)',
    borderRadius: '6px',
    padding: '8px 10px',
  },

  storeName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#e5e7eb',
    marginBottom: '4px',
  },

  storeAddress: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '4px',
    wordBreak: 'break-all',
  },

  storeReview: {
    fontSize: '14px',
    color: '#d1d5db',
    marginBottom: '4px',
    fontStyle: 'italic',
  },

  storeDate: {
    fontSize: '12.5px',
    color: '#6b7280',
  },

  loadMoreButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '6px',
    color: '#9ca3af',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid rgba(124, 58, 237, 0.15)',
    maxHeight: 'calc(100vh - 300px)',
    overflowY: 'auto',
  },

  storesTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px',
  },

  tableHeader: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
    position: 'sticky',
    top: 0,
  },

  th: {
    padding: '10px 8px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#a78bfa',
    borderRight: '1px solid rgba(124, 58, 237, 0.15)',
  },

  tableRow: {
    borderBottom: '1px solid rgba(124, 58, 237, 0.1)',
    transition: 'background 0.2s ease',
    cursor: 'pointer',
  },

  td: {
    padding: '9px 8px',
    fontSize: '14px',
    color: '#e0e0e0',
    borderRight: '1px solid rgba(124, 58, 237, 0.05)',
  },

  link: {
    color: '#90caf9',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(144, 202, 249, 0.3)',
    transition: 'all 0.2s ease',
  },

  accessDenied: {
    padding: '32px',
    textAlign: 'center',
    color: '#9ca3af',
  },
};
