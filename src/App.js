import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import ToastContainer from './components/common/ToastContainer';
import LoginPage from './pages/LoginPage';
import Navigation from './components/Navigation';
import MainDashboard from './components/MainDashboard';
import PublishWorkflow from './components/PublishWorkflow';
import ReviewAnalytics from './components/ReviewAnalytics';
import UserManagement from './components/UserManagement';

/**
 * 메인 App 컴포넌트
 * 인증, 네비게이션, 페이지 라우팅을 통합 관리
 */
function AppContent() {
  const { token, isAdmin, isAgency, loading } = useAuth();
  const { toasts, removeToast } = useToast();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>로딩 중...</div>;
  }

  if (!token) {
    return <LoginPage />;
  }

  // 페이지 렌더링
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <MainDashboard />;
      case 'workflow':
        return <PublishWorkflow />;
      case 'analytics':
        return <ReviewAnalytics />;
      case 'admin':
        return (isAdmin || isAgency) ? <UserManagement /> : <MainDashboard />;
      default:
        return <MainDashboard />;
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      background: '#000',
    },
    desktopSidebar: {
      width: '280px',
      flexShrink: 0,
      display: 'none',
    },
    mainContent: {
      flex: 1,
      overflow: 'auto',
      background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(15,23,42,0.95) 100%)',
    },
  };

  return (
    <div style={styles.container}>
      {/* 네비게이션 */}
      <div style={styles.desktopSidebar} className="desktop-sidebar">
        <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>

      {/* 메인 컨텐츠 */}
      <div style={styles.mainContent} className="main-content">
        <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
        {renderPage()}
      </div>

      {/* 토스트 컨테이너 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <style>
        {`
          @media (min-width: 768px) {
            .desktop-sidebar {
              display: block !important;
            }
            .main-content {
              margin-left: 0 !important;
              margin-top: 0 !important;
            }
          }
          @media (max-width: 767px) {
            .desktop-sidebar {
              display: none !important;
            }
            .main-content {
              margin-top: 0;
              padding-top: 56px;
            }
          }
        `}
      </style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div style={{ fontFamily: "'AsiaHead', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
          <AppContent />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

