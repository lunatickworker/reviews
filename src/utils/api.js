// frontend/src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// 디버깅: 로드된 API URL 확인
console.log('📡 API_BASE_URL:', API_BASE_URL);

export const apiCall = async (method, endpoint, body = null, token = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',  // ngrok 브라우저 경고 건너뛰기
      'User-Agent': 'Mozilla/5.0 (Application)',
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 Token added:', token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️ No token provided for', method, endpoint);
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log('📤 Request:', method, endpoint, {headers: options.headers});
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '요청 실패');
  }

  return data;
};

// 인증 API
export const authApi = {
  login: (userId, password) =>
    apiCall('POST', '/auth/login', { userId, password }),
  register: (userId, password, role, token) =>
    apiCall('POST', '/auth/register', { userId, password, role }, token),
};

// 사용자 API
export const userApi = {
  getAll: (token) => apiCall('GET', '/users', null, token),
  getById: (id, token) => apiCall('GET', `/users/${id}`, null, token),
  updateRole: (id, role, token) =>
    apiCall('PUT', `/users/${id}/role`, { role }, token),
  delete: (id, token) => apiCall('DELETE', `/users/${id}`, null, token),
};

// 작업 API
export const taskApi = {
  getAll: (token) => apiCall('GET', '/tasks', null, token),
  getByUser: (userId, token) =>
    apiCall('GET', `/tasks/user/${userId}`, null, token),
  create: (task, token) => apiCall('POST', '/tasks', task, token),
  update: (id, task, token) =>
    apiCall('PUT', `/tasks/${id}`, task, token),
  delete: (id, token) => apiCall('DELETE', `/tasks/${id}`, null, token),
};

// 로그 API
export const logsApi = {
  getByTaskId: (taskId, limit = 100, token) =>
    apiCall('GET', `/logs/${taskId}?limit=${limit}`, null, token),
  getAll: (limit = 50, token) =>
    apiCall('GET', `/logs?limit=${limit}`, null, token),
  delete: (taskId, token) =>
    apiCall('DELETE', `/logs/${taskId}`, null, token),
};

// 리뷰 배포 API
export const mapApi = {
  automateMap: (shortUrl, notes, token) =>
    apiCall('POST', '/automate-map', { shortUrl, notes }, token),
  getTasks: (token) => apiCall('GET', '/tasks', null, token),
  getReviews: (token) => apiCall('GET', '/reviews', null, token),
  getImageReviews: (token) => apiCall('GET', '/image-reviews', null, token),
  getReviewStatistics: (token, dateRange = '7days') =>
    apiCall('GET', `/statistics/reviews?period=${dateRange}`, null, token),
};
