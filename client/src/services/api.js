import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store the token provider function
let tokenProvider = null;

// Function to set the token provider
export const setTokenProvider = (provider) => {
  tokenProvider = provider;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    if (tokenProvider) {
      try {
        const token = await tokenProvider();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get access token for request:', error);
        // Optionally, you could cancel the request here
      }
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
  health: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Auth test
  authTest: async () => {
    const response = await api.get('/auth-test');
    return response.data;
  },
  
  // User endpoints
  user: {
    getProfile: async () => {
      const response = await api.get('/users/profile');
      return response.data;
    },
    updateProfile: async (data) => {
      const response = await api.put('/users/profile', data);
      return response.data;
    },
    getAll: async (params) => {
      const response = await api.get('/users', { params });
      return response.data;
    },
    getStats: async () => {
      const response = await api.get('/users/stats');
      return response.data;
    },
    getById: async (id) => {
      const response = await api.get(`/users/${id}`);
      return response.data;
    },
    updateById: async (id, data) => {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    },
    checkUsername: async (username) => {
      const response = await api.get(`/users/username-available`, { params: { u: username } });
      return response.data;
    },
    updateRole: async (id, role) => {
      const response = await api.put(`/users/${id}/role`, { role });
      return response.data;
    },
    deactivate: async (id) => {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    },
    syncProfile: async (data) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    deleteAccount: async () => {
      const response = await api.delete('/users/me');
      return response.data;
    }
  },

  // Settings endpoints
  settings: {
    getAll: async () => {
      const response = await api.get('/settings');
      return response.data;
    },
    saveAll: async (items) => {
      const response = await api.put('/settings', items);
      return response.data;
    }
  },

  // Analytics endpoints
  analytics: {
    getOverview: async () => {
      const response = await api.get('/analytics/overview');
      return response.data;
    }
  },

  roleRequests: {
    submit: async (role) => {
      const response = await api.post('/role-requests', { role });
      return response.data;
    },
    list: async (status) => {
      const params = status ? { status } : {};
      const response = await api.get('/role-requests', { params });
      return response.data;
    },
    getMyRequests: async () => {
      const response = await api.get('/role-requests/my');
      return response.data;
    },
    approve: async (id) => {
      const response = await api.post(`/role-requests/${id}/approve`);
      return response.data;
    },
    reject: async (id, note) => {
      const response = await api.post(`/role-requests/${id}/reject`, { note });
      return response.data;
    }
  },
  
  // Course endpoints
  courses: {
    getAll: (params) => api.get('/courses', { params }),
    getById: (id) => api.get(`/courses/${id}`),
    create: (data) => api.post('/courses', data),
    update: (id, data) => api.put(`/courses/${id}`, data),
    delete: (id) => api.delete(`/courses/${id}`),
    getByLecturer: (lecturerId) => api.get(`/courses/lecturer/${lecturerId}`),
    getByStudent: (studentId) => api.get(`/courses/student/${studentId}`),
    addStudent: (courseId, studentId) => api.post(`/courses/${courseId}/students`, { student_id: studentId }),
    removeStudent: (courseId, studentId) => api.delete(`/courses/${courseId}/students/${studentId}`)
  },

  // Lecturer dashboard
  lecturerDashboard: {
    getOverview: () => api.get('/lecturer-dashboard/overview'),
    getWorkloadStats: () => api.get('/lecturer-dashboard/workload-stats'),
    getCoursesInfo: () => api.get('/lecturer-dashboard/courses-info'),
    getHomeworkChecker: (status = 'pending', courseId = null) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (courseId) params.append('course_id', courseId);
      return api.get(`/lecturer-dashboard/homework-checker?${params.toString()}`);
    }
  },

  // Student dashboard
  studentDashboard: {
    getOverview: () => api.get('/student-dashboard/overview'),
    getHomeworkPlanner: (status = 'all', courseId = null, upcomingDays = 7) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (courseId) params.append('course_id', courseId);
      if (upcomingDays) params.append('upcoming_days', upcomingDays);
      return api.get(`/student-dashboard/homework-planner?${params.toString()}`);
    },
    getClassesPlanner: (weekStart = null) => {
      const params = new URLSearchParams();
      if (weekStart) params.append('week_start', weekStart);
      return api.get(`/student-dashboard/classes-planner?${params.toString()}`);
    },
    getExams: (status = 'all', courseId = null) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (courseId) params.append('course_id', courseId);
      return api.get(`/student-dashboard/exams?${params.toString()}`);
    },
    getStudyTimer: (days = 7) => {
      const params = new URLSearchParams();
      if (days) params.append('days', days);
      return api.get(`/student-dashboard/study-timer?${params.toString()}`);
    },
    saveStudySession: (data) => api.post('/student-dashboard/study-timer/session', data),
    getChoosePartner: (courseId = null, homeworkId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      if (homeworkId) params.append('homework_id', homeworkId);
      return api.get(`/student-dashboard/choose-partner?${params.toString()}`);
    },
    getCoursesInfo: () => api.get('/student-dashboard/courses-info'),
    getStudyProgress: (days = 30) => {
      const params = new URLSearchParams();
      if (days) params.append('days', days);
      return api.get(`/student-dashboard/study-progress?${params.toString()}`);
    },
    getGrades: (courseId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      return api.get(`/student-dashboard/grades?${params.toString()}`);
    }
  },

  // Lecturer management
  lecturerManagement: {
    getCourses: () => api.get('/lecturer-management/courses'),
    createHomework: (data) => api.post('/lecturer-management/homework', data),
    updateHomework: (id, data) => api.put(`/lecturer-management/homework/${id}`, data),
    deleteHomework: (id) => api.delete(`/lecturer-management/homework/${id}`),
    createClass: (data) => api.post('/lecturer-management/classes', data),
    updateClass: (id, data) => api.put(`/lecturer-management/classes/${id}`, data),
    deleteClass: (id) => api.delete(`/lecturer-management/classes/${id}`),
    createExam: (data) => api.post('/lecturer-management/exams', data),
    updateExam: (id, data) => api.put(`/lecturer-management/exams/${id}`, data),
    deleteExam: (id) => api.delete(`/lecturer-management/exams/${id}`)
  },

  // Student submission
  studentSubmission: {
    getHomeworkDetails: (homeworkId) => api.get(`/student-submission/homework/${homeworkId}`),
    submitHomework: (homeworkId, formData) => api.post(`/student-submission/homework/${homeworkId}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
    getSubmittedFiles: (homeworkId) => api.get(`/student-submission/homework/${homeworkId}/files`),
    downloadFile: (fileId) => api.get(`/student-submission/files/${fileId}/download`),
    deleteFile: (fileId) => api.delete(`/student-submission/files/${fileId}`),
    selectPartner: (homeworkId, partnerId) => api.post(`/student-submission/homework/${homeworkId}/partner`, { partner_id: partnerId }),
    removePartner: (homeworkId) => api.delete(`/student-submission/homework/${homeworkId}/partner`)
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
