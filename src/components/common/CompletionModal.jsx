import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiChevronRight, FiCheckCircle } from 'react-icons/fi';

export default function CompletionModal({ 
  isOpen, 
  task, 
  storeName,
  onReviewOnly, 
  onReviewWithImage, 
  isLoading = false
}) {
  const [visible, setVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [currentStoreName, setCurrentStoreName] = useState('');

  useEffect(() => {
    console.log('🔔 CompletionModal useEffect:', { isOpen, taskId: task?.id, visible });
    if (isOpen && task) {
      console.log('✅ CompletionModal 표시:', task.id);
      setVisible(true);
      setCurrentTask(task);
      setCurrentStoreName(storeName);
    }
  }, [isOpen, task?.id, storeName]);

  if (!visible || !currentTask) {
    console.log('❌ CompletionModal 렌더링 안함: visible=' + visible + ', currentTask=' + !!currentTask);
    return null;
  }

  console.log('🎬 CompletionModal 렌더링중:', currentTask.id);

  const handleReviewOnly = () => {
    console.log('📝 리뷰만 완료 선택');
    onReviewOnly?.();
    setVisible(false);
  };

  const handleReviewWithImage = () => {
    console.log('📸 리뷰+이미지 완료 선택');
    onReviewWithImage?.();
    setVisible(false);
  };

  // 간단한 HTML 구조
  const modalHTML = (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: '100%',
      height: '100%',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      pointerEvents: 'auto'
    }}>
      {/* 배경 오버레이 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1
      }} />

      {/* 모달 박스 */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        bottom: '24px',
        right: '24px',
        width: '400px',
        maxWidth: '90vw',
        background: '#1a2332',
        border: '1px solid #4682b4',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
        color: '#e8eef5',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* 헤더 - 제목 + X 버튼 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
          background: 'rgba(70, 130, 180, 0.05)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
              작업 완료 확인
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              {currentStoreName || '매장'}
            </p>
          </div>
          <button
            onClick={() => setVisible(false)}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: '#b8c5d6',
              fontSize: '24px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '0',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div style={{ padding: '20px' }}>
        
        <div style={{
          background: '#2d3e52',
          border: '1px solid #4682b4',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#b8c5d6' }}>별점: </span>
            <span style={{ color: '#93c5fd', fontWeight: 600 }}>{currentTask.stars || 0}점</span>
          </div>
          {currentTask.notes && (
            <div>
              <span style={{ color: '#b8c5d6' }}>리뷰: </span>
              <span style={{ color: '#93c5fd' }}>{currentTask.notes.substring(0, 30)}...</span>
            </div>
          )}
        </div>

        <button
          onClick={handleReviewOnly}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '8px',
            background: '#4682b4',
            color: '#e8eef5',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          📝 리뷰만 완료
        </button>

        <button
          onClick={handleReviewWithImage}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#059669',
            color: '#ecfdf5',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          📸 리뷰+이미지 완료
        </button>
        </div>
      </div>
    </div>
  );

  try {
    return ReactDOM.createPortal(modalHTML, document.body);
  } catch (e) {
    console.error('❌ Portal 렌더링 실패:', e);
    return modalHTML;
  }
}
