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

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log('📤 Full Request:', method, fullUrl);
  console.log('📝 Body:', body);
  console.log('🔗 Headers:', options.headers);
  
  const response = await fetch(fullUrl, options);
  
  console.log('📨 Response Status:', response.status, response.statusText);
  console.log('📨 Response Headers:', Object.fromEntries(response.headers));
  
  // 응답 타입 확인
  const contentType = response.headers.get('content-type');
  let data;
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('❌ JSON 파싱 실패:', text.substring(0, 100));
        throw new Error(`서버 응답 오류: ${response.status} ${response.statusText}`);
      }
    } else {
      data = null;
    }
  }

  console.log('📦 Response Data:', data);

  if (!response.ok) {
    console.error('❌ API Error:', data?.error || `요청 실패: ${response.status} ${response.statusText}`);
    throw new Error(data?.error || `요청 실패: ${response.status} ${response.statusText}`);
  }

  console.log('✅ Success:', method, endpoint);
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
  updatePassword: (id, newPassword, token) =>
    apiCall('PUT', `/users/${id}/password`, { newPassword }, token),
  delete: (id, token) => apiCall('DELETE', `/users/${id}`, null, token),
};

// 매장 API
export const storeApi = {
  getAll: (token) => apiCall('GET', '/stores', null, token),
  create: (storeName, address, reviewMessage, imageUrls, dailyFrequency, totalCount, token, draftReviews = '') =>
    apiCall('POST', '/stores', { storeName, address, reviewMessage, imageUrls, dailyFrequency, totalCount, draftReviews }, token),
  update: (id, storeName, address, reviewMessage, imageUrls, dailyFrequency, totalCount, token, draftReviews = '') =>
    apiCall('PUT', `/stores/${id}`, { storeName, address, reviewMessage, imageUrls, dailyFrequency, totalCount, draftReviews }, token),
  delete: (id, token) => apiCall('DELETE', `/stores/${id}`, null, token),
  deploy: (id, token) => apiCall('PATCH', `/stores/${id}/deploy`, null, token),
  generateReview: (guidance, token) =>
    apiCall('POST', '/stores/generate-review', { guidance }, token),
  generateReviews: (guidance, count, token) =>
    apiCall('POST', '/stores/generate-reviews', { guidance, count }, token),
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
  reset: (id, token) => apiCall('POST', `/tasks/${id}/reset`, null, token),
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
  automateMap: (shortUrl, notes, storeId, totalCount, token) =>
    apiCall('POST', '/automate-map', { shortUrl, notes, storeId, totalCount }, token),
  getTasks: (token) => apiCall('GET', '/tasks', null, token),
  getReviews: (token) => apiCall('GET', '/reviews', null, token),
  getImageReviews: (token) => apiCall('GET', '/image-reviews', null, token),
  getReviewStatistics: (token, dateRange = '7days') =>
    apiCall('GET', `/statistics/reviews?period=${dateRange}`, null, token),
};
