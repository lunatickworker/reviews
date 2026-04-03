import React, { useState } from 'react';
import { useEffect } from 'react';
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
  // DOM detector: look for external review modal account element and save to localStorage
  useEffect(() => {
    let stopped = false;

    function findInFrames(selector){
      function search(doc){
        try {
          const el = doc.querySelector(selector);
          if(el) return el;
        } catch (e) {
          return null;
        }
        const iframes = Array.from(doc.querySelectorAll('iframe'));
        for(const f of iframes){
          try{
            const childDoc = f.contentDocument || f.contentWindow?.document;
            if (!childDoc) continue;
            const res = search(childDoc);
            if(res) return res;
          }catch(e){
            // cross-origin or inaccessible iframe
            continue;
          }
        }
        return null;
      }
      return search(document);
    }

    function detect() {
      try {
        const el = findInFrames('.Af21Ie');
        if (el && el.textContent && el.textContent.trim()) {
          const val = el.textContent.trim();
          try{
            localStorage.setItem('detectedWorkAccount', val);
            console.log('detectedWorkAccount set:', val);
          }catch(e){
            console.warn('failed to set localStorage detectedWorkAccount', e);
          }
          return true;
        }
      } catch (e) {
        // ignore
      }
      return false;
    }

    // initial detect
    detect();

    // Listen for postMessage from iframe (preferred when iframe is cross-origin)
    const messageHandler = (e) => {
      try {
        const payload = e?.data;
        if (payload && payload.detectedWorkAccount) {
          const val = String(payload.detectedWorkAccount).trim();
          localStorage.setItem('detectedWorkAccount', val);
          console.log('message received detectedWorkAccount:', val, 'from', e.origin);
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('message', messageHandler);

    // MutationObserver on document to catch dynamic insertions
    const docObserver = new MutationObserver(() => { if(!stopped) detect(); });
    docObserver.observe(document, { childList: true, subtree: true });

    // Helper to observe same-origin iframe documents
    const observeIframeDoc = (iframe) => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          docObserver.observe(doc, { childList: true, subtree: true });
        }
      } catch (e) {
        // cannot access cross-origin iframe
      }
    };

    // Attach to existing iframes and listen for loads
    const existingIframes = Array.from(document.querySelectorAll('iframe'));
    existingIframes.forEach(f => {
      observeIframeDoc(f);
      f.addEventListener('load', () => observeIframeDoc(f));
    });

    // Observe for new iframes being added
    const iframeWatcher = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node && node.tagName === 'IFRAME') {
            observeIframeDoc(node);
            node.addEventListener('load', () => observeIframeDoc(node));
          }
        }
      }
      if(!stopped) detect();
    });
    iframeWatcher.observe(document, { childList: true, subtree: true });

    // Fallback interval to ensure detection if MutationObserver misses timing
    const iv = setInterval(() => { if(!stopped) detect(); }, 1500);

    return () => {
      stopped = true;
      try { docObserver.disconnect(); } catch(e){}
      try { iframeWatcher.disconnect(); } catch(e){}
      try { clearInterval(iv); } catch(e){}
      try { window.removeEventListener('message', messageHandler); } catch(e){}
    };
  }, []);

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

