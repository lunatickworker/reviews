import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { storeApi, taskApi, scheduleApi } from '../utils/api';
import { FiPlus } from 'react-icons/fi';
import * as XLSX from 'xlsx';

/**
 * 통합 워크플로우 모듈
 * 매장 관리, 배포 예약, 작업 실행이 한 곳에서
 */
const PublishWorkflow = () => {
  const { token, isAdmin, isAgency } = useAuth();
  const isInitialLoad = useRef(true);
  const [stores, setStores] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, store, task, schedule
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 모달 상태
  const [showAddStore, setShowAddStore] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [editingStoreId, setEditingStoreId] = useState(null);

  // 폼 데이터
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    address: '',
    reviewMessage: '',
    imageUrls: '',
    dailyFrequency: 1,
    totalCount: 1,
  });

  const [scheduleForm, setScheduleForm] = useState({
    dailyFrequency: 1,
    totalCount: 1,
  });

  // 작업 탭 필터
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all'); // all, pending, in_progress, completed
  // 마지막 배포 날짜
  const [lastDeploymentDate] = useState({});
  

  // Helper 함수: 작업의 진행 상태를 동적으로 판단
  const isTaskInProgress = (task) => {
    const totalCount = task.total_count || task.store?.total_count || 0;
    const completedCount = task.completed_count || 0;
    return totalCount !== completedCount;
  };

  // Helper 함수: 표시할 상태 결정
  const getTaskDisplayStatus = (task) => {
    return isTaskInProgress(task) ? 'in_progress' : 'completed';
  };

  // 작업 리스트에 표시할 task 필터링
  const getDisplayTasks = () => {
    return tasks.filter((task) => {
      // 진행 중인 task만 표시
      return isTaskInProgress(task);
    });
  };

  const displayTasks = getDisplayTasks();

  const loadData = useCallback(async () => {
    try {
      // 초기 로드일 때만 로딩 표시 (깜박임 제거)
      if (isInitialLoad.current) {
        setLoading(true);
      }
      const [storesData, tasksData] = await Promise.all([
        storeApi.getAll(token),
        taskApi.getAll(token),
      ]);
      setStores(storesData || []);
      setTasks(tasksData || []);
      
      // 초기 로드 완료 표시
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        setLoading(false);
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      if (isInitialLoad.current) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10초마다 새로고침
    return () => clearInterval(interval);
  }, [loadData]);

  // 매장 추가/편집
  const handleAddStore = async () => {
    try {
      if (!storeForm.storeName.trim()) {
        setError('매장명을 입력하세요.');
        return;
      }
      if (!storeForm.address.trim()) {
        setError('매장 주소(Google Maps URL)를 입력하세요.');
        return;
      }

      const imageUrls = storeForm.imageUrls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (editingStoreId) {
        // 편집 모드
        await storeApi.update(
          editingStoreId,
          storeForm.storeName.trim(),
          storeForm.address.trim(),
          storeForm.reviewMessage.trim(),
          imageUrls,
          parseInt(storeForm.dailyFrequency) || 1,
          parseInt(storeForm.totalCount) || 1,
          token
        );
        setSuccessMessage('✅ 매장이 수정되었습니다.');
        setEditingStoreId(null);
      } else {
        // 추가 모드
        await storeApi.create(
          storeForm.storeName.trim(),
          storeForm.address.trim(),
          storeForm.reviewMessage.trim(),
          imageUrls,
          parseInt(storeForm.dailyFrequency) || 1,
          parseInt(storeForm.totalCount) || 1,
          token
        );
        setSuccessMessage('✅ 매장이 등록되었습니다.');
      }

      setStoreForm({
        storeName: '',
        address: '',
        reviewMessage: '',
        imageUrls: '',
        dailyFrequency: 1,
        totalCount: 1,
      });
      setShowAddStore(false);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || '매장 등록 실패');
    }
  };

  // 매장 편집 시작
  const handleEditStore = (store) => {
    setEditingStoreId(store.id);
    setStoreForm({
      storeName: store.store_name,
      address: store.address || '',
      reviewMessage: store.review_message || '',
      imageUrls: (store.image_urls || []).join('\n'),
      dailyFrequency: store.daily_frequency || 1,
      totalCount: store.total_count || 1,
    });
    setShowAddStore(true);
  };

  // 배포 스케줄 생성
  const handleSchedulePublish = async () => {
    try {
      if (!selectedStore) return;
      if (scheduleForm.totalCount < scheduleForm.dailyFrequency) {
        setError('총 발행 횟수는 일발행 횟수 이상이어야 합니다.');
        return;
      }

      await scheduleApi.create(
        selectedStore.id,
        scheduleForm.dailyFrequency,
        scheduleForm.totalCount,
        token
      );

      setSuccessMessage(`✅ 매장 "${selectedStore.store_name}"에 대한 배포가 예약되었습니다.`);
      setShowSchedule(false);
      setSelectedStore(null);
      setScheduleForm({ dailyFrequency: 1, totalCount: 1 });
      await loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || '배포 예약 실패');
    }
  };

  // 매장 삭제
  const handleDeleteStore = async (storeId) => {
    if (!window.confirm('이 매장을 삭제하시겠습니까?')) return;
    try {
      await storeApi.delete(storeId, token);
      setSuccessMessage('✅ 매장이 삭제되었습니다.');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('매장 삭제 실패');
    }
  };

  // 엑셀 다운로드
  const downloadExcel = () => {
    const template = [
      {
        매장명: '매장 이름',
        매장주소: 'https://maps.app.goo.gl/...',
        리뷰메세지: '리뷰 내용',
        이미지주소: 'https://example.com/image1.jpg|https://example.com/image2.jpg',
        하루횟수: 1,
        총횟수: 10,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, '매장등록_템플릿.xlsx');
  };

  // 엑셀 업로드
  const handleExcelUpload = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoading(true);
      setError('');
      setSuccessMessage('');

      // 파일 읽기
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        setError('업로드된 파일에 데이터가 없습니다.');
        setLoading(false);
        return;
      }

      // 데이터 유효성 검증 및 처리
      let successCount = 0;
      let failureCount = 0;
      const failedRows = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const storeName = row.매장명?.trim();
          const address = row.매장주소?.trim();
          const reviewMessage = row.리뷰메세지?.trim() || '';
          const imageUrlsStr = row.이미지주소?.trim() || '';
          const dailyFrequency = parseInt(row.하루횟수) || 1;
          const totalCount = parseInt(row.총횟수) || 1;

          // 필수 필드 검증
          if (!storeName) {
            failureCount++;
            failedRows.push(`${i + 2}행: 매장명 누락`);
            continue;
          }

          if (!address) {
            failureCount++;
            failedRows.push(`${i + 2}행: 매장주소 누락`);
            continue;
          }

          // 이미지 URL 파싱 (| 로 구분)
          const imageUrls = imageUrlsStr
            .split('|')
            .map((url) => url.trim())
            .filter((url) => url.length > 0 && url.startsWith('http'));

          // 매장 생성
          await storeApi.create(
            storeName,
            address,
            reviewMessage,
            imageUrls,
            dailyFrequency,
            totalCount,
            token
          );

          successCount++;
        } catch (err) {
          failureCount++;
          failedRows.push(`${i + 2}행: ${err.message || '오류 발생'}`);
        }
      }

      // 결과 메시지
      if (failureCount === 0) {
        setSuccessMessage(`✅ ${successCount}개 매장이 성공적으로 등록되었습니다.`);
      } else {
        setSuccessMessage(`✅ ${successCount}개 등록됨, ❌ ${failureCount}개 실패`);
        if (failedRows.length > 0) {
          setError(`실패 내용:\n${failedRows.join('\n')}`);
        }
      }

      // 데이터 새로고침
      await loadData();

      // 파일 입력 초기화
      event.target.value = '';

      setTimeout(() => {
        setSuccessMessage('');
        setError('');
      }, 5000);
    } catch (err) {
      setError(`파일 업로드 오류: ${err.message}`);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // 모달 닫기 (상태 초기화)
  const closeAddStoreModal = () => {
    setShowAddStore(false);
    setEditingStoreId(null);
    setStoreForm({
      storeName: '',
      address: '',
      reviewMessage: '',
      imageUrls: '',
      dailyFrequency: 1,
      totalCount: 1,
    });
  };

  const styles = {
    container: {
      background: 'linear-gradient(135deg, rgba(12, 20, 35, 0.99) 0%, rgba(20, 35, 55, 0.99) 100%)',
      minHeight: '100vh',
      padding: '24px',
      color: '#e8eef5',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
    },
    tabBar: {
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      borderBottom: '1px solid rgba(70, 130, 180, 0.1)',
      overflow: 'auto',
    },
    tab: {
      padding: '12px 20px',
      background: 'transparent',
      border: 'none',
      color: '#b8c5d6',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      borderBottom: '2px solid transparent',
      transition: 'all 0.3s ease',
    },
    activeTab: {
      color: '#4682b4',
      borderBottomColor: '#4682b4',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '16px',
    },
    th: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
      fontSize: '12px',
      fontWeight: '600',
      color: '#b8c5d6',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid rgba(70, 130, 180, 0.1)',
      fontSize: '14px',
      color: '#e8eef5',
    },
    thCenter: {
      padding: '12px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
      fontSize: '12px',
      fontWeight: '600',
      color: '#b8c5d6',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    tdCenter: {
      padding: '12px',
      borderBottom: '1px solid rgba(70, 130, 180, 0.1)',
      fontSize: '14px',
      color: '#e8eef5',
      textAlign: 'center',
    },
  };

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={styles.header}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700' }}>
              배포 워크플로우
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setEditingStoreId(null);
                setStoreForm({
                  storeName: '',
                  address: '',
                  reviewMessage: '',
                  imageUrls: '',
                  dailyFrequency: 1,
                  totalCount: 1,
                });
                setShowAddStore(true);
              }}
              style={{
                background: 'rgba(168, 85, 247, 0.9)',
                border: 'none',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FiPlus size={16} /> 매장 추가
            </button>
            <button
              onClick={downloadExcel}
              style={{
                background: 'rgba(59, 130, 246, 0.9)',
                border: 'none',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
              }}
            >
              📥 템플릿
            </button>
            <label
              style={{
                background: 'rgba(34, 197, 94, 0.9)',
                border: 'none',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'inline-block',
              }}
            >
              📤 업로드
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {/* 메시지 */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#fca5a5',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error}
          </div>
        )}
        {successMessage && (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#86efac',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {successMessage}
          </div>
        )}

        {/* 탭 */}
        <div style={styles.tabBar}>
          {['overview', 'store', 'task', ...(isAdmin ? ['schedule'] : [])].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.activeTab : {}),
              }}
            >
              {tab === 'overview' && '📊 개요'}
              {tab === 'store' && '🏪 매장'}
              {tab === 'task' && '📋 작업'}
              {tab === 'schedule' && '📅 스케줄'}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#b8c5d6' }}>
            로드 중...
          </div>
        ) : (
          <>
            {/* 개요 탭 */}
            {activeTab === 'overview' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '20px',
                }}
              >
                {/* 등록된 매장 - 파란색 */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(70, 130, 180, 0.16) 0%, rgba(70, 130, 180, 0.08) 100%)',
                  padding: '36px 32px',
                  borderRadius: '16px',
                  border: '1px solid rgba(70, 130, 180, 0.3)',
                  boxShadow: '0 12px 32px rgba(70, 130, 180, 0.12)',
                  transition: 'all 0.3s ease',
                  minHeight: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#6ca3d4', letterSpacing: '0.5px' }}>등록된 매장</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <span style={{ fontSize: '56px', fontWeight: '700', color: '#4682b4', lineHeight: '1' }}>{stores.length}</span>
                    <span style={{ fontSize: '14px', color: '#5b99c9', fontWeight: '500', marginBottom: '6px' }}>곳</span>
                  </div>
                </div>
                
                {/* 진행 중인 작업 - 시안색 */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(64, 135, 145, 0.16) 0%, rgba(64, 135, 145, 0.08) 100%)',
                  padding: '36px 32px',
                  borderRadius: '16px',
                  border: '1px solid rgba(64, 135, 145, 0.3)',
                  boxShadow: '0 12px 32px rgba(64, 135, 145, 0.12)',
                  transition: 'all 0.3s ease',
                  minHeight: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#5ba8c5', letterSpacing: '0.5px' }}>진행 중인 작업</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <span style={{ fontSize: '56px', fontWeight: '700', color: '#4a8fa8', lineHeight: '1' }}>
                      {displayTasks.length}
                    </span>
                    <span style={{ fontSize: '14px', color: '#5b99c9', fontWeight: '500', marginBottom: '6px' }}>건</span>
                  </div>
                </div>
                
                {/* 완료된 작업 - 라벤더색 */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(92, 84, 165, 0.16) 0%, rgba(92, 84, 165, 0.08) 100%)',
                  padding: '36px 32px',
                  borderRadius: '16px',
                  border: '1px solid rgba(92, 84, 165, 0.3)',
                  boxShadow: '0 12px 32px rgba(92, 84, 165, 0.12)',
                  transition: 'all 0.3s ease',
                  minHeight: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#8077c4', letterSpacing: '0.5px' }}>완료된 작업</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                    <span style={{ fontSize: '56px', fontWeight: '700', color: '#5c54a5', lineHeight: '1' }}>
                      {tasks.length - displayTasks.length}
                    </span>
                    <span style={{ fontSize: '14px', color: '#5b99c9', fontWeight: '500', marginBottom: '6px' }}>건</span>
                  </div>
                </div>
              </div>
            )}

            {/* 매장 탭 */}
            {activeTab === 'store' && (
              <div style={{ background: 'rgba(20, 40, 70, 0.35)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(70, 130, 180, 0.2)' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 50, 80, 0.6)' }}>
                      <th style={styles.th}>매장명</th>
                      <th style={styles.thCenter}>주소</th>
                      <th style={styles.thCenter}>리뷰</th>
                      <th style={styles.thCenter}>이미지</th>
                      <th style={styles.thCenter}>하루/총</th>
                      <th style={styles.thCenter}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: '#b8c5d6' }}>
                          등록된 매장이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      stores.map((store) => (
                        <tr key={store.id}>
                          <td style={styles.td}>
                            <strong>{store.store_name}</strong>
                          </td>
                          <td style={styles.tdCenter}>
                            {store.address ? (
                              <a
                                href={store.address}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px' }}
                              >
                                {store.address.substring(0, 25)}...
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={styles.tdCenter}>{store.review_message?.substring(0, 15) || '-'}</td>
                          <td style={styles.tdCenter}>
                            {store.image_urls?.length ? (
                              <div style={{ fontSize: '12px' }}>
                                {store.image_urls.length}개
                                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                  {store.image_urls.slice(0, 2).map((url, idx) => (
                                    <div key={idx} style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {url.substring(0, 20)}...
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={styles.tdCenter}>
                            <strong>{store.daily_frequency || 1}</strong> / <strong>{store.total_count || 1}</strong>
                          </td>
                          <td style={styles.tdCenter}>
                            {(isAdmin || isAgency) && (
                              <>
                                <button
                                  onClick={() => handleEditStore(store)}
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    border: '1px solid rgba(59, 130, 246, 0.5)',
                                    color: '#93c5fd',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    marginRight: '4px',
                                  }}
                                >
                                  편집
                                </button>
                                <button
                                  onClick={() => handleDeleteStore(store.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    color: '#fca5a5',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                  }}
                                >
                                  삭제
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setSelectedStore(store);
                                  setShowSchedule(true);
                                }}
                                style={{
                                  background: 'rgba(34, 197, 94, 0.2)',
                                  border: '1px solid rgba(34, 197, 94, 0.5)',
                                  color: '#86efac',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  marginLeft: '4px',
                                }}
                              >
                                배포
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 작업 탭 */}
            {activeTab === 'task' && (
              <div style={{ background: 'rgba(20, 40, 70, 0.35)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(70, 130, 180, 0.2)' }}>
                {/* 작업 탭 헤더 */}
                <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(70, 130, 180, 0.2)', background: 'rgba(30, 50, 80, 0.4)' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#e8eef5' }}>작업 관리</h3>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#b8c5d6' }}>총 작업:</span>{' '}
                      <span style={{ color: '#e8eef5', fontWeight: '600' }}>{tasks.length}개</span>
                    </div>
                    <div>
                      <span style={{ color: '#b8c5d6' }}>진행 중:</span>{' '}
                      <span style={{ color: '#93c5fd', fontWeight: '600' }}>{displayTasks.length}개</span>
                    </div>
                    <div>
                      <span style={{ color: '#b8c5d6' }}>완료:</span>{' '}
                      <span style={{ color: '#86efac', fontWeight: '600' }}>{tasks.length - displayTasks.length}개</span>
                    </div>
                  </div>
                </div>

                {/* 검색 및 필터 */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '16px',
                  borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
                  flexWrap: 'wrap',
                }}>
                  <input
                    type="text"
                    placeholder="장소명으로 검색..."
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '8px 12px',
                      background: 'rgba(30, 50, 80, 0.6)',
                      border: '1px solid rgba(70, 130, 180, 0.2)',
                      borderRadius: '6px',
                      color: '#e8eef5',
                      fontSize: '13px',
                    }}
                  />
                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(30, 50, 80, 0.6)',
                      border: '1px solid rgba(70, 130, 180, 0.2)',
                      borderRadius: '6px',
                      color: '#e8eef5',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">모든 상태</option>
                    <option value="in_progress">진행 중</option>
                    <option value="completed">완료</option>
                  </select>
                  {(taskSearchTerm || taskStatusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setTaskSearchTerm('');
                        setTaskStatusFilter('all');
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: '#fca5a5',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      필터 초기화
                    </button>
                  )}
                </div>

                <table style={styles.table}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 50, 80, 0.6)' }}>
                      <th style={styles.th}>장소</th>
                      <th style={styles.thCenter}>리뷰</th>
                      <th style={styles.thCenter}>이미지</th>
                      <th style={styles.thCenter}>하루발행</th>
                      <th style={styles.thCenter}>총발행</th>
                      <th style={styles.thCenter}>현재발행수</th>
                      <th style={styles.thCenter}>상태</th>
                      <th style={styles.thCenter}>등록일</th>
                      <th style={styles.thCenter}>마지막 배포</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTasks
                      .filter((task) => {
                        // 상태 필터링
                        const displayStatus = getTaskDisplayStatus(task);
                        if (taskStatusFilter !== 'all' && displayStatus !== taskStatusFilter) {
                          return false;
                        }
                        // 검색어 필터링
                        if (taskSearchTerm && !task.place_name.toLowerCase().includes(taskSearchTerm.toLowerCase())) {
                          return false;
                        }
                        return true;
                      })
                      .length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: '#b8c5d6' }}>
                          {displayTasks.length === 0 ? '진행 중인 작업이 없습니다.' : '검색 결과가 없습니다.'}
                        </td>
                      </tr>
                    ) : (
                      displayTasks
                        .filter((task) => {
                          // 상태 필터링
                          const displayStatus = getTaskDisplayStatus(task);
                          if (taskStatusFilter !== 'all' && displayStatus !== taskStatusFilter) {
                            return false;
                          }
                          // 검색어 필터링
                          if (taskSearchTerm && !task.place_name.toLowerCase().includes(taskSearchTerm.toLowerCase())) {
                            return false;
                          }
                          return true;
                        })
                        .map((task) => {
                          const displayStatus = getTaskDisplayStatus(task);
                          return (
                            <tr key={task.id}>
                              <td style={styles.td}>{task.place_name}</td>
                              <td style={styles.tdCenter}>
                                <span
                                  style={{
                                    background:
                                      task.review_status === 'completed'
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : 'rgba(59, 130, 246, 0.2)',
                                    color:
                                      task.review_status === 'completed'
                                        ? '#86efac'
                                        : '#93c5fd',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                  }}
                                >
                                  {task.review_status === 'completed' ? '✓ 완료' : '◯ 진행'}
                                </span>
                              </td>
                              <td style={styles.tdCenter}>
                                <span
                                  style={{
                                    background:
                                      task.image_status === 'completed' || task.image_status === 'ready'
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : task.image_status === 'in_progress'
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : 'rgba(107, 114, 128, 0.2)',
                                    color:
                                      task.image_status === 'completed' || task.image_status === 'ready'
                                        ? '#86efac'
                                        : task.image_status === 'in_progress'
                                        ? '#93c5fd'
                                        : '#d1d5db',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                  }}
                                >
                                  {task.image_status === 'completed' || task.image_status === 'ready' ? '✓ 완료' : task.image_status === 'in_progress' ? '→ 진행중' : '✗ 대기중'}
                                </span>
                              </td>
                              <td style={styles.tdCenter}>
                                <span style={{ fontWeight: '600', color: '#4682b4' }}>
                                  {task.daily_frequency || task.store?.daily_frequency || '-'}
                                </span>
                              </td>
                              <td style={styles.tdCenter}>
                                <span style={{ fontWeight: '600', color: '#4682b4' }}>
                                  {task.total_count || task.store?.total_count || '-'}
                                </span>
                              </td>
                              <td style={styles.tdCenter}>
                                <span style={{ fontWeight: '600', color: '#4682b4', fontSize: '16px' }}>
                                  {task.completed_count || 0}
                                </span>
                              </td>
                              <td style={styles.tdCenter}>
                                <span
                                  style={{
                                    background:
                                      displayStatus === 'completed'
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : 'rgba(59, 130, 246, 0.2)',
                                    color:
                                      displayStatus === 'completed'
                                        ? '#86efac'
                                        : '#93c5fd',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                  }}
                                >
                                  {displayStatus === 'completed' ? '완료' : '진행 중'}
                                </span>
                              </td>
                              <td style={styles.tdCenter}>
                                {new Date(task.created_at).toLocaleDateString('ko-KR')}
                              </td>
                              <td style={styles.tdCenter}>
                                {lastDeploymentDate[task.id] ? (
                                  <span style={{ color: '#93c5fd', fontWeight: '600' }}>
                                    {new Date(lastDeploymentDate[task.id]).toLocaleDateString('ko-KR')}
                                  </span>
                                ) : (
                                  <span style={{ color: '#7a8a9e' }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* 매장 추가/편집 모달 */}
        {showAddStore && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              overflow: 'auto',
            }}
            onClick={() => closeAddStoreModal()}
          >
            <div
              style={{
                background: 'rgba(37, 45, 66, 0.95)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '550px',
                width: '90%',
                margin: '20px auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700' }}>
                {editingStoreId ? '매장 정보 수정' : '새 매장 등록'}
              </h2>

              {/* 매장명 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                  매장명 *
                </label>
                <input
                  type="text"
                  placeholder="매장명 입력"
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 주소 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                  주소 (Google Maps URL) *
                </label>
                <input
                  type="text"
                  placeholder="https://maps.app.goo.gl/..."
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 리뷰 메시지 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                  리뷰 메시지
                </label>
                <textarea
                  placeholder="리뷰 메시지 입력"
                  value={storeForm.reviewMessage}
                  onChange={(e) => setStoreForm({ ...storeForm, reviewMessage: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    minHeight: '70px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* 이미지 URL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                  이미지 URL (한 줄에 하나씩)
                </label>
                <textarea
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  value={storeForm.imageUrls}
                  onChange={(e) => setStoreForm({ ...storeForm, imageUrls: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    minHeight: '80px',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  현재: {storeForm.imageUrls.split('\n').filter((url) => url.trim().length > 0).length}개
                </div>
              </div>

              {/* 일발행/총발행 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                    하루 발행 횟수
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={storeForm.dailyFrequency}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, dailyFrequency: parseInt(e.target.value) || 1 })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      borderRadius: '6px',
                      color: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                    총 발행 횟수
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={storeForm.totalCount}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, totalCount: parseInt(e.target.value) || 1 })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      borderRadius: '6px',
                      color: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddStore}
                  style={{
                    flex: 1,
                    background: 'rgba(34, 197, 94, 0.9)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  {editingStoreId ? '수정 완료' : '등록'}
                </button>
                <button
                  onClick={() => closeAddStoreModal()}
                  style={{
                    flex: 1,
                    background: 'rgba(107, 114, 128, 0.3)',
                    border: '1px solid rgba(107, 114, 128, 0.5)',
                    color: '#b8c5d6',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 배포 예약 모달 - Admin만 */}
        {showSchedule && selectedStore && isAdmin && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowSchedule(false)}
          >
            <div
              style={{
                background: 'rgba(37, 45, 66, 0.95)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700' }}>
                배포 예약
              </h2>
              <p style={{ margin: '0 0 16px 0', color: '#b8c5d6', fontSize: '13px' }}>
                {selectedStore.store_name}
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                  하루 발행 횟수
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={scheduleForm.dailyFrequency}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, dailyFrequency: parseInt(e.target.value) || 1 })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                  총 발행 횟수
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={scheduleForm.totalCount}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, totalCount: parseInt(e.target.value) || 1 })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSchedulePublish}
                  style={{
                    flex: 1,
                    background: 'rgba(34, 197, 94, 0.9)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  배포 예약
                </button>
                <button
                  onClick={() => setShowSchedule(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(107, 114, 128, 0.3)',
                    border: '1px solid rgba(107, 114, 128, 0.5)',
                    color: '#b8c5d6',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishWorkflow;
