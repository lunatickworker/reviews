import React, { useState } from 'react';
import {
  FiMenu,
  FiX,
  FiHome,
  FiBarChart2,
  FiTruck,
  FiUsers,
  FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

/**
 * 통합 네비게이션
 * 역할 기반 메뉴 표시 (Admin vs Regular User)
 */
const Navigation = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: FiHome,
      roles: ['admin', 'agency', 'user'],
      description: '실시간 분석 및 KPI',
    },
    {
      id: 'workflow',
      label: '배포 워크플로우',
      icon: FiTruck,
      roles: ['admin', 'agency', 'user'],
      description: '매장등록·작업관리',
    },
    {
      id: 'analytics',
      label: '분석',
      icon: FiBarChart2,
      roles: ['admin', 'agency', 'user'],
      description: '리뷰·이미지 분석',
    },
    {
      id: 'admin',
      label: '계정관리',
      icon: FiUsers,
      roles: ['admin', 'agency'],
      description: '팀원 관리',
    },
  ];

  const filteredMenu = menuItems.filter((item) => {
    return item.roles.includes(user?.role);
  });

  const styles = {
    // 데스크톱 사이드바
    sidebar: {
      position: 'fixed',
      left: 0,
      top: 0,
      width: '280px',
      height: '100vh',
      background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(31,41,55,0.95) 100%)',
      borderRight: '1px solid rgba(124, 58, 237, 0.2)',
      overflow: 'auto',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    },
    sidebarHeader: {
      padding: '20px 16px',
      borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
      background: 'rgba(0, 0, 0, 0.2)',
    },
    logo: {
      fontSize: '24px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '8px',
    },
    userInfo: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#e8eef5',
      letterSpacing: '0.2px',
    },
    menuItems: {
      flex: 1,
      padding: '16px',
      overflow: 'auto',
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      marginBottom: '8px',
      background: 'transparent',
      border: 'none',
      color: '#d1d5db',
      cursor: 'pointer',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      width: '100%',
      textAlign: 'left',
    },
    activeMenuItem: {
      background: 'rgba(168, 85, 247, 0.2)',
      color: '#a855f7',
      borderLeft: '3px solid #a855f7',
      paddingLeft: '13px',
    },
    menuItemIcon: {
      marginRight: '12px',
      fontSize: '16px',
    },
    sidebarFooter: {
      padding: '16px',
      borderTop: '1px solid rgba(124, 58, 237, 0.2)',
    },
    logoutBtn: {
      width: '100%',
      padding: '10px',
      background: 'rgba(239, 68, 68, 0.2)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#fca5a5',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      transition: 'all 0.3s ease',
    },

    // 모바일
    mobileHeader: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(31,41,55,0.95) 100%)',
      borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 101,
    },
    mobileContent: {
      marginTop: '56px',
    },
    mobileSidebar: {
      position: 'fixed',
      left: 0,
      top: '56px',
      width: '100%',
      height: 'calc(100vh - 56px)',
      background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(31,41,55,0.95) 100%)',
      zIndex: 100,
      overflow: 'auto',
    },
  };

  return (
    <>
      {/* 데스크톱 사이드바 (768px 이상) */}
      <div style={{ ...styles.sidebar, display: 'none' }} className="desktop-sidebar">
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>🚀 Google Review</div>
          <div style={styles.userInfo}>
            {user?.userId || 'User'}
          </div>
        </div>

        <div style={styles.menuItems}>
          {filteredMenu.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  ...styles.menuItem,
                  ...(currentPage === item.id ? styles.activeMenuItem : {}),
                }}
              >
                <IconComponent style={styles.menuItemIcon} />
                <div>
                  <div>{item.label}</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'rgba(156, 163, 175, 0.8)',
                      marginTop: '2px',
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={styles.sidebarFooter}>
          <button
            onClick={logout}
            style={styles.logoutBtn}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <FiLogOut size={14} />
            로그아웃
          </button>
        </div>
      </div>

      {/* 모바일 헤더 */}
      <div style={styles.mobileHeader} className="mobile-header">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: '#a855f7',
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          {mobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#a855f7' }}>
          🚀 Google Review
        </div>
        <div style={{ width: '20px' }} />
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {mobileMenuOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 98,
              pointerEvents: 'auto',
            }}
            onClick={() => setMobileMenuOpen(false)}
            className="mobile-overlay"
          />
          <div style={styles.mobileSidebar} className="mobile-sidebar">
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(124, 58, 237, 0.2)' }}>
              <div style={styles.userInfo}>
                {user?.userId || 'User'}
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              {filteredMenu.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      ...styles.menuItem,
                      ...(currentPage === item.id ? styles.activeMenuItem : {}),
                    }}
                  >
                    <IconComponent style={styles.menuItemIcon} />
                    <div>
                      <div>{item.label}</div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'rgba(156, 163, 175, 0.8)',
                          marginTop: '2px',
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '16px' }}>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                style={styles.logoutBtn}
              >
                <FiLogOut size={14} />
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}

      <style>
        {`
          @media (min-width: 768px) {
            .desktop-sidebar {
              display: flex !important;
            }
            .mobile-header {
              display: none !important;
            }
            .mobile-sidebar {
              display: none !important;
            }
            .mobile-overlay {
              display: none !important;
            }
          }
          @media (max-width: 767px) {
            .desktop-sidebar {
              display: none !important;
            }
            .main-content {
              margin-left: 0 !important;
              margin-top: 56px !important;
            }
          }
        `}
      </style>
    </>
  );
};

export default Navigation;
