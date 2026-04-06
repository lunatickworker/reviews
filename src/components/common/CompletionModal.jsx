import React from 'react';
import { FiChevronRight, FiImage, FiCheckCircle } from 'react-icons/fi';

/**
 * 최종 완료 확인 모달
 * 오른쪽 하단에 떠있으며, 리뷰/이미지 완료 상태를 확인할 수 있습니다.
 */
export default function CompletionModal({ 
  isOpen, 
  task, 
  storeName,
  onReviewOnly, 
  onReviewWithImage, 
  onClose,
  isLoading = false
}) {
  if (!isOpen || !task) return null;

  const handleReviewOnly = () => {
    onReviewOnly?.();
  };

  const handleReviewWithImage = () => {
    onReviewWithImage?.();
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        style={styles.overlay}
        onClick={onClose}
        role="button"
        tabIndex={-1}
      />

      {/* 모달 - 오른쪽 하단 */}
      <div style={styles.modalContainer}>
        <div style={styles.modal}>
          {/* 헤더 */}
          <div style={styles.header}>
            <div style={styles.titleGroup}>
              <FiCheckCircle size={24} color="#059669" style={{ marginRight: '8px' }} />
              <div>
                <h3 style={styles.title}>작업 완료 확인</h3>
                <p style={styles.subtitle}>{storeName || '매장'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={styles.closeButton}
              disabled={isLoading}
            >
              ✕
            </button>
          </div>

          {/* 구분선 */}
          <div style={styles.divider} />

          {/* 본문 */}
          <div style={styles.content}>
            <p style={styles.message}>
              모든 입력이 완료되었습니다. 최종 게시 방식을 선택해주세요.
            </p>

            {/* 정보 */}
            <div style={styles.infoBox}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>별점:</span>
                <span style={styles.infoValue}>{task.stars || 0}점</span>
              </div>
              {task.notes && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>리뷰:</span>
                  <span style={styles.infoValue}>{task.notes.substring(0, 30)}...</span>
                </div>
              )}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div style={styles.buttonGroup}>
            {/* 리뷰만 완료 버튼 */}
            <button
              onClick={handleReviewOnly}
              disabled={isLoading}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={styles.buttonIcon}>📝</span>
              <div style={styles.buttonContent}>
                <div style={styles.buttonText}>리뷰만 완료</div>
                <div style={styles.buttonDesc}>이미지는 나중에</div>
              </div>
              <FiChevronRight size={18} style={{ marginLeft: 'auto' }} />
            </button>

            {/* 리뷰+이미지 완료 버튼 */}
            <button
              onClick={handleReviewWithImage}
              disabled={isLoading}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={styles.buttonIcon}>📸</span>
              <div style={styles.buttonContent}>
                <div style={styles.buttonText}>리뷰+이미지 완료</div>
                <div style={styles.buttonDesc}>모든 작업 완료</div>
              </div>
              <FiChevronRight size={18} style={{ marginLeft: 'auto' }} />
            </button>
          </div>

          {/* 로딩 상태 */}
          {isLoading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>처리 중...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 999,
  },
  modalContainer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 1000,
    maxWidth: '420px',
    width: 'calc(100% - 48px)',
  },
  modal: {
    background: 'linear-gradient(135deg, rgba(30, 50, 90, 0.95) 0%, rgba(20, 40, 70, 0.95) 100%)',
    border: '1px solid rgba(70, 130, 180, 0.3)',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    animation: 'slideInUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'rgba(5, 150, 105, 0.1)',
    borderBottom: '1px solid rgba(70, 130, 180, 0.2)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#e8eef5',
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: '#b8c5d6',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#b8c5d6',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, rgba(70, 130, 180, 0.2) 0%, rgba(70, 130, 180, 0.1) 100%)',
  },
  content: {
    padding: '16px 20px',
  },
  message: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.5',
  },
  infoBox: {
    background: 'rgba(70, 130, 180, 0.1)',
    border: '1px solid rgba(70, 130, 180, 0.2)',
    borderRadius: '8px',
    padding: '12px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    marginBottom: '8px',
  },
  infoLabel: {
    color: '#b8c5d6',
  },
  infoValue: {
    color: '#93c5fd',
    fontWeight: '600',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 16px 16px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    minHeight: '48px',
  },
  buttonSecondary: {
    background: 'rgba(70, 130, 180, 0.2)',
    color: '#93c5fd',
    border: '1px solid rgba(70, 130, 180, 0.3)',
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: '#ecfdf5',
    border: '1px solid rgba(5, 150, 105, 0.3)',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
  },
  buttonIcon: {
    fontSize: '18px',
  },
  buttonContent: {
    flex: 1,
    textAlign: 'left',
  },
  buttonText: {
    fontSize: '13px',
    fontWeight: '600',
  },
  buttonDesc: {
    fontSize: '11px',
    opacity: 0.7,
    marginTop: '2px',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    zIndex: 10,
    flexDirection: 'column',
    gap: '12px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTop: '2px solid #059669',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  loadingText: {
    fontSize: '12px',
    color: '#cbd5e1',
  },
};

// CSS 애니메이션 추가
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
document.head.appendChild(styleSheet);
