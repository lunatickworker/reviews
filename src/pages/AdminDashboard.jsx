// frontend/src/pages/AdminDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from '../components/UserManagement';
import TaskManagement from '../components/TaskManagement';
import SimpleDeploy from '../components/SimpleDeploy';
import ReviewManagement from '../components/ReviewManagement';
import ImageReviewManagement from '../components/ImageReviewManagement';
import ReviewAnalytics from '../components/ReviewAnalytics';
import DashboardStats from '../components/DashboardStats';

export default function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenu, setExpandedMenu] = useState(null);

  const mainMenu = [
    { id: 'dashboard', label: '📊 대시보드' },
    { id: 'tasks', label: '📋 작업 관리' },
    { id: 'management', label: '🔧 관리', hasSubmenu: true },
    ...(isAdmin ? [{ id: 'deploy', label: '🚀 배포' }] : []),
    ...(isAdmin ? [{ id: 'users', label: '👥 계정 관리' }] : []),
  ];

  const managementMenu = [
    { id: 'reviews', label: '✍️ 리뷰 작성' },
    { id: 'images', label: '🖼️ 이미지 리뷰' },
    { id: 'analytics', label: '📊 리뷰 분석' },
  ];

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#0f1419',
    },

    // Top Navigation
    topNav: {
      background: 'linear-gradient(180deg, rgba(26, 31, 46, 0.95) 0%, rgba(26, 31, 46, 0.8) 100%)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    },

    navContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 40px',
      height: '70px',
      gap: '40px',
    },

    navLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '30px',
      flex: 1,
    },

    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },

    logoIcon: {
      fontSize: '28px',
    },

    logoText: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: '-0.5px',
    },

    logoSubtext: {
      fontSize: '11px',
      color: '#8b96a8',
      fontWeight: '500',
    },

    mainNav: {
      display: 'flex',
      gap: '5px',
      alignItems: 'center',
    },

    navItemWrapper: {
      position: 'relative',
    },

    navButton: {
      padding: '10px 18px',
      background: 'transparent',
      border: 'none',
      color: '#b0b9c6',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      borderBottom: '2px solid transparent',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      whiteSpace: 'nowrap',
    },

    navButtonActive: {
      color: '#ffffff',
      borderBottomColor: '#7c3aed',
      background: 'rgba(124, 58, 237, 0.1)',
    },

    dropdownArrow: {
      fontSize: '12px',
      marginLeft: '4px',
    },

    submenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      background: 'rgba(26, 31, 46, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(124, 58, 237, 0.2)',
      borderRadius: '8px',
      minWidth: '180px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      marginTop: '8px',
      overflow: 'hidden',
      zIndex: 10,
    },

    submenuItem: {
      display: 'block',
      width: '100%',
      padding: '12px 18px',
      background: 'transparent',
      border: 'none',
      color: '#b0b9c6',
      cursor: 'pointer',
      fontSize: '13px',
      textAlign: 'left',
      transition: 'all 0.2s ease',
      borderLeft: '3px solid transparent',
    },

    submenuItemActive: {
      background: 'rgba(124, 58, 237, 0.2)',
      color: '#ffffff',
      borderLeftColor: '#7c3aed',
    },

    navRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },

    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      background: 'rgba(124, 58, 237, 0.1)',
      borderRadius: '8px',
    },

    userAvatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #7c3aed, #da127d)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      color: '#ffffff',
      fontSize: '14px',
    },

    userMeta: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },

    userName: {
      margin: 0,
      fontSize: '12px',
      fontWeight: '600',
      color: '#ffffff',
    },

    userRole: {
      margin: 0,
      fontSize: '11px',
      color: '#8b96a8',
    },

    logoutBtn: {
      padding: '8px 16px',
      background: 'rgba(218, 18, 125, 0.15)',
      border: '1px solid rgba(218, 18, 125, 0.3)',
      borderRadius: '6px',
      color: '#ff6b9d',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '12px',
      transition: 'all 0.3s ease',
    },

    // Main Content
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    },

    content: {
      flex: 1,
      padding: '30px 40px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Top Navigation */}
      <header style={styles.topNav}>
        <div style={styles.navContent}>
          <div style={styles.navLeft}>
            <div style={styles.logo}>
              <span style={styles.logoIcon}>🗺️</span>
              <div>
                <div style={styles.logoText}>Google Maps</div>
                <div style={styles.logoSubtext}>자동화 시스템</div>
              </div>
            </div>

            {/* Main Menu */}
            <nav style={styles.mainNav}>
              {mainMenu.map((item) => (
                <div key={item.id} style={styles.navItemWrapper}>
                  <button
                    onClick={() => {
                      setActiveTab(item.id === 'management' ? 'reviews' : item.id);
                      setExpandedMenu(
                        item.hasSubmenu 
                          ? (expandedMenu === item.id ? null : item.id)
                          : null
                      );
                    }}
                    style={{
                      ...styles.navButton,
                      ...(activeTab.startsWith(item.id) || (item.id === 'management' && ['reviews', 'images', 'analytics'].includes(activeTab))
                        ? styles.navButtonActive
                        : {}),
                    }}
                  >
                    {item.label}
                    {item.hasSubmenu && (
                      <span style={styles.dropdownArrow}>
                        {expandedMenu === item.id ? '▼' : '▼'}
                      </span>
                    )}
                  </button>

                  {/* Submenu */}
                  {item.hasSubmenu && expandedMenu === item.id && (
                    <div style={styles.submenu}>
                      {managementMenu.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setActiveTab(sub.id);
                            setExpandedMenu(null);
                          }}
                          style={{
                            ...styles.submenuItem,
                            ...(activeTab === sub.id ? styles.submenuItemActive : {}),
                          }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* User Profile */}
          <div style={styles.navRight}>
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>{user?.userId.charAt(0).toUpperCase()}</div>
              <div style={styles.userMeta}>
                <div style={styles.userName}>{user?.userId}</div>
                <div style={styles.userRole}>{user?.role === 'admin' ? '👤 관리자' : '🏢 에이전시'}</div>
              </div>
            </div>
            <button onClick={logout} style={styles.logoutBtn}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {activeTab === 'dashboard' && <DashboardStats />}
          {activeTab === 'tasks' && <TaskManagement />}
          {activeTab === 'reviews' && <ReviewManagement />}
          {activeTab === 'images' && <ImageReviewManagement />}
          {activeTab === 'analytics' && <ReviewAnalytics />}
          {activeTab === 'deploy' && isAdmin && <SimpleDeploy />}
          {activeTab === 'users' && isAdmin && <UserManagement />}
        </div>
      </main>
    </div>
  );
}
