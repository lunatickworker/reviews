import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleApi, storeApi } from '../utils/api';

export default function SimpleDeploy() {
  const { token, isAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // 매장 조회
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setStoresLoading(true);
        const data = await storeApi.getAll(token);
        setStores(data || []);
      } catch (error) {
        console.error('매장 조회 실패:', error);
        setErrorMessage('매장 조회에 실패했습니다.');
      } finally {
        setStoresLoading(false);
      }
    };

    if (token) {
      fetchStores();
    }
  }, [token]);

  // 배포 예약 조회 (주기적 갱신 - 5초마다)
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setSchedulesLoading(true);
        const data = await scheduleApi.getAll(token);
        setSchedules(data || []);
      } catch (error) {
        console.error('배포 예약 조회 실패:', error);
      } finally {
        setSchedulesLoading(false);
      }
    };

    if (token) {
      fetchSchedules();
      // 5초마다 갱신 (진행 상황 실시간 표시)
      const interval = setInterval(fetchSchedules, 5000);
      return () => clearInterval(interval);
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

  // 매장 예약 기능
  const handleScheduleStore = async () => {
    if (!selectedStoreId) {
      setErrorMessage('매장을 선택해주세요.');
      return;
    }

    const selectedStore = stores.find(s => s.id === selectedStoreId);
    if (!selectedStore || !selectedStore.total_count) {
      setErrorMessage('설정된 발행 횟수가 없습니다.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const dailyFrequency = selectedStore.daily_frequency || 1;
      const totalCount = selectedStore.total_count || 1;

      await scheduleApi.create(selectedStoreId, dailyFrequency, totalCount, token);
      setSuccessMessage(
        `✅ ${selectedStore.store_name} - ${totalCount}회 배포 예약 완료!\n지금 시작합니다.`
      );

      // 예약 목록 새로고침
      const updatedSchedules = await scheduleApi.getAll(token);
      setSchedules(updatedSchedules || []);

      setSelectedStoreId(null);

      // 3초 후 메시지 제거
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(error.message || '배포 예약에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 배포 예약 취소
  const handleCancelSchedule = async (scheduleId) => {
    if (!window.confirm('이 배포 예약을 취소하시겠습니까?')) return;

    try {
      await scheduleApi.cancel(scheduleId, token);
      const updatedSchedules = await scheduleApi.getAll(token);
      setSchedules(updatedSchedules || []);
      setSuccessMessage('배포 예약이 취소되었습니다.');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      setErrorMessage('취소에 실패했습니다.');
    }
  };

  // 에이전시별로 매장 그룹화
  const groupStoresByAgency = () => {
    const grouped = {};
    stores.forEach(store => {
      const agencyName = store.user?.user_id || '미지정';
      if (!grouped[agencyName]) {
        grouped[agencyName] = [];
      }
      grouped[agencyName].push(store);
    });
    return grouped;
  };

  // 검색 및 정렬된 매장 조회
  const getSortedGroupedStores = () => {
    const grouped = groupStoresByAgency();

    // 검색 필터링
    let filtered = { ...grouped };
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = {};
      Object.entries(grouped).forEach(([agency, storeList]) => {
        const matchingStores = storeList.filter(store =>
          store.store_name?.toLowerCase().includes(query) ||
          agency.toLowerCase().includes(query)
        );
        if (matchingStores.length > 0) {
          filtered[agency] = matchingStores;
        }
      });
    }

    // 에이전시명 정렬
    const sortedAgencies = Object.keys(filtered).sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.localeCompare(b, 'ko-KR');
      } else {
        return b.localeCompare(a, 'ko-KR');
      }
    });

    // 에이전시 내 매장 정렬
    sortedAgencies.forEach(agency => {
      filtered[agency].sort((a, b) => {
        const nameA = a.store_name || '';
        const nameB = b.store_name || '';
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB, 'ko-KR');
        } else {
          return nameB.localeCompare(nameA, 'ko-KR');
        }
      });
    });

    return { filtered, sortedAgencies };
  };

  // 선택된 매장 정보
  const selectedStore = stores.find(s => s.id === selectedStoreId);

  // 진행 중인 예약 개수
  const activeSchedules = schedules.filter(s => s.status === 'active');
  const completedSchedules = schedules.filter(s => s.status === 'completed');
  
  console.log(`📊 스케줄 상태: 진행중=${activeSchedules.length}개, 완료=${completedSchedules.length}개, 총=${schedules.length}개`);
  activeSchedules.forEach(s => {
    console.log(`  ├─ ID: ${s.id}, 매장: ${s.stores?.store_name}, 진행: ${s.completed_count}/${s.total_count}, 남음: ${s.remaining_count}회`);
  });

  const { filtered: filteredStores, sortedAgencies } = getSortedGroupedStores();
  const visibleStoresCount = Object.values(filteredStores).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🚀 배포 예약</h1>

      <div style={styles.mainContent}>
        {/* 좌측: 배포 예약 설정 */}
        <div style={styles.leftPanel}>
          {/* 배포 예약 카드 */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📅 배포 예약</h2>

            {errorMessage && (
              <div style={styles.errorBox}>
                <p>{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div style={styles.successBox}>
                <p>{successMessage}</p>
              </div>
            )}

            {selectedStore ? (
              <>
                <div style={styles.selectedStoreInfo}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>매장명:</span>
                    <span style={styles.infoValue}>{selectedStore.store_name}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>하루 발행:</span>
                    <span style={styles.infoValue}>
                      {selectedStore.daily_frequency || 1}회
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>총 발행:</span>
                    <span style={{ ...styles.infoValue, ...styles.highlightValue }}>
                      {selectedStore.total_count || 1}회
                    </span>
                  </div>
                  {selectedStore.review_message && (
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>메시지:</span>
                      <span style={styles.infoValue}>
                        {selectedStore.review_message}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleScheduleStore}
                  disabled={isSubmitting}
                  style={{
                    ...styles.scheduleButton,
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? '예약 중...' : '📅 배포 예약'}
                </button>

                <button
                  onClick={() => setSelectedStoreId(null)}
                  style={styles.cancelSelectButton}
                >
                  선택 취소
                </button>
              </>
            ) : (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>👇</p>
                <p style={{ color: '#9ca3af' }}>
                  하단 매장 목록에서
                </p>
                <p style={{ color: '#9ca3af' }}>
                  매장을 선택해주세요
                </p>
              </div>
            )}
          </div>

          {/* 예약 현황 카드 */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              예약 현황 {activeSchedules.length > 0 && `(${activeSchedules.length})`}
            </h2>

            {schedulesLoading ? (
              <p style={styles.centerText}>로딩 중...</p>
            ) : activeSchedules.length === 0 ? (
              <p style={styles.centerText}>진행 중인 배포 예약이 없습니다.</p>
            ) : (
              <div style={styles.scheduleList}>
                {activeSchedules.map((schedule) => {
                  const store = schedule.stores;
                  const remainingCount = schedule.remaining_count || 0;
                  const lastDeployDate = schedule.last_deploy_date 
                    ? new Date(schedule.last_deploy_date).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : '대기 중...';

                  return (
                    <div key={schedule.id} style={styles.scheduleItem}>
                      <div style={styles.scheduleInfo}>
                        <p style={styles.scheduleName}>
                          {store?.store_name || '로딩 중...'}
                        </p>
                        <div style={styles.scheduleStats}>
                          <span style={styles.stat}>
                            진행: {schedule.completed_count || 0}/{schedule.total_count}
                          </span>
                          <span style={styles.stat}>
                            남음: {remainingCount}회
                          </span>
                        </div>
                        <div style={styles.scheduleTimestamp}>
                          <span style={{ fontSize: '12px', color: '#a78bfa' }}>
                            ⏰ 마지막 배포: {lastDeployDate}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelSchedule(schedule.id)}
                        style={styles.cancelButton}
                      >
                        취소
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 매장 목록 */}
        <div style={styles.rightPanel}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📍 등록된 매장</h2>

            {/* 검색 및 정렬 */}
            <div style={styles.filterBar}>
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
              <span style={styles.resultCount}>
                {stores.length}개 / {visibleStoresCount}개
              </span>
            </div>

            {/* 매장 테이블 */}
            {storesLoading ? (
              <p style={styles.centerText}>로딩 중...</p>
            ) : stores.length === 0 ? (
              <p style={styles.centerText}>등록된 매장이 없습니다.</p>
            ) : visibleStoresCount === 0 ? (
              <p style={styles.centerText}>검색 결과가 없습니다.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.storesTable}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={{ ...styles.th, width: '18%' }}>매장명</th>
                      <th style={{ ...styles.th, width: '14%' }}>에이전시</th>
                      <th style={{ ...styles.th, width: '14%' }}>등록자</th>
                      <th style={{ ...styles.th, width: '18%' }}>메시지</th>
                      <th style={{ ...styles.th, width: '10%' }}>하루</th>
                      <th style={{ ...styles.th, width: '10%' }}>총</th>
                      <th style={{ ...styles.th, width: '16%' }}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAgencies.map((agency) =>
                      filteredStores[agency].map((store, idx) => (
                        <tr
                          key={store.id}
                          onClick={() => setSelectedStoreId(store.id)}
                          style={{
                            ...styles.tableRow,
                            backgroundColor:
                              selectedStoreId === store.id
                                ? 'rgba(124, 58, 237, 0.3)'
                                : idx % 2 === 0
                                ? 'rgba(230, 190, 255, 0.08)'
                                : 'rgba(255, 192, 203, 0.08)',
                            border:
                              selectedStoreId === store.id
                                ? '2px solid #7c3aed'
                                : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ ...styles.td, width: '18%' }}>
                            {store.store_name}
                          </td>
                          <td style={{ ...styles.td, width: '14%', color: '#a78bfa' }}>
                            {agency}
                          </td>
                          <td style={{ ...styles.td, width: '14%', color: '#f0b90b' }}>
                            {store.user?.user_id || '-'}
                          </td>
                          <td style={{ ...styles.td, width: '18%', fontSize: '13px' }}>
                            {store.review_message || '-'}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              width: '10%',
                              textAlign: 'center',
                              color: '#f59e0b',
                              fontWeight: '500',
                            }}
                          >
                            {store.daily_frequency || 1}회
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              width: '10%',
                              textAlign: 'center',
                              color: '#06b6d4',
                              fontWeight: '500',
                            }}
                          >
                            {store.total_count || 1}회
                          </td>
                          <td style={{ ...styles.td, width: '16%', fontSize: '12px' }}>
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
    minHeight: '100vh',
  },

  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '20px',
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
    fontSize: '18px',
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: '16px',
  },

  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '12px',
    color: '#fca5a5',
    fontSize: '14px',
  },

  successBox: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '12px',
    color: '#86efac',
    fontSize: '14px',
    whiteSpace: 'pre-line',
  },

  selectedStoreInfo: {
    background: 'rgba(124, 58, 237, 0.1)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },

  infoLabel: {
    color: '#9ca3af',
    fontWeight: '500',
  },

  infoValue: {
    color: '#e5e7eb',
    fontWeight: '600',
  },

  highlightValue: {
    color: '#7c3aed',
    fontSize: '16px',
  },

  scheduleButton: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
  },

  cancelSelectButton: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px solid rgba(107, 114, 128, 0.5)',
    borderRadius: '6px',
    color: '#9ca3af',
    fontWeight: '500',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280',
  },

  centerText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px',
  },

  scheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  scheduleItem: {
    background: 'rgba(50, 60, 80, 0.6)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  scheduleInfo: {
    flex: 1,
  },

  scheduleName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: '6px',
  },

  scheduleStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#9ca3af',
  },

  scheduleTimestamp: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid rgba(107, 114, 128, 0.2)',
  },

  stat: {
    color: '#a78bfa',
  },

  cancelButton: {
    padding: '6px 12px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '4px',
    color: '#fca5a5',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  accessDenied: {
    textAlign: 'center',
    padding: '40px',
    color: '#ef4444',
    fontSize: '18px',
  },

  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    padding: '8px 12px',
    background: 'rgba(50, 60, 80, 0.6)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '13px',
  },

  sortSelect: {
    padding: '8px 12px',
    background: 'rgba(50, 60, 80, 0.6)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '13px',
    cursor: 'pointer',
  },

  resultCount: {
    fontSize: '12px',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
  },

  tableWrapper: {
    overflowX: 'auto',
  },

  storesTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },

  tableHeader: {
    background: 'rgba(60, 70, 90, 0.9)',
    borderBottom: '2px solid rgba(124, 58, 237, 0.3)',
  },

  th: {
    padding: '12px 8px',
    color: '#a78bfa',
    fontWeight: '600',
    textAlign: 'left',
  },

  tableRow: {
    borderBottom: '1px solid rgba(124, 58, 237, 0.1)',
    transition: 'all 0.2s ease',
  },

  td: {
    padding: '10px 8px',
    color: '#d1d5db',
  },
};
