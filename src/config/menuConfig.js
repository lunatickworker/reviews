/**
 * 역할별 메뉴 설정
 * 권한 관리를 한곳에서 집중적으로 처리
 * 
 * Admin: 모든 기능 접근
 * Agency: 배포 제외, 각자의 팀연 관리 가능
 */

export const MENU_CONFIG = {
  admin: [
    { id: 'dashboard', label: '📊 대시보드', component: 'DashboardStats' },
    { id: 'stores', label: '🏪 매장 등록', component: 'StoreManagement' },
    { id: 'tasks', label: '📋 작업 관리', component: 'TaskManagement' },
    { id: 'reviews', label: '📖 리뷰', component: 'ReviewAnalytics' },
    { id: 'deploy', label: '🚀 배포', component: 'SimpleDeploy' },
    { id: 'users', label: '👥 계정 관리', component: 'UserManagement' },
  ],
  agency: [
    { id: 'dashboard', label: '📊 대시보드', component: 'DashboardStats' },
    { id: 'stores', label: '🏪 매장 등록', component: 'StoreManagement' },
    { id: 'tasks', label: '📋 작업 관리', component: 'TaskManagement' },
    { id: 'reviews', label: '📖 리뷰', component: 'ReviewAnalytics' },
    { id: 'users', label: '👥 계정 관리', component: 'UserManagement' },
  ],
};

/**
 * 역할에 따른 메뉴 가져오기
 * @param {string} role - 'admin' 또는 'agency'
 * @returns {Array} 해당 역할의 메뉴 배열
 */
export const getMenuByRole = (role) => {
  return MENU_CONFIG[role] || MENU_CONFIG.agency;
};

/**
 * 메뉴 ID가 해당 역할에 접근 가능한지 확인
 * @param {string} menuId - 메뉴 ID
 * @param {string} role - 사용자 역할
 * @returns {boolean}
 */
export const canAccessMenu = (menuId, role) => {
  const menu = getMenuByRole(role);
  return menu.some(item => item.id === menuId);
};
