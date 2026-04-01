import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { storeApi, taskApi, mapApi } from '../utils/api';
import { FiPlus } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { PageLayout, Alert } from './common';

/**
 * 통합 워크플로우 모듈
 * 매장 관리, 배포 예약, 작업 실행이 한 곳에서
 */
const PublishWorkflow = () => {
  const { token, isAdmin, isAgency } = useAuth();
  const isInitialLoad = useRef(true);
  const [stores, setStores] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, store, task
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deployingStoreId, setDeployingStoreId] = useState(null);

  // 모달 상태
  const [showAddStore, setShowAddStore] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState(null);

  // 폼 데이터
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    address: '',
    reviewMessage: '',
    draftReviews: '',
    imageUrls: '',
    dailyFrequency: 1,
    totalCount: 1,
  });

  // 작업 탭 필터
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all'); // all, pending, in_progress, completed
  
  // 페이지네이션
  const [storeCurrentPage, setStoreCurrentPage] = useState(1);
  const [taskCurrentPage, setTaskCurrentPage] = useState(1);
  const [storeItemsPerPage, setStoreItemsPerPage] = useState(10);
  const [taskItemsPerPage, setTaskItemsPerPage] = useState(10);

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
    return tasks
      .filter((task) => {
        // 진행 중인 task만 표시
        return isTaskInProgress(task);
      })
      .map((task) => {
        // 각 task에 store 정보 추가
        const store = stores.find(s => s.id === task.store_id);
        return {
          ...task,
          store: store || { store_name: task.place_name }
        };
      });
  };

  const displayTasks = getDisplayTasks();

  // 매장별 마지막 발행일시 구하기
  const getLastDeploymentDate = (storeId) => {
    const storeTasks = tasks.filter(t => t.store_id === storeId);
    if (storeTasks.length === 0) return null;
    
    // 가장 최근 updated_at 찾기
    const lastTask = storeTasks.reduce((latest, current) => {
      const latestTime = new Date(latest.updated_at || latest.created_at).getTime();
      const currentTime = new Date(current.updated_at || current.created_at).getTime();
      return currentTime > latestTime ? current : latest;
    });
    
    return lastTask.updated_at || lastTask.created_at;
  };

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
          token,
          storeForm.draftReviews.trim()
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
          token,
          storeForm.draftReviews.trim()
        );
        setSuccessMessage('✅ 매장이 등록되었습니다.');
      }

      setStoreForm({
        storeName: '',
        address: '',
        reviewMessage: '',
        draftReviews: '',
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
      draftReviews: store.draft_reviews || '',
      imageUrls: (store.image_urls || []).join('\n'),
      dailyFrequency: store.daily_frequency || 1,
      totalCount: store.total_count || 1,
    });
    setShowAddStore(true);
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

  // 매장 배포
  const handleDeployStore = async (store) => {
    if (!window.confirm(`${store.store_name}을(를) 배포하시겠습니까?`)) {
      return;
    }

    setDeployingStoreId(store.id);
    setError('');
    
    try {
      await mapApi.automateMap(
        store.address,
        store.review_message || '',
        store.id,
        store.total_count || 1,
        token
      );

      setSuccessMessage(`✅ ${store.store_name} 배포가 시작되었습니다.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`배포 실패: ${err.message}`);
      console.error(err);
    } finally {
      setDeployingStoreId(null);
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
      draftReviews: '',
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
      padding: '10px 16px',
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
      borderBottom: '2px solid #4682b4',
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
    <PageLayout 
      title="배포 워크플로우" 
      description={`등록된 매장: ${stores.length}개 | 진행 중인 작업: ${displayTasks.length}개`}
      actions={
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
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
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
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
            }}
          >
            📥 템플릿
          </button>
          <label
            style={{
              background: 'rgba(34, 197, 94, 0.9)',
              border: 'none',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px',
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
      }
    >

        {/* 탭 */}
        <div style={{ ...styles.tabBar, marginBottom: '16px' }}>
          {['overview', 'store', 'task'].map((tab) => (
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
                  gap: '16px',
                }}
              >
                {/* 등록된 매장 - 파란색 */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(70, 130, 180, 0.16) 0%, rgba(70, 130, 180, 0.08) 100%)',
                  padding: '28px 24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(70, 130, 180, 0.3)',
                  boxShadow: '0 12px 32px rgba(70, 130, 180, 0.12)',
                  transition: 'all 0.3s ease',
                  minHeight: '120px',
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
                  padding: '28px 24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(64, 135, 145, 0.3)',
                  boxShadow: '0 12px 32px rgba(64, 135, 145, 0.12)',
                  transition: 'all 0.3s ease',
                  minHeight: '120px',
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
                  padding: '28px 24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(92, 84, 165, 0.3)',
                  boxShadow: '0 12px 32px rgba(92, 84, 165, 0.12)',
                  transition: 'all 0.3s ease',
                  minHeight: '120px',
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
                      {isAdmin && <th style={styles.th}>소속</th>}
                      <th style={styles.th}>매장명</th>
                      <th style={styles.thCenter}>주소</th>
                      <th style={styles.thCenter}>리뷰</th>
                      <th style={styles.thCenter}>이미지</th>
                      <th style={styles.thCenter}>발행 (일/총/현재)</th>
                      <th style={styles.thCenter}>등록일</th>
                      <th style={styles.thCenter}>마지막 발행일시</th>
                      <th style={styles.thCenter}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? "9" : "8"} style={{ ...styles.td, textAlign: 'center', color: '#b8c5d6' }}>
                          등록된 매장이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const startIndex = (storeCurrentPage - 1) * storeItemsPerPage;
                        const endIndex = startIndex + storeItemsPerPage;
                        const paginatedStores = stores.slice(startIndex, endIndex);
                        
                        return paginatedStores.map((store) => (
                          <tr key={store.id}>
                            {isAdmin && (
                              <td style={styles.td}>
                                <span style={{ fontSize: '12px', color: '#a0aec0' }}>
                                  {store.user?.user_id || '-'}
                                </span>
                              </td>
                            )}
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
                            <span style={{ color: '#4682b4', fontWeight: '600' }}>{store.daily_frequency || 1}</span>
                            <span style={{ color: '#9ca3af' }}> / </span>
                            <span style={{ color: '#48bb78', fontWeight: '600' }}>{store.total_count || 1}</span>
                            <span style={{ color: '#9ca3af' }}> / </span>
                            <span style={{ color: '#f56565', fontWeight: '600' }}>{store.deployed_count || 0}</span>
                          </td>
                          <td style={styles.tdCenter}>
                            {store.created_at ? new Date(store.created_at).toLocaleDateString('ko-KR') : '-'}
                          </td>
                          <td style={styles.tdCenter}>
                            {getLastDeploymentDate(store.id) ? (
                              <div style={{ fontSize: '12px' }}>
                                {new Date(getLastDeploymentDate(store.id)).toLocaleDateString('ko-KR')}
                                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                  {new Date(getLastDeploymentDate(store.id)).toLocaleTimeString('ko-KR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
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
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeployStore(store)}
                                    disabled={deployingStoreId === store.id}
                                    style={{
                                      background: deployingStoreId === store.id 
                                        ? 'rgba(107, 114, 128, 0.4)' 
                                        : 'rgba(34, 197, 94, 0.2)',
                                      border: '1px solid rgba(34, 197, 94, 0.5)',
                                      color: deployingStoreId === store.id ? '#9ca3af' : '#86efac',
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      cursor: deployingStoreId === store.id ? 'not-allowed' : 'pointer',
                                      fontSize: '12px',
                                      marginRight: '4px',
                                      opacity: deployingStoreId === store.id ? 0.6 : 1,
                                      transition: 'all 0.3s ease',
                                    }}
                                  >
                                    {deployingStoreId === store.id ? '배포 중...' : '🚀 배포'}
                                  </button>
                                )}
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
                          </td>
                        </tr>
                      ));
                      })()
                    )}
                  </tbody>
                </table>

                {/* 매장 탭 페이지네이션 */}
                {stores.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: 'rgba(20, 40, 70, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#b8c5d6' }}>페이지당: </label>
                      <select
                        value={storeItemsPerPage}
                        onChange={(e) => {
                          setStoreItemsPerPage(Number(e.target.value));
                          setStoreCurrentPage(1);
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

                    {stores.length > storeItemsPerPage && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: '8px'
                      }}>
                        <button
                          onClick={() => setStoreCurrentPage(1)}
                          disabled={storeCurrentPage === 1}
                          style={{
                            padding: '6px 10px',
                            background: storeCurrentPage === 1 ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '4px',
                            color: storeCurrentPage === 1 ? '#6b7280' : '#93c5fd',
                            cursor: storeCurrentPage === 1 ? 'default' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          ◀◀
                        </button>
                        
                        <button
                          onClick={() => setStoreCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={storeCurrentPage === 1}
                          style={{
                            padding: '6px 10px',
                            background: storeCurrentPage === 1 ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '4px',
                            color: storeCurrentPage === 1 ? '#6b7280' : '#93c5fd',
                            cursor: storeCurrentPage === 1 ? 'default' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          ◀
                        </button>

                        {(() => {
                          const totalPages = Math.ceil(stores.length / storeItemsPerPage);
                          const pageButtons = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(1, storeCurrentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pageButtons.push(
                              <button
                                key={i}
                                onClick={() => setStoreCurrentPage(i)}
                                style={{
                                  padding: '6px 10px',
                                  background: storeCurrentPage === i ? 'rgba(99, 102, 241, 0.6)' : 'rgba(30, 50, 80, 0.6)',
                                  border: storeCurrentPage === i ? '1px solid rgba(99, 102, 241, 0.8)' : '1px solid rgba(70, 130, 180, 0.2)',
                                  borderRadius: '4px',
                                  color: storeCurrentPage === i ? '#e8eef5' : '#93c5fd',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: storeCurrentPage === i ? '700' : '600',
                                }}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pageButtons;
                        })()}

                        <button
                          onClick={() => setStoreCurrentPage(prev => Math.min(Math.ceil(stores.length / storeItemsPerPage), prev + 1))}
                          disabled={storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage)}
                          style={{
                            padding: '6px 10px',
                            background: storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage) ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '4px',
                            color: storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage) ? '#6b7280' : '#93c5fd',
                            cursor: storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage) ? 'default' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          ▶
                        </button>
                        
                        <button
                          onClick={() => setStoreCurrentPage(Math.ceil(stores.length / storeItemsPerPage))}
                          disabled={storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage)}
                          style={{
                            padding: '6px 10px',
                            background: storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage) ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '4px',
                            color: storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage) ? '#6b7280' : '#93c5fd',
                            cursor: storeCurrentPage === Math.ceil(stores.length / storeItemsPerPage) ? 'default' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          ▶▶
                        </button>

                        <span style={{ fontSize: '12px', color: '#b8c5d6', marginLeft: '12px' }}>
                          {storeCurrentPage} / {Math.ceil(stores.length / storeItemsPerPage)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 작업 탭 */}
            {activeTab === 'task' && (
              <div style={{ background: 'rgba(20, 40, 70, 0.35)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(70, 130, 180, 0.2)' }}>
                {/* 작업 탭 헤더 + 통계 + 검색/필터 (한줄) */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
                  background: 'rgba(30, 50, 80, 0.4)',
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  overflow: 'auto',
                }}>
                  {/* 제목 */}
                  <h3 style={{ margin: '0', fontSize: '14px', fontWeight: '700', color: '#e8eef5', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>작업 관리</h3>
                  
                  {/* 통계 */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', whiteSpace: 'nowrap', minWidth: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#b8c5d6' }}>총:</span>
                      <span style={{ color: '#e8eef5', fontWeight: '600' }}>{tasks.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#b8c5d6' }}>진행:</span>
                      <span style={{ color: '#93c5fd', fontWeight: '600' }}>{displayTasks.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#b8c5d6' }}>완료:</span>
                      <span style={{ color: '#86efac', fontWeight: '600' }}>{tasks.length - displayTasks.length}</span>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div style={{ width: '1px', height: '20px', background: 'rgba(70, 130, 180, 0.2)', minWidth: '1px' }}></div>

                  {/* 검색 */}
                  <input
                    type="text"
                    placeholder="매장명으로 검색..."
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    style={{
                      flex: '0 1 auto',
                      minWidth: '150px',
                      padding: '6px 10px',
                      background: 'rgba(30, 50, 80, 0.6)',
                      border: '1px solid rgba(70, 130, 180, 0.2)',
                      borderRadius: '6px',
                      color: '#e8eef5',
                      fontSize: '12px',
                    }}
                  />
                  
                  {/* 상태 필터 */}
                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(30, 50, 80, 0.6)',
                      border: '1px solid rgba(70, 130, 180, 0.2)',
                      borderRadius: '6px',
                      color: '#e8eef5',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <option value="all">모든 상태</option>
                    <option value="in_progress">진행 중</option>
                    <option value="completed">완료</option>
                  </select>
                  
                  {/* 초기화 버튼 */}
                  {(taskSearchTerm || taskStatusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setTaskSearchTerm('');
                        setTaskStatusFilter('all');
                        setTaskCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        color: '#fca5a5',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      초기화
                    </button>
                  )}
                </div>

                <table style={styles.table}>
                  <thead>
                    <tr style={{ background: 'rgba(30, 50, 80, 0.6)' }}>
                      {isAdmin && <th style={styles.th}>소속</th>}
                      <th style={styles.th}>매장명</th>
                      <th style={styles.thCenter}>리뷰</th>
                      <th style={styles.thCenter}>이미지</th>
                      <th style={styles.thCenter}>발행 (일/총/현재)</th>
                      <th style={styles.thCenter}>상태</th>
                      <th style={styles.thCenter}>등록일</th>
                      <th style={styles.thCenter}>마지막 발행일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredTasks = displayTasks.filter((task) => {
                        const displayStatus = getTaskDisplayStatus(task);
                        if (taskStatusFilter !== 'all' && displayStatus !== taskStatusFilter) {
                          return false;
                        }
                        if (taskSearchTerm && !(task.store?.store_name || task.place_name).toLowerCase().includes(taskSearchTerm.toLowerCase())) {
                          return false;
                        }
                        return true;
                      });

                      if (filteredTasks.length === 0) {
                        return (
                          <tr>
                            <td colSpan={isAdmin ? "8" : "7"} style={{ ...styles.td, textAlign: 'center', color: '#b8c5d6' }}>
                              {displayTasks.length === 0 ? '진행 중인 작업이 없습니다.' : '검색 결과가 없습니다.'}
                            </td>
                          </tr>
                        );
                      }

                      const startIndex = (taskCurrentPage - 1) * taskItemsPerPage;
                      const endIndex = startIndex + taskItemsPerPage;
                      const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

                      return paginatedTasks.map((task) => {
                        const displayStatus = getTaskDisplayStatus(task);
                        return (
                          <tr key={task.id}>
                            {isAdmin && (
                              <td style={styles.td}>
                                <span style={{ fontSize: '12px', color: '#a0aec0' }}>
                                  {task.store?.user?.user_id || '-'}
                                </span>
                              </td>
                            )}
                            <td style={styles.td}>
                              <strong>{task.store?.store_name || task.place_name}</strong>
                            </td>
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
                                <span style={{ color: '#4682b4', fontWeight: '600' }}>{task.daily_frequency || task.store?.daily_frequency || 1}</span>
                                <span style={{ color: '#9ca3af' }}> / </span>
                                <span style={{ color: '#48bb78', fontWeight: '600' }}>{task.total_count || task.store?.total_count || 1}</span>
                                <span style={{ color: '#9ca3af' }}> / </span>
                                <span style={{ color: '#f56565', fontWeight: '600' }}>{task.completed_count || 0}</span>
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
                                {task.updated_at || task.created_at ? (
                                  <div style={{ fontSize: '12px' }}>
                                    <div style={{ color: '#93c5fd', fontWeight: '600' }}>
                                      {new Date(task.updated_at || task.created_at).toLocaleDateString('ko-KR')}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                      {new Date(task.updated_at || task.created_at).toLocaleTimeString('ko-KR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        second: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#7a8a9e' }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>

                {/* 작업 탭 페이지네이션 */}
                {(() => {
                  const filteredTasks = displayTasks.filter((task) => {
                    const displayStatus = getTaskDisplayStatus(task);
                    if (taskStatusFilter !== 'all' && displayStatus !== taskStatusFilter) {
                      return false;
                    }
                    if (taskSearchTerm && !(task.store?.store_name || task.place_name).toLowerCase().includes(taskSearchTerm.toLowerCase())) {
                      return false;
                    }
                    return true;
                  });

                  if (filteredTasks.length === 0) return null;

                  const totalPages = Math.ceil(filteredTasks.length / taskItemsPerPage);
                  return (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      background: 'rgba(20, 40, 70, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', color: '#b8c5d6' }}>페이지당: </label>
                        <select
                          value={taskItemsPerPage}
                          onChange={(e) => {
                            setTaskItemsPerPage(Number(e.target.value));
                            setTaskCurrentPage(1);
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

                      {filteredTasks.length > taskItemsPerPage && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          gap: '8px'
                        }}>
                          <button
                        onClick={() => setTaskCurrentPage(1)}
                        disabled={taskCurrentPage === 1}
                        style={{
                          padding: '6px 10px',
                          background: taskCurrentPage === 1 ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: taskCurrentPage === 1 ? '#6b7280' : '#93c5fd',
                          cursor: taskCurrentPage === 1 ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ◀◀
                      </button>
                      
                      <button
                        onClick={() => setTaskCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={taskCurrentPage === 1}
                        style={{
                          padding: '6px 10px',
                          background: taskCurrentPage === 1 ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: taskCurrentPage === 1 ? '#6b7280' : '#93c5fd',
                          cursor: taskCurrentPage === 1 ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ◀
                      </button>

                      {(() => {
                        const pageButtons = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, taskCurrentPage - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                        
                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }
                        
                        for (let i = startPage; i <= endPage; i++) {
                          pageButtons.push(
                            <button
                              key={i}
                              onClick={() => setTaskCurrentPage(i)}
                              style={{
                                padding: '6px 10px',
                                background: taskCurrentPage === i ? 'rgba(99, 102, 241, 0.6)' : 'rgba(30, 50, 80, 0.6)',
                                border: taskCurrentPage === i ? '1px solid rgba(99, 102, 241, 0.8)' : '1px solid rgba(70, 130, 180, 0.2)',
                                borderRadius: '4px',
                                color: taskCurrentPage === i ? '#e8eef5' : '#93c5fd',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: taskCurrentPage === i ? '700' : '600',
                              }}
                            >
                              {i}
                            </button>
                          );
                        }
                        return pageButtons;
                      })()}

                      <button
                        onClick={() => setTaskCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={taskCurrentPage === totalPages}
                        style={{
                          padding: '6px 10px',
                          background: taskCurrentPage === totalPages ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: taskCurrentPage === totalPages ? '#6b7280' : '#93c5fd',
                          cursor: taskCurrentPage === totalPages ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ▶
                      </button>
                      
                      <button
                        onClick={() => setTaskCurrentPage(totalPages)}
                        disabled={taskCurrentPage === totalPages}
                        style={{
                          padding: '6px 10px',
                          background: taskCurrentPage === totalPages ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.3)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                          color: taskCurrentPage === totalPages ? '#6b7280' : '#93c5fd',
                          cursor: taskCurrentPage === totalPages ? 'default' : 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        ▶▶
                      </button>

                      <span style={{ fontSize: '12px', color: '#b8c5d6', marginLeft: '12px' }}>
                        {taskCurrentPage} / {totalPages}
                      </span>
                    </div>
                    )}
                    </div>
                  );
                })()}
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

              {/* 리뷰 가이드 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                  리뷰 가이드 (배포 시 AI가 참고)
                </label>
                <textarea
                  placeholder="예: 깔끔한 인테리어, 친절한 직원, 맛있는 음식"
                  value={storeForm.reviewMessage}
                  onChange={(e) => setStoreForm({ ...storeForm, reviewMessage: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    minHeight: '60px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* 원고 작성 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#b8c5d6' }}>
                    원고 작성 (직접 입력 또는 AI로 생성)
                  </label>
                  <button
                    onClick={async () => {
                      try {
                        const guidance = storeForm.reviewMessage || '좋은 매장입니다';
                        const response = await storeApi.generateReviews(guidance, 5, token);
                        if (response && response.reviews) {
                          const reviewText = response.reviews.map(r => r.content || r).join('\n');
                          setStoreForm({ ...storeForm, draftReviews: reviewText });
                          setSuccessMessage('✅ AI 리뷰가 생성되었습니다.');
                          setTimeout(() => setSuccessMessage(''), 2000);
                        }
                      } catch (err) {
                        setError('AI 리뷰 생성 실패: ' + err.message);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    🤖 AI 리뷰 생성
                  </button>
                </div>
                <textarea
                  placeholder="각 줄에 리뷰 입력 또는 AI가 생성합니다&#10;&#10;&#10;"
                  value={storeForm.draftReviews || ''}
                  onChange={(e) => setStoreForm({ ...storeForm, draftReviews: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(70, 130, 180, 0.3)',
                    borderRadius: '6px',
                    color: '#fff',
                    minHeight: '120px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                  }}
                />
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  💡 버튼을 클릭하면 리뷰 가이드를 기반으로 AI가 리뷰를 자동 생성합니다
                </div>
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

        {successMessage && (
          <Alert
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage('')}
            duration={3000}
          />
        )}

        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError('')}
            duration={3000}
          />
        )}
      </PageLayout>
    );
  };

export default PublishWorkflow;
