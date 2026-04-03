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
  const [isGeneratingReviews, setIsGeneratingReviews] = useState(false);

  // 폼 데이터
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    address: '',
    reviewMessage: '',
    draftReviews: '',
    dailyFrequency: 1,
    totalCount: 1,
  });
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]); // File objects

  const getSavedWorkAccount = () => {
    try { return localStorage.getItem('detectedWorkAccount') || ''; } catch (e) { return ''; }
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

  const detectReviewWorkAccount = () => {
    try {
      const el = findInFrames('.Af21Ie');
      console.log('🔍 findInFrames 결과:', el, el?.textContent);
      const value = el?.textContent?.trim();
      if (value) {
        console.log('✅ 파싱 성공:', value);
        try { localStorage.setItem('detectedWorkAccount', value); } catch (e) {}
        return value;
      } else {
        console.log('❌ element found 하지만 value 없음:', el);
      }
    } catch (e) {
      console.error('⚠️ detectReviewWorkAccount 에러:', e);
    }
    return null;
  };

  const [detectedWorkAccount, setDetectedWorkAccount] = useState(() => getSavedWorkAccount());

  const handleFilesSelected = (fileList) => {
    const files = Array.from(fileList || []);
    const allowed = files.slice(0, 2);
    const valid = [];
    for (const f of allowed) {
      if (f.size > 2 * 1024 * 1024) {
        setError('이미지 파일은 최대 2MB까지 업로드 가능합니다.');
        continue;
      }
      if (!f.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.');
        continue;
      }
      valid.push(f);
    }
    setSelectedImages(valid);
  };

  const handleUploadNow = async (storeId) => {
    if (!storeId) return;
    if (!selectedImages || selectedImages.length === 0) return;
    try {
      setError('');
      const resp = await storeApi.uploadImages(storeId, selectedImages, token);
      // update existing images list
      setExistingImageUrls(resp.store.image_urls || []);
      setSelectedImages([]);
      setSuccessMessage('이미지가 업로드되었습니다.');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      setError('이미지 업로드에 실패했습니다.');
    }
  };

  const removeSelectedImage = (index) => {
    const arr = [...selectedImages];
    arr.splice(index, 1);
    setSelectedImages(arr);
  };

  const downloadUrl = async (url, name) => {
    try {
      // Fetch the image as a blob so the download attribute works reliably
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('이미지 다운로드 실패: ' + res.statusText);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name || 'image';
      document.body.appendChild(a);
      a.click();
      a.remove();
      // revoke the object URL after a short delay to ensure the download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.error('다운로드 실패:', e);
      // fallback: open in new tab
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

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
        // 각 task에 store 정보 추가 (등록된 매장명이 우선이며, 파싱된 place_name 사용 금지)
        const store = stores.find(s => s.id === task.store_id);
        return {
          ...task,
          store: store || null
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

  useEffect(() => {
    if (!showAddStore) return;
    
    // 한 번 즉시 실행
    const parsed = detectReviewWorkAccount();
    console.log('⏱️ PublishWorkflow 폴링 시작, 첫 감지:', parsed);
    if (parsed) {
      setDetectedWorkAccount(parsed);
      try { localStorage.setItem('detectedWorkAccount', parsed); } catch (e) {}
    }
    
    // 자동 폴링: 500ms마다 재시도 (더 빠르게)
    const t1 = setInterval(() => {
      const value = detectReviewWorkAccount();
      if (value) {
        console.log('✅ 감지됨:', value);
        setDetectedWorkAccount(value);
        try { localStorage.setItem('detectedWorkAccount', value); } catch (e) {}
      }
    }, 500);
    
    return () => clearInterval(t1);
  }, [showAddStore]);

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
      if (!storeForm.draftReviews.trim()) {
        setError('원고를 작성해주세요.');
        return;
      }

      // 이미지 URL 입력 방식 제거: 이미지 업로드는 파일 업로드로 처리
      const imageUrls = [];

      if (editingStoreId) {
        // 편집 모드
        await storeApi.update(
          editingStoreId,
          storeForm.storeName.trim(),
          storeForm.address.trim(),
          storeForm.reviewMessage.trim(),
          existingImageUrls,
          parseInt(storeForm.dailyFrequency) || 1,
          parseInt(storeForm.totalCount) || 1,
          token,
          storeForm.draftReviews.trim()
        );
        // 이미지가 선택되어 있으면, 편집된 매장 ID로 업로드
        if (selectedImages && selectedImages.length > 0) {
          try {
            await handleUploadNow(editingStoreId);
          } catch (imgErr) {
            console.error('이미지 업로드 실패:', imgErr);
            setError('이미지 업로드에 실패했습니다. 매장은 수정되었습니다.');
          }
        }

        setSuccessMessage('✅ 매장이 수정되었습니다.');
        setEditingStoreId(null);
      } else {
        // 추가 모드
        const result = await storeApi.create(
          storeForm.storeName.trim(),
          storeForm.address.trim(),
          storeForm.reviewMessage.trim(),
          imageUrls,
          parseInt(storeForm.dailyFrequency) || 1,
          parseInt(storeForm.totalCount) || 1,
          token,
          storeForm.draftReviews.trim()
        );

        // 이미지가 선택되어 있으면, 생성된 매장 ID로 서버에 업로드
        if (selectedImages && selectedImages.length > 0) {
          try {
            await handleUploadNow(result.store.id);
          } catch (imgErr) {
            console.error('이미지 업로드 실패:', imgErr);
            // 이미지 업로드 실패는 매장 생성 성공을 막지 않음
            setError('이미지 업로드에 실패했습니다. 매장은 생성되었습니다.');
          }
        }

        setSuccessMessage('✅ 매장이 등록되었습니다.');
      }

      setStoreForm({
        storeName: '',
        address: '',
        reviewMessage: '',
        draftReviews: '',
        dailyFrequency: 1,
        totalCount: 1,
      });
      setSelectedImages([]);
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
      // image URLs are managed via `existingImageUrls`
      dailyFrequency: store.daily_frequency || 1,
      totalCount: store.total_count || 1,
    });
    setExistingImageUrls(store.image_urls || []);
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
    if (!store.draft_reviews?.trim()) {
      setError('원고가 없어서 배포할 수 없습니다. 원고를 작성해주세요.');
      return;
    }

    if (!window.confirm(`${store.store_name}을(를) 배포하시겠습니까?`)) {
      return;
    }

    setDeployingStoreId(store.id);
    setError('');
    
    try {
      const detectedWorkAccount = localStorage.getItem('detectedWorkAccount') || '';
      await mapApi.automateMap(
        store.address,
        store.draft_reviews,
        store.id,
        store.total_count || 1,
        token,
        detectedWorkAccount
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
        원고: '리뷰 원고\n원고2',
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
          const draftReviews = row.원고?.trim() || '';
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
            token,
            draftReviews
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
      dailyFrequency: 1,
      totalCount: 1,
    });
    setSelectedImages([]);
    setExistingImageUrls([]);
  };

  // CSS 애니메이션
  const spinnerStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

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
    <>
      <style>{spinnerStyle}</style>
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
                          <td style={styles.tdCenter}>{store.draft_reviews?.substring(0, 15) || '-'}</td>
                          <td style={styles.tdCenter}>
                            {store.image_urls?.length ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={store.image_urls[0]} alt="thumb" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }} onClick={() => downloadUrl(store.image_urls[0], `${store.store_name}-image.jpg`)} />
                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{store.image_urls.length}개</span>
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
                            <span style={{ color: '#f56565', fontWeight: '600' }}>{(store.deployed_count > 0) ? store.deployed_count : '-'}</span>
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
                        if (taskSearchTerm && !((task.store?.store_name || '').toLowerCase().includes(taskSearchTerm.toLowerCase()))) {
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
                              <strong>{task.store?.store_name || '미지정'}</strong>
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
                    if (taskSearchTerm && !((task.store?.store_name || '').toLowerCase().includes(taskSearchTerm.toLowerCase()))) {
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
                    disabled={isGeneratingReviews}
                    onClick={async () => {
                      try {
                        setIsGeneratingReviews(true);
                        setError('');
                        const guidance = storeForm.reviewMessage || '좋은 매장입니다';
                        console.log('🤖 AI 리뷰 생성 요청:', guidance);
                        
                        // 타임아웃 설정 (300초)
                        const timeoutPromise = new Promise((_, reject) =>
                          setTimeout(() => reject(new Error('요청 타임아웃: AI 생성이 너무 오래 걸립니다.')), 300000)
                        );

                        // 단일 리뷰 생성 엔드포인트 호출
                        const response = await Promise.race([
                          storeApi.generateReview(guidance, token),
                          timeoutPromise,
                        ]);
                        
                        console.log('📦 AI 응답:', response);
                        console.log('📦 응답 타입:', typeof response);
                        console.log('📦 응답 keys:', Object.keys(response || {}));
                        
                        // single endpoint returns { review: '...' }
                        let reviewText = '';
                        if (response && response.review) {
                          reviewText = response.review;
                        } else if (response && response.reviews && Array.isArray(response.reviews)) {
                          reviewText = (response.reviews[0] && (response.reviews[0].text || response.reviews[0].content)) || '';
                        }

                        console.log('✅ 생성된 리뷰 텍스트(raw):', reviewText);

                        // 원고 길이 100자로 제한
                        const truncated = reviewText ? reviewText.substring(0, 100) : '';
                        if (reviewText) {
                          setStoreForm({ ...storeForm, draftReviews: truncated });
                          setSuccessMessage('✅ AI 리뷰가 생성되었습니다.');
                          setTimeout(() => setSuccessMessage(''), 2000);
                        } else {
                          console.error('❌ 응답이 유효하지 않음:', response);
                          setError('AI 응답이 유효하지 않습니다. 다시 시도해주세요.');
                        }
                      } catch (err) {
                        console.error('❌ AI 요청 실패:', err);
                        setError('AI 리뷰 생성 실패: ' + err.message);
                      } finally {
                        setIsGeneratingReviews(false);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      background: isGeneratingReviews ? 'linear-gradient(135deg, #7c7c8c 0%, #8a8a98 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isGeneratingReviews ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: isGeneratingReviews ? 0.7 : 1,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isGeneratingReviews ? (
                      <>
                        <span style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid #fff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        생성 중...
                      </>
                    ) : (
                      '🤖 AI 리뷰 생성'
                    )}
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



              {/* 이미지 업로드 (드래그/드롭, 최대 2개) */}
              <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#b8c5d6' }}>
                            이미지 업로드 (최대 2개, 각 2MB)
                          </label>
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleFilesSelected(e.dataTransfer.files);
                            }}
                            style={{
                              width: '100%',
                              height: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'column',
                              gap: '8px',
                              padding: '18px',
                              border: '2px dashed rgba(124, 58, 237, 0.4)',
                              borderRadius: '10px',
                              color: '#b8c5d6',
                              background: 'linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.12))',
                              boxSizing: 'border-box',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ fontSize: '14px', color: '#dbeafe', fontWeight: 600 }}>이미지를 끌어다 놓거나</div>
                            <label style={{ background: '#4f46e5', padding: '8px 12px', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>
                              파일 선택
                              <input type="file" accept="image/*" multiple onChange={(e) => handleFilesSelected(e.target.files)} style={{ display: 'none' }} />
                            </label>
                            
                            </div>

                          {selectedImages.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              {selectedImages.map((f, idx) => (
                                <div key={idx} style={{ position: 'relative' }}>
                                  <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 12px rgba(2,6,23,0.4)' }} />
                                  <button onClick={() => removeSelectedImage(idx)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', border: 'none', borderRadius: '50%', width: '26px', height: '26px', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* 기존에 저장된 이미지 목록 (imageUrls textarea 기반) */}
                          {existingImageUrls && existingImageUrls.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              {existingImageUrls.map((url, idx) => (
                                <div key={idx} style={{ position: 'relative' }}>
                                  <img src={url} alt={`img-${idx}`} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 12px rgba(2,6,23,0.4)' }} />
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '6px' }}>
                                    <button onClick={() => downloadUrl(url, `store-image-${idx}.jpg`)} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                      다운로드
                                    </button>
                                    <button onClick={async () => {
                                      if (!window.confirm('이 이미지를 삭제하시겠습니까?')) return;
                                      try {
                                        const storeIdToUse = editingStoreId;
                                        if (!storeIdToUse) throw new Error('매장 ID를 찾을 수 없습니다. 먼저 매장을 저장하세요.');
                                        const res = await storeApi.deleteImage(storeIdToUse, url, token);
                                        setExistingImageUrls(res.store.image_urls || []);
                                        setSuccessMessage('이미지가 삭제되었습니다.');
                                        setTimeout(() => setSuccessMessage(''), 2000);
                                      } catch (e) {
                                        console.error('이미지 삭제 실패:', e);
                                        setError('이미지 삭제에 실패했습니다.');
                                      }
                                    }} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                      삭제
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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
    </>
    );
  };

export default PublishWorkflow;
