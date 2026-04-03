import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapApi, logsApi } from '../utils/api';
import { subscribeToTable } from '../utils/realtimeApi';
import { PageLayout } from './common';

export default function ReviewAnalytics() {
  const { token, isAdmin } = useAuth();
  const isInitialLoad = useRef(true);
  const [tasks, setTasks] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const getSavedWorkAccount = () => {
    try {
      return localStorage.getItem('detectedWorkAccount') || '';
    } catch (e) {
      return '';
    }
  };

  const findInFrames = (selector) => {
    const search = (doc) => {
      const el = doc.querySelector(selector);
      if (el) return el;
      const iframes = Array.from(doc.querySelectorAll('iframe'));
      for (const iframe of iframes) {
        try {
          const childDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!childDoc) continue;
          const found = search(childDoc);
          if (found) return found;
        } catch (e) {
          continue;
        }
      }
      return null;
    };
    return search(document);
  };

  const [workAccountFilter, setWorkAccountFilter] = useState(() => getSavedWorkAccount());
  const [detectedWorkAccount, setDetectedWorkAccount] = useState(() => getSavedWorkAccount());

  useEffect(() => {
    const t = setInterval(() => {
      try {
        const v = getSavedWorkAccount();
        if (v !== detectedWorkAccount) setDetectedWorkAccount(v);
        if (v && !workAccountFilter) setWorkAccountFilter(v);
      } catch (e) {}
    }, 1000);
    return () => clearInterval(t);
  }, [detectedWorkAccount, workAccountFilter]);

  useEffect(() => {
    const t2 = setInterval(() => {
      // 함수를 useEffect 내부에서 정의
      const detectReviewWorkAccount = () => {
        try {
          const el = findInFrames('.Af21Ie');
          const value = el?.textContent?.trim();
          if (value) {
            try {
              localStorage.setItem('detectedWorkAccount', value);
            } catch (e) {}
            return value;
          }
        } catch (e) {}
        return null;
      };

      const parsed = detectReviewWorkAccount();
      if (parsed && parsed !== detectedWorkAccount) {
        setDetectedWorkAccount(parsed);
        setWorkAccountFilter(parsed);
      }
    }, 1500);
    return () => clearInterval(t2);
  }, [detectedWorkAccount]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [extractingTaskId, setExtractingTaskId] = useState(null); // 링크 추출 중인 task
  const [filterType, setFilterType] = useState('all'); // all, review, image
  const [dateRange, setDateRange] = useState('today'); // today, week, month
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskData, storeData] = await Promise.all([
          mapApi.getTasks(token),
          (await import('../utils/api')).storeApi.getAll(token),
        ]);
        setTasks(taskData || []);
        setStores(storeData || []);
      } catch (error) {
        console.error('작업 조회 실패:', error);
      } finally {
        if (isInitialLoad.current) {
          isInitialLoad.current = false;
          setLoading(false);
        }
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // 실시간 구독
  useEffect(() => {
    return subscribeToTable('tasks', {
      onInsert: (newTask) => setTasks(prev => [...prev, newTask]),
      onUpdate: (updatedTask) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)),
      onDelete: (deletedTask) => setTasks(prev => prev.filter(t => t.id !== deletedTask.id)),
    });
  }, []);

  // 날짜 범위에 따라 필터링
  const getFilteredTasks = () => {
    let filtered = tasks;

    // 날짜 범위 필터
    const now = new Date();
    const taskDate = new Date(selectedDate);

    if (dateRange === 'today') {
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate.toLocaleDateString() === now.toLocaleDateString();
      });
    } else if (dateRange === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate >= sevenDaysAgo && tDate <= now;
      });
    } else if (dateRange === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate >= thirtyDaysAgo && tDate <= now;
      });
    } else if (dateRange === 'custom' && selectedDate) {
      filtered = filtered.filter(task => {
        const tDate = new Date(task.created_at);
        return tDate.toLocaleDateString() === taskDate.toLocaleDateString();
      });
    }

    // 타입 필터 (리뷰/이미지)
    if (filterType === 'review') {
      filtered = filtered.filter(task => task.review_status && task.review_status !== 'pending');
    } else if (filterType === 'image') {
      filtered = filtered.filter(task => task.image_status && task.image_status !== 'pending');
    }

    // 검색 필터 (매장이름)
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(task => {
        const storeName = stores.find(s => s.id === task.store_id)?.store_name || '';
        return storeName.toLowerCase().includes(q);
      });
    }

    if (workAccountFilter && workAccountFilter.trim()) {
      const wa = workAccountFilter.toLowerCase();
      filtered = filtered.filter(task => {
        const acct = (task.work_account || '').toLowerCase();
        return acct.includes(wa);
      });
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  // 작업계정 표시 (Google 계정 이메일의 @ 앞부분)
  const getWorkAccount = (task) => {
    if (task.work_account) return task.work_account;
    if (detectedWorkAccount && detectedWorkAccount.trim()) return detectedWorkAccount.trim();
    return '미지정';
  };

  // 로그 조회
  const handleViewLogs = async (task) => {
    setLogLoading(true);
    try {
      const logData = await logsApi.getByTaskId(task.task_id, 100, token);
      setLogs(logData || []);
      setShowLogModal(true);
    } catch (error) {
      console.error('로그 조회 실패:', error);
      setLogs([]);
      setShowLogModal(true);
    } finally {
      setLogLoading(false);
    }
  };

  // 링크 자동 추출
  const handleExtractLink = async (task) => {
    setExtractingTaskId(task.id);
    try {
      const response = await mapApi.extractReviewLink(task.id, token);
      if (response && response.review_share_link) {
        if (window.toastInstance) {
          window.toastInstance.add({
            type: 'success',
            message: `✅ 링크 추출 완료!`,
            duration: 3000
          });
        }
      } else {
        throw new Error('링크 추출 실패');
      }
    } catch (error) {
      console.error('링크 추출 실패:', error);
      if (window.toastInstance) {
        window.toastInstance.add({
          type: 'error',
          message: `❌ ${error.message || '링크 추출에 실패했습니다'}`,
          duration: 3000
        });
      }
    } finally {
      setExtractingTaskId(null);
    }
  };

  // 통계 계산
  const statistics = {
    total: filteredTasks.length,
    completedReview: filteredTasks.filter(t => t.review_status === 'completed').length,
    failedReview: filteredTasks.filter(t => t.review_status === 'failed').length,
    completedImage: filteredTasks.filter(t => t.image_status === 'completed').length,
    failedImage: filteredTasks.filter(t => t.image_status === 'failed').length,
  };

  const reviewSuccessRate = statistics.total > 0
    ? Math.round((statistics.completedReview / statistics.total) * 100)
    : 0;

  const imageSuccessRate = statistics.total > 0
    ? Math.round((statistics.completedImage / statistics.total) * 100)
    : 0;

  return (
    <PageLayout 
      title="리뷰작성현황" 
      description="리뷰 및 이미지 리뷰 작업 통계 및 분석"
    >
      {/* 필터 섹션 */}
      <div style={styles.filterSection}>
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>기간</label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setCurrentPage(1); // ✅ 필터 변경 시 페이지 1로 리셋
              }}
              style={styles.select}
            >
              <option value="today">오늘</option>
              <option value="week">최근 7일</option>
              <option value="month">최근 30일</option>
              <option value="custom">특정 날짜</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div style={styles.filterGroup}>
              <label style={styles.label}>날짜</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1); // ✅ 날짜 변경 시 페이지 1로 리셋
                }}
                style={styles.dateInput}
              />
            </div>
          )}

          <div style={styles.filterGroup}>
            <label style={styles.label}>작업유형</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1); // ✅ 필터 변경 시 페이지 1로 리셋
              }}
              style={styles.select}
            >
              <option value="all">전체</option>
              <option value="review">리뷰 작성</option>
              <option value="image">이미지 리뷰</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>매장명 검색</label>
            <input
              type="text"
              placeholder="매장이름 입력..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1); // ✅ 검색할 때 페이지 1로 리셋
              }}
              style={styles.searchInput}
            />
          </div>



          <button
            onClick={() => {
              setSearchText('');
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setDateRange('today');
              setFilterType('all');
            }}
            style={styles.resetButton}
          >
            초기화
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={styles.statsGrid}>
        {/* 총 작업 - 파란색 */}
        <div style={{ 
          ...styles.statCard, 
          borderLeft: '4px solid #4682b4',
          background: 'linear-gradient(135deg, rgba(70, 130, 180, 0.12) 0%, rgba(70, 130, 180, 0.08) 100%)',
          border: '1px solid rgba(70, 130, 180, 0.2)'
        }}>
          <div style={styles.statLabel}>총 작업</div>
          <div style={{ ...styles.statValue, color: '#4682b4' }}>{statistics.total}</div>
        </div>

        {/* 리뷰 완료 - 초록색 */}
        <div style={{ 
          ...styles.statCard, 
          borderLeft: '4px solid #059669',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
          border: '1px solid rgba(5, 150, 105, 0.2)'
        }}>
          <div style={styles.statLabel}>리뷰 완료</div>
          <div style={{ ...styles.statValue, color: '#059669' }}>{statistics.completedReview}</div>
          <div style={styles.statDescription}>{reviewSuccessRate}% 성공</div>
        </div>

        {/* 리뷰 실패 - 빨간색 */}
        <div style={{ 
          ...styles.statCard, 
          borderLeft: '4px solid #ef4444',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <div style={styles.statLabel}>리뷰 실패</div>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{statistics.failedReview}</div>
        </div>

        {/* 이미지 완료 - 주황색 */}
        <div style={{ 
          ...styles.statCard, 
          borderLeft: '4px solid #f59e0b',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.2)'
        }}>
          <div style={styles.statLabel}>이미지 완료</div>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{statistics.completedImage}</div>
          <div style={styles.statDescription}>{imageSuccessRate}% 성공</div>
        </div>
      </div>

      {/* 리스트 섹션 */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px' }}>
          로딩 중...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div style={styles.emptyState}>
          <p>해당하는 작업이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 페이지네이션 */}
          {(() => {
            const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

            return (
              <>
                {/* 페이지네이션 컨트롤 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  background: 'rgba(20, 40, 70, 0.2)',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#b8c5d6' }}>페이지당: </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(30, 50, 80, 0.6)',
                        border: '1px solid rgba(70, 130, 180, 0.2)',
                        borderRadius: '4px',
                        color: '#93c5fd',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value={10}>10개</option>
                      <option value={20}>20개</option>
                      <option value={50}>50개</option>
                      <option value={100}>100개</option>
                    </select>
                  </div>

                  {filteredTasks.length > itemsPerPage && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 10px',
                          background: currentPage === 1 ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: currentPage === 1 ? '#6b7280' : '#93c5fd',
                          cursor: currentPage === 1 ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ◀◀
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 10px',
                          background: currentPage === 1 ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: currentPage === 1 ? '#6b7280' : '#93c5fd',
                          cursor: currentPage === 1 ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ◀
                      </button>

                      {(() => {
                        const pageButtons = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                        
                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }
                        
                        for (let i = startPage; i <= endPage; i++) {
                          pageButtons.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              style={{
                                padding: '6px 10px',
                                background: currentPage === i ? 'rgba(99, 102, 241, 0.6)' : 'rgba(30, 50, 80, 0.6)',
                                border: currentPage === i ? '1px solid rgba(99, 102, 241, 0.8)' : '1px solid rgba(70, 130, 180, 0.2)',
                                borderRadius: '4px',
                                color: currentPage === i ? '#e8eef5' : '#93c5fd',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: currentPage === i ? '700' : '600',
                              }}
                            >
                              {i}
                            </button>
                          );
                        }
                        return pageButtons;
                      })()}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 10px',
                          background: currentPage === totalPages ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: currentPage === totalPages ? '#6b7280' : '#93c5fd',
                          cursor: currentPage === totalPages ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ▶
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 10px',
                          background: currentPage === totalPages ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: currentPage === totalPages ? '#6b7280' : '#93c5fd',
                          cursor: currentPage === totalPages ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ▶▶
                      </button>

                      <span style={{ fontSize: '12px', color: '#b8c5d6', marginLeft: '12px' }}>
                        {currentPage} / {totalPages}
                      </span>
                    </div>
                  )}
                </div>

                {/* 테이블 */}
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ ...styles.tableHeader, background: 'rgba(55, 65, 81, 0.9)' }}>
                        <th style={styles.thLeft}>매장명</th>
                        <th style={styles.th}>작업계정</th>
                        <th style={styles.th}>일발행/총발행</th>
                        <th style={styles.th}>리뷰</th>
                        <th style={styles.th}>이미지</th>
                        <th style={styles.th}>리뷰상세확인</th>
                        <th style={styles.th}>작업일</th>
                        <th style={styles.th}>로그</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTasks.map((task) => (
                        <tr key={task.id} style={styles.tableRow}>
                          <td style={styles.tdLeft}>
                            <div style={styles.taskName}>{stores.find(s => s.id === task.store_id)?.store_name || '미지정'}</div>
                            {task.notes && <div style={styles.notes}>{task.notes}</div>}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.accountBadge}>{getWorkAccount(task)}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.scheduleInfo}>
                              {task.store?.daily_frequency || '-'}회 / {task.store?.total_count || '-'}회
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor: task.review_status === 'completed' ? '#059669' :
                                  task.review_status === 'failed' ? '#ef4444' : '#8b5cf6',
                              }}
                            >
                              {task.review_status === 'completed' ? '✅ 완료' :
                                task.review_status === 'failed' ? '❌ 실패' : '⏹️ 대기'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor: task.image_status === 'completed' ? '#059669' :
                                  task.image_status === 'failed' ? '#ef4444' : '#8b5cf6',
                              }}
                            >
                              {task.image_status === 'completed' ? '✅ 완료' :
                                task.image_status === 'failed' ? '❌ 실패' : '⏹️ 대기'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {task.review_share_link ? (
                              <a
                                href={task.review_share_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  display: 'inline-block',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = 'transparent';
                                }}
                              >
                                리뷰보기 ↗
                              </a>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.dateText}>
                              {new Date(task.created_at).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleViewLogs(task)}
                              style={styles.logButton}
                            >
                              보기
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleExtractLink(task)}
                                style={{
                                  ...styles.extractButton,
                                  opacity: extractingTaskId === task.id ? 0.6 : 1,
                                  cursor: extractingTaskId === task.id ? 'not-allowed' : 'pointer',
                                }}
                                disabled={extractingTaskId === task.id}
                              >
                                {extractingTaskId === task.id ? '추출 중...' : '링크 추출'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </>
      )}

      {/* 로그 모달 */}
      {showLogModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLogModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>작업 로그</h2>
              <button
                onClick={() => setShowLogModal(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              {logLoading ? (
                <div style={{ textAlign: 'center', color: '#d1d5db', padding: '20px' }}>
                  로딩 중...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#d1d5db', padding: '20px' }}>
                  로그가 없습니다.
                </div>
              ) : (
                <div style={styles.logList}>
                  {logs.map((log, index) => (
                    <div key={index} style={styles.logItem}>
                      <div style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                      </div>
                      <div
                        style={{
                          ...styles.logMessage,
                          color: log.log_level === 'ERROR' ? '#ef4444' :
                            log.log_level === 'WARN' ? '#f59e0b' :
                            log.log_level === 'INFO' ? '#3b82f6' : '#8b96a8',
                        }}
                      >
                        [{log.log_level}] {log.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

const styles = {
  container: {
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(15, 20, 25, 0.9) 0%, rgba(20, 30, 48, 0.8) 100%)',
    borderRadius: '12px',
  },

  header: {
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
  },

  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    lineHeight: '1.2',
    letterSpacing: '-0.5px',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },

  subtitle: {
    fontSize: '14px',
    color: '#d1d5db',
    margin: '0',
  },

  filterSection: {
    background: 'linear-gradient(135deg, rgba(20, 35, 55, 0.7) 0%, rgba(30, 50, 80, 0.6) 100%)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },

  filterRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  label: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e5e7eb',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  select: {
    padding: '8px 12px',
    background: 'rgba(30, 50, 80, 0.6)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '6px',
    color: '#e8eef5',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  searchInput: {
    padding: '8px 12px',
    background: 'rgba(30, 50, 80, 0.6)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '6px',
    color: '#e8eef5',
    fontSize: '16px',
    minWidth: '200px',
    transition: 'all 0.2s ease',
  },

  dateInput: {
    padding: '8px 12px',
    background: 'rgba(30, 50, 80, 0.6)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '6px',
    color: '#e8eef5',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },

  resetButton: {
    padding: '8px 16px',
    background: 'rgba(70, 130, 180, 0.15)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '6px',
    color: '#d1d5db',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '15px',
    transition: 'all 0.2s ease',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },

  statCard: {
    background: 'linear-gradient(135deg, rgba(20, 35, 55, 0.7) 0%, rgba(30, 50, 80, 0.6) 100%)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '12px',
    padding: '20px',
  },

  statLabel: {
    fontSize: '18px',
    color: '#e5e7eb',
    marginBottom: '12px',
    fontWeight: '500',
  },

  statValue: {
    fontSize: '45px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },

  statDescription: {
    fontSize: '15px',
    color: '#d1d5db',
  },

  tableWrapper: {
    overflowX: 'auto',
    background: 'rgba(20, 40, 70, 0.35)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '12px',
    padding: '12px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px',
  },

  tableHeader: {
    backgroundColor: 'rgba(30, 50, 80, 0.6)',
    borderBottom: '2px solid rgba(70, 130, 180, 0.2)',
  },

  th: {
    padding: '16px 12px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
    color: '#e5e7eb',
    whiteSpace: 'nowrap',
  },

  thLeft: {
    padding: '16px 12px',
    textAlign: 'left',
    fontSize: '16px',
    fontWeight: '600',
    color: '#e5e7eb',
    whiteSpace: 'nowrap',
  },

  tableRow: {
    borderBottom: '1px solid rgba(70, 130, 180, 0.1)',
    transition: 'background-color 0.2s ease',
  },

  td: {
    padding: '14px 12px',
    fontSize: '16px',
    color: '#e5e7eb',
    verticalAlign: 'middle',
    textAlign: 'center',
  },

  tdLeft: {
    padding: '14px 12px',
    fontSize: '16px',
    color: '#e5e7eb',
    verticalAlign: 'middle',
    textAlign: 'left',
  },

  taskName: {
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '4px',
  },

  notes: {
    fontSize: '14px',
    color: '#d1d5db',
    marginTop: '4px',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  accountBadge: {
    display: 'inline-block',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '15px',
    fontWeight: '500',
  },

  scheduleInfo: {
    display: 'inline-block',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    color: '#a855f7',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '15px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },

  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  },

  dateText: {
    fontSize: '15px',
    color: '#d1d5db',
    whiteSpace: 'nowrap',
  },

  logButton: {
    padding: '6px 12px',
    background: 'rgba(70, 130, 180, 0.15)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '6px',
    color: '#a78bfa',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },

  extractButton: {
    padding: '6px 12px',
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: '6px',
    color: '#86efac',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    marginLeft: '8px',
  },

  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
    color: '#d1d5db',
  },

  accessDenied: {
    padding: '32px',
    textAlign: 'center',
  },

  // 모달 스타일
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  modal: {
    background: 'linear-gradient(135deg, rgba(20, 35, 55, 0.99) 0%, rgba(30, 50, 80, 0.95) 100%)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
  },

  modalTitle: {
    fontSize: '23px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },

  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#d1d5db',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },

  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },

  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  logItem: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(70, 130, 180, 0.1)',
    borderRadius: '6px',
    padding: '12px',
  },

  logTime: {
    fontSize: '14px',
    color: '#8b96a8',
    marginBottom: '4px',
    fontWeight: '500',
  },

  logMessage: {
    fontSize: '15px',
    lineHeight: '1.4',
    fontFamily: 'monospace',
  },
};
