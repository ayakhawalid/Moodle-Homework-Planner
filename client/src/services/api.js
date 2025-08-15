import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (set by useApi hook)
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      console.log('Unauthorized access - redirecting to login');
      // We can dispatch a logout action here
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Health check
  health: () => api.get('/health'),
  
  // Auth test
  authTest: () => api.get('/auth-test'),
  
  // User endpoints
  user: {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    getAll: (params) => api.get('/users', { params }),
    getStats: () => api.get('/users/stats'),
    getById: (id) => api.get(`/users/${id}`),
    updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
    deactivate: (id) => api.delete(`/users/${id}`)
  },
  
  // Course endpoints (to be implemented)
  courses: {
    getAll: (params) => api.get('/courses', { params }),
    getById: (id) => api.get(`/courses/${id}`),
    create: (data) => api.post('/courses', data),
    update: (id, data) => api.put(`/courses/${id}`, data),
    delete: (id) => api.delete(`/courses/${id}`),
    getByLecturer: (lecturerId) => api.get(`/courses/lecturer/${lecturerId}`),
    getByStudent: (studentId) => api.get(`/courses/student/${studentId}`)
  },
  
  // Homework endpoints (to be implemented)
  homework: {
    getAll: (params) => api.get('/homework', { params }),
    getById: (id) => api.get(`/homework/${id}`),
    create: (data) => api.post('/homework', data),
    update: (id, data) => api.put(`/homework/${id}`, data),
    delete: (id) => api.delete(`/homework/${id}`),
    getByCourse: (courseId) => api.get(`/homework/course/${courseId}`),
    getUpcoming: (days) => api.get(`/homework/upcoming?days=${days}`)
  },
  
  // Grade endpoints (to be implemented)
  grades: {
    getAll: (params) => api.get('/grades', { params }),
    getById: (id) => api.get(`/grades/${id}`),
    create: (data) => api.post('/grades', data),
    update: (id, data) => api.put(`/grades/${id}`, data),
    delete: (id) => api.delete(`/grades/${id}`),
    getByStudent: (studentId) => api.get(`/grades/student/${studentId}`),
    getByHomework: (homeworkId) => api.get(`/grades/homework/${homeworkId}`)
  },
  
  // Study Progress endpoints (to be implemented)
  studyProgress: {
    getAll: (params) => api.get('/study-progress', { params }),
    getById: (id) => api.get(`/study-progress/${id}`),
    create: (data) => api.post('/study-progress', data),
    update: (id, data) => api.put(`/study-progress/${id}`, data),
    delete: (id) => api.delete(`/study-progress/${id}`),
    getByStudent: (studentId) => api.get(`/study-progress/student/${studentId}`),
    getWeeklySummary: (studentId, weekStart) => 
      api.get(`/study-progress/weekly/${studentId}?week=${weekStart}`),
    getMonthlySummary: (studentId, year, month) => 
      api.get(`/study-progress/monthly/${studentId}?year=${year}&month=${month}`)
  },
  
  // File endpoints (to be implemented)
  files: {
    upload: (formData) => api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getById: (id) => api.get(`/files/${id}`),
    download: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
    delete: (id) => api.delete(`/files/${id}`),
    getByHomework: (homeworkId) => api.get(`/files/homework/${homeworkId}`),
    getByClass: (classId) => api.get(`/files/class/${classId}`)
  }
};

// Helper function to set auth token
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
  }
};

// Helper function to handle API errors
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      status,
      message: data.message || data.error || 'An error occurred',
      details: data
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      status: 0,
      message: 'Network error - please check your connection',
      details: error.request
    };
  } else {
    // Something else happened
    return {
      status: -1,
      message: error.message || 'An unexpected error occurred',
      details: error
    };
  }
};

export default api;
