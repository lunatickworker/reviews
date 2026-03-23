// frontend/src/pages/AdminDashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from '../components/UserManagement';
import TaskList from '../components/TaskList';
import ReviewDeploy from '../components/ReviewDeploy';
import TaskDashboard from '../components/TaskDashboard';
import ReviewManagement from '../components/ReviewManagement';
import ImageReviewManagement from '../components/ImageReviewManagement';
import ReviewStatistics from '../components/ReviewStatistics';

export default function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenu, setExpandedMenu] = useState(null);

  const menuItems = [
    { id: 'dashboard', label: '📊 대시보드', icon: '📊', section: 'main' },
    { id: 'tasks', label: '📋 작업 관리', icon: '📋', section: 'main' },
    { 
      id: 'management', 
      label: '🔧 관리', 
      icon: '🔧', 
      section: 'main',
      submenu: [
        { id: 'reviews', label: '✍️ 리뷰 작성', icon: '✍️' },
        { id: 'images', label: '🖼️ 이미지 리뷰', icon: '🖼️' },
        { id: 'statistics', label: '📈 일일 통계', icon: '📈' },
      ]
    },
    ...(isAdmin ? [{ id: 'deploy', label: '🚀 배포', icon: '🚀', section: 'admin' }] : []),
    ...(isAdmin ? [{ id: 'users', label: '👥 계정 관리', icon: '👥', section: 'admin' }] : []),
  ];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2>🗺️ Maps</h2>
          <p style={styles.subtitle}>자동화 시스템</p>
        </div>

        <nav style={styles.menu}>
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.submenu) {
                    setExpandedMenu(expandedMenu === item.id ? null : item.id);
                  } else {
                    setActiveTab(item.id);
                    setExpandedMenu(null);
                  }
                }}
                style={{
                  ...styles.menuItem,
                  ...(activeTab === item.id ? styles.menuItemActive : {}),
                }}
              >
                <span style={styles.menuIcon}>{item.icon}</span>
                <span style={styles.menuLabel}>{item.label}</span>
                {item.submenu && (
                  <span style={styles.menuArrow}>
                    {expandedMenu === item.id ? '▼' : '▶'}
                  </span>
                )}
              </button>
              
              {item.submenu && expandedMenu === item.id && (
                <div style={styles.submenu}>
                  {item.submenu.map((subitem) => (
                    <button
                      key={subitem.id}
                      onClick={() => {
                        setActiveTab(subitem.id);
                        setExpandedMenu(null);
                      }}
                      style={{
                        ...styles.submenuItem,
                        ...(activeTab === subitem.id ? styles.submenuItemActive : {}),
                      }}
                    >
                      <span style={styles.submenuIcon}>{subitem.icon}</span>
                      <span>{subitem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <header style={styles.mainHeader}>
          <div style={styles.headerLeft}>
            <h1>📊 Google Maps 자동화 관리 시스템</h1>
            <p style={styles.headerSubtitle}>환영합니다, {user?.userId}님!</p>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.userProfile}>
              <div style={styles.avatar}>{user?.userId.charAt(0).toUpperCase()}</div>
              <div style={styles.userDetails}>
                <p style={styles.userName}>{user?.userId}</p>
                <p style={styles.userRole}>{user?.role === 'admin' ? '관리자' : '에이전시'}</p>
              </div>
            </div>
            <button onClick={logout} style={styles.logoutButton}>
              로그아웃
            </button>
          </div>
        </header>

        <div style={styles.content}>
          {activeTab === 'dashboard' && <TaskDashboard />}
          {activeTab === 'tasks' && <TaskList />}
          {activeTab === 'reviews' && <ReviewManagement />}
          {activeTab === 'images' && <ImageReviewManagement />}
          {activeTab === 'statistics' && <ReviewStatistics />}
          {activeTab === 'deploy' && isAdmin && <ReviewDeploy />}
          {activeTab === 'users' && isAdmin && <UserManagement />}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },

  // Sidebar 스타일
  sidebar: {
    width: '280px',
    background: 'rgba(255, 240, 245, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(255, 182, 193, 0.3)',
    padding: '30px 20px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 10px rgba(0, 0, 0, 0.05)',
  },

  sidebarHeader: {
    marginBottom: '40px',
    borderBottom: '2px solid rgba(255, 182, 193, 0.3)',
    paddingBottom: '15px',
  },

  subtitle: {
    fontSize: '12px',
    color: '#b19cd9',
    margin: '5px 0 0 0',
    fontWeight: '500',
  },

  menu: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 15px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(230, 190, 255, 0.3)',
    color: '#6b4c8a',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '14px',
    fontWeight: '500',
    backdropFilter: 'blur(5px)',
  },

  menuItemActive: {
    background: 'rgba(200, 150, 255, 0.6)',
    color: '#5a3f7d',
    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  menuIcon: {
    fontSize: '18px',
  },

  menuLabel: {
    flex: 1,
    textAlign: 'left',
  },

  menuArrow: {
    fontSize: '12px',
    marginLeft: '8px',
  },

  submenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    paddingLeft: '20px',
    marginTop: '5px',
    marginBottom: '5px',
  },

  submenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'rgba(230, 190, 255, 0.2)',
    color: '#8b6ba8',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '13px',
    fontWeight: '400',
    backdropFilter: 'blur(5px)',
  },

  submenuItemActive: {
    background: 'rgba(200, 150, 255, 0.5)',
    color: '#5a3f7d',
    fontWeight: '500',
  },

  submenuIcon: {
    fontSize: '16px',
  },

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px',
    background: 'rgba(255, 192, 203, 0.2)',
    borderRadius: '10px',
    marginBottom: '15px',
    backdropFilter: 'blur(5px)',
    border: '1px solid rgba(255, 182, 193, 0.3)',
  },

  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e6befc, #ffd6e8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#6b4c8a',
    fontSize: '16px',
  },

  userName: {
    margin: '0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b4c8a',
  },

  userRole: {
    margin: '2px 0 0 0',
    fontSize: '11px',
    color: '#b19cd9',
  },

  logoutBtn: {
    padding: '10px 15px',
    background: 'rgba(255, 182, 193, 0.4)',
    border: '1px solid rgba(255, 182, 193, 0.6)',
    borderRadius: '8px',
    color: '#d63384',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
  },

  // Main Content 스타일
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #f0e6ff 100%)',
  },

  mainHeader: {
    padding: '20px 40px',
    background: 'rgba(255, 240, 245, 0.5)',
    borderBottom: '1px solid rgba(219, 112, 147, 0.2)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '30px',
  },

  headerLeft: {
    flex: 1,
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    paddingLeft: '20px',
    borderLeft: '1px solid rgba(219, 112, 147, 0.2)',
  },

  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  logoutButton: {
    padding: '10px 18px',
    background: 'rgba(255, 182, 193, 0.4)',
    border: '1px solid rgba(255, 182, 193, 0.6)',
    borderRadius: '8px',
    color: '#d63384',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap',
  },

  headerSubtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#b19cd9',
  },

  content: {
    flex: 1,
    padding: '30px 40px',
    overflowY: 'auto',
  },
};
