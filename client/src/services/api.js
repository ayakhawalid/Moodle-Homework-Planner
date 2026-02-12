import axios from 'axios';

// Create axios instance with base configuration
// Note: The baseURL should be the Render backend URL without /api if Render serves at root
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com',
  timeout: 20000, // 20 seconds - reasonable timeout for most requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate axios instance with longer timeout for user sync operations
// These may need more time during initial load or cold starts
const apiSync = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com',
  timeout: 30000, // 30 seconds for sync operations (first request might be slow)
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

// Helper to add timeout to token provider
const withTimeout = (promise, timeoutMs = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Token retrieval timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    console.log('API Request Interceptor - Token Provider:', !!tokenProvider);
    console.log('API Request Config - Timeout:', config.timeout, 'URL:', config.baseURL + config.url);
    
    if (tokenProvider) {
      try {
        // Add timeout to token retrieval so it doesn't hang forever
        const token = await withTimeout(tokenProvider(), 5000);
        console.log('API Request Interceptor - Token retrieved:', !!token);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('API Request Interceptor - Authorization header set');
        } else {
          console.warn('API Request Interceptor - No token received from provider');
        }
      } catch (error) {
        console.error('Failed to get access token for request:', error);
        // Don't block the request, just log the error
        // Some endpoints might work without auth
      }
    } else {
      console.warn('API Request Interceptor - No token provider set');
    }

    console.log('API Request:', config.method?.toUpperCase(), config.url, 'Timeout:', config.timeout);
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
    const status = error.response?.status || 'No Status';
    const data = error.response?.data || error.message || 'No Data';
    const url = error.config?.url || 'Unknown URL';
    const baseURL = error.config?.baseURL || '';
    const fullUrl = baseURL + url;
    const timeout = error.config?.timeout || 'Unknown';
    
    // Enhanced error logging for diagnostics
    console.error('API Response Error:', {
      status,
      message: error.message,
      code: error.code,
      url: fullUrl,
      timeout: timeout,
      responseData: data
    });
    
    // Check for network errors (backend not reachable)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('⏱️  TIMEOUT ERROR - Request took too long');
      console.error('   URL:', fullUrl);
      console.error('   Configured Timeout:', timeout + 'ms');
      console.error('   Backend URL:', baseURL);
      console.error('   This could mean:');
      console.error('   1. Backend is not running');
      console.error('   2. Backend URL is incorrect');
      console.error('   3. Network connectivity issue');
      console.error('   4. Backend is too slow (cold start)');
      
      // Add more helpful error message
      error.userMessage = `Request to ${url} timed out after ${timeout}ms. Check if backend at ${baseURL} is running.`;
    }
    
    // Check for network errors (no connection)
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      console.error('🌐 NETWORK ERROR - Cannot reach backend');
      console.error('   URL:', fullUrl);
      console.error('   Backend URL:', baseURL);
      console.error('   Check:');
      console.error('   1. Is backend running?');
      console.error('   2. Is the URL correct?');
      console.error('   3. CORS configuration?');
      error.userMessage = `Cannot connect to backend at ${baseURL}. Is the server running?`;
    }
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      console.log('Unauthorized access - redirecting to login');
      // We can dispatch a logout action here
    }
    
    return Promise.reject(error);
  }
);

// Request interceptor for sync instance - same logic as api but with longer timeout
apiSync.interceptors.request.use(
  async (config) => {
    console.log('API Sync Request - Timeout:', config.timeout, 'URL:', config.baseURL + config.url);
    if (tokenProvider) {
      try {
        const token = await withTimeout(tokenProvider(), 5000);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get access token for sync request:', error);
      }
    }
    return config;
  },
  (error) => {
    console.error('API Sync Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for sync instance
apiSync.interceptors.response.use(
  (response) => {
    console.log('API Sync Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    const status = error.response?.status || 'No Status';
    const data = error.response?.data || error.message || 'No Data';
    const url = error.config?.url || 'Unknown URL';
    const baseURL = error.config?.baseURL || '';
    const fullUrl = baseURL + url;
    const timeout = error.config?.timeout || 'Unknown';
    
    console.error('API Sync Response Error:', {
      status,
      message: error.message,
      code: error.code,
      url: fullUrl,
      timeout: timeout,
      responseData: data
    });
    
    // Same diagnostic logging for sync errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('⏱️  SYNC TIMEOUT ERROR');
      console.error('   URL:', fullUrl);
      console.error('   Configured Timeout:', timeout + 'ms');
      console.error('   Backend URL:', baseURL);
      error.userMessage = `Sync request to ${url} timed out after ${timeout}ms. Check backend at ${baseURL}.`;
    }
    
    if (error.response?.status === 401) {
      console.log('Unauthorized access - redirecting to login');
    }
    
    return Promise.reject(error);
  }
);

// Helper function to add /api prefix if not already present
const withApi = (path) => {
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/')) return `/api${path}`;
  return `/api/${path}`;
};

// API service functions
export const apiService = {
  // Health check
  health: async () => {
    const response = await api.get(withApi('/health'));
    return response.data;
  },

  // Auth test
  authTest: async () => {
    const response = await api.get(withApi('/auth-test'));
    return response.data;
  },
  
  // User endpoints
  user: {
    getProfile: async () => {
      // Use apiSync for longer timeout (30s) - important for user sync operations
      const response = await apiSync.get(withApi('/users/profile'));
      return response.data;
    },
    updateProfile: async (data) => {
      const response = await api.put(withApi('/users/profile'), data);
      return response.data;
    },
    getAll: async (params) => {
      const response = await api.get(withApi('/users'), { params });
      return response.data;
    },
    getStats: async () => {
      const response = await api.get(withApi('/users/stats'));
      return response.data;
    },
    getById: async (id) => {
      const response = await api.get(withApi(`/users/${id}`));
      return response.data;
    },
    updateById: async (id, data) => {
      const response = await api.put(withApi(`/users/${id}`), data);
      return response.data;
    },
    checkUsername: async (username) => {
      const response = await api.get(withApi('/users/username-available'), { params: { u: username } });
      return response.data;
    },
    updateRole: async (id, role) => {
      const response = await api.put(withApi(`/users/${id}/role`), { role });
      return response.data;
    },
    setPassword: async (id, password) => {
      const response = await api.put(withApi(`/users/${id}/password`), { password });
      return response.data;
    },
    deactivate: async (id) => {
      const response = await api.delete(withApi(`/users/${id}`));
      return response.data;
    },
    syncProfile: async (data) => {
      // Use apiSync for longer timeout (30s) - important for user sync operations
      const response = await apiSync.post(withApi('/users'), data);
      return response.data;
    },
    deleteAccount: async () => {
      const response = await api.delete(withApi('/users/me'));
      return response.data;
    }
  },

  // Settings endpoints
  settings: {
    getAll: async () => {
      const response = await api.get(withApi('/settings'));
      return response.data;
    },
    saveAll: async (items) => {
      const response = await api.put(withApi('/settings'), items);
      return response.data;
    }
  },

  // Analytics endpoints
  analytics: {
    getOverview: async () => {
      const response = await api.get(withApi('/analytics/overview'));
      return response.data;
    }
  },

  roleRequests: {
    submit: async (role) => {
      const response = await api.post(withApi('/role-requests'), { role });
      return response.data;
    },
    list: async (status) => {
      const params = status ? { status } : {};
      const response = await api.get(withApi('/role-requests'), { params });
      return response.data;
    },
    getMyRequests: async () => {
      const response = await api.get(withApi('/role-requests/my'));
      return response.data;
    },
    approve: async (id) => {
      const response = await api.post(withApi(`/role-requests/${id}/approve`));
      return response.data;
    },
    reject: async (id, note) => {
      const response = await api.post(withApi(`/role-requests/${id}/reject`), { note });
      return response.data;
    }
  },
  
  // Course endpoints
  courses: {
    getAll: (params) => api.get(withApi('/courses'), { params }),
    getById: (id) => api.get(withApi(`/courses/${id}`)),
    create: (data) => api.post(withApi('/courses'), data),
    update: (id, data) => api.put(withApi(`/courses/${id}`), data),
    delete: (id) => api.delete(withApi(`/courses/${id}`)),
    getByLecturer: (lecturerId) => api.get(withApi(`/courses/lecturer/${lecturerId}`)),
    getByStudent: (studentId) => api.get(withApi(`/courses/student/${studentId}`)),
    addStudent: (courseId, studentId) => api.post(withApi(`/courses/${courseId}/students`), { student_id: studentId }),
    updatePartnerSettings: (id, settings) => api.put(withApi(`/courses/${id}/partner-settings`), settings),
    removeStudent: (courseId, studentId) => api.delete(withApi(`/courses/${courseId}/students/${studentId}`)),
    getPendingVerifications: () => api.get(withApi('/courses/pending-verifications')),
    verify: (courseId, verificationStatus) => api.put(withApi(`/courses/${courseId}/verify`), { verification_status: verificationStatus }),
    getLecturers: () => api.get(withApi('/courses/lecturers'))
  },

  // Lecturer dashboard
  lecturerDashboard: {
    getOverview: () => api.get(withApi('/lecturer-dashboard/overview')),
    getWorkloadStats: () => api.get(withApi('/lecturer-dashboard/workload-stats')),
    getCoursesInfo: () => api.get(withApi('/lecturer-dashboard/courses-info')),
    getStudentCourseWorkload: (courseId) => api.get(withApi(`/lecturer-dashboard/student-course-workload/${courseId}`)),
        getHomeworkStatus: (courseId) => api.get(withApi(`/lecturer-dashboard/homework-status/${courseId}`)),
    getHomeworkStatusStudents: (courseId, homeworkId, status) =>
      api.get(withApi(`/lecturer-dashboard/homework-status/${courseId}/students?homeworkId=${encodeURIComponent(homeworkId)}&status=${encodeURIComponent(status)}`)),
        getHomeworkStatusAny: (courseId) => api.get(withApi(`/lecturer-dashboard/homework-status-any/${courseId}`)),
        getAllHomeworkStatus: () => api.get(withApi('/lecturer-dashboard/all-homework-status')),
        getAllHomework: () => api.get(withApi('/lecturer-dashboard/all-homework')),
        getAssignmentTimelineTable: (courseId = null) => api.get(withApi('/lecturer-dashboard/assignment-timeline-table' + (courseId ? `?course_id=${courseId}` : ''))),
    getHomeworkChecker: (status = 'pending', courseId = null) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (courseId) params.append('course_id', courseId);
      return api.get(withApi(`/lecturer-dashboard/homework-checker?${params.toString()}`));
    },
    getClasses: (courseId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      return api.get(withApi(`/classes?${params.toString()}`));
    },
    getExams: (courseId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      return api.get(withApi(`/exams?${params.toString()}`));
    }
  },

  // Exams
  exams: {
    getAll: (courseId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      return api.get(withApi(`/exams?${params.toString()}`));
    },
    create: (data) => api.post(withApi('/exams'), data),
    update: (id, data) => api.put(withApi(`/exams/${id}`), data),
    delete: (id) => api.delete(withApi(`/exams/${id}`))
  },

  // Classes
  classes: {
    getAll: (courseId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      return api.get(withApi(`/classes?${params.toString()}`));
    },
    create: (data) => api.post(withApi('/classes'), data),
    update: (id, data) => api.put(withApi(`/classes/${id}`), data),
    delete: (id) => api.delete(withApi(`/classes/${id}`))
  },

  // Student dashboard
  studentDashboard: {
    getOverview: () => api.get(withApi('/student-dashboard/overview')),
    getHomeworkPlanner: (status = 'all', courseId = null, upcomingDays = 7) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (courseId) params.append('course_id', courseId);
      if (upcomingDays) params.append('upcoming_days', upcomingDays);
      return api.get(withApi(`/student-dashboard/homework-planner?${params.toString()}`));
    },
    getClassesPlanner: (weekStart = null) => {
      const params = new URLSearchParams();
      if (weekStart) params.append('week_start', weekStart);
      return api.get(withApi(`/student-dashboard/classes-planner?${params.toString()}`));
    },
    getExams: (status = 'all', courseId = null) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (courseId) params.append('course_id', courseId);
      return api.get(withApi(`/student-dashboard/exams?${params.toString()}`));
    },
    getStudyTimer: (days = 7) => {
      const params = new URLSearchParams();
      if (days) params.append('days', days);
      return api.get(withApi(`/student-dashboard/study-timer?${params.toString()}`));
    },
    saveStudySession: (data) => api.post(withApi('/student-dashboard/study-timer/session'), data),
    getChoosePartner: (courseId = null, homeworkId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      if (homeworkId) params.append('homework_id', homeworkId);
      return api.get(withApi(`/student-dashboard/choose-partner?${params.toString()}`));
    },
    getCoursesInfo: () => api.get(withApi('/student-dashboard/courses-info')),
    getStudyProgress: (days = 30) => {
      const params = new URLSearchParams();
      if (days) params.append('days', days);
      return api.get(withApi(`/student-dashboard/study-progress?${params.toString()}`));
    },
    updateWeeklyGoal: (goal) => api.put(withApi('/student-dashboard/weekly-goal'), { weekly_goal: goal }),
    getGrades: (courseId = null) => {
      const params = new URLSearchParams();
      if (courseId) params.append('course_id', courseId);
      return api.get(withApi(`/student-dashboard/grades?${params.toString()}`));
    },
    getPartnerRequests: () => api.get(withApi('/student-dashboard/partner-requests')),
    respondToPartnerRequest: (requestId, action) => {
      console.log('API Service - respondToPartnerRequest called:', { requestId, action });
      return api.post(withApi(`/student-dashboard/partner-requests/${requestId}/respond`), { action });
    },
    getStudentCourses: () => api.get(withApi('/student-dashboard/student-courses')),
    addClass: (classData) => api.post(withApi('/student-dashboard/add-class'), classData),
    addExam: (examData) => api.post(withApi('/student-dashboard/add-exam'), examData)
  },

  // Lecturer management
  lecturerManagement: {
    getCourses: () => api.get(withApi('/lecturer-management/courses')),
    createHomework: (data) => api.post(withApi('/lecturer-management/homework'), data),
    updateHomework: (id, data) => api.put(withApi(`/lecturer-management/homework/${id}`), data),
    deleteHomework: (id) => api.delete(withApi(`/lecturer-management/homework/${id}`)),
    createClass: (data) => api.post(withApi('/lecturer-management/classes'), data),
    updateClass: (id, data) => api.put(withApi(`/lecturer-management/classes/${id}`), data),
    deleteClass: (id) => api.delete(withApi(`/lecturer-management/classes/${id}`)),
    createExam: (data) => api.post(withApi('/lecturer-management/exams'), data),
    updateExam: (id, data) => api.put(withApi(`/lecturer-management/exams/${id}`), data),
    deleteExam: (id) => api.delete(withApi(`/lecturer-management/exams/${id}`))
  },

  // Student submission
  studentSubmission: {
    getHomeworkDetails: (homeworkId) => api.get(withApi(`/student-submission/homework/${homeworkId}`)),
    submitHomework: (homeworkId, formData) => api.post(withApi(`/student-submission/homework/${homeworkId}/submit`), formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
    getSubmittedFiles: (homeworkId) => api.get(withApi(`/student-submission/homework/${homeworkId}/files`)),
    downloadFile: (fileId) => api.get(withApi(`/student-submission/files/${fileId}/download`)),
    deleteFile: (fileId) => api.delete(withApi(`/student-submission/files/${fileId}`)),
    updateSubmission: (homeworkId, formData) => api.put(withApi(`/student-submission/homework/${homeworkId}/submission`), formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
    deleteSubmission: (homeworkId) => api.delete(withApi(`/student-submission/homework/${homeworkId}/submission`)),
    selectPartner: (homeworkId, partnerId, notes) => {
      console.log('API selectPartner called with:', { homeworkId, partnerId, notes });
      console.log('URL will be:', `/student-submission/homework/${homeworkId}/partner`);
      return api.post(withApi(`/student-submission/homework/${homeworkId}/partner`), { partner_id: partnerId, notes: notes || '' });
    },
    removePartner: (homeworkId) => api.delete(withApi(`/student-submission/homework/${homeworkId}/partner`)),
    verifyGrade: (homeworkId, claimedGrade, screenshotFile) => {
      const formData = new FormData();
      formData.append('homeworkId', homeworkId);
      formData.append('claimedGrade', claimedGrade);
      formData.append('screenshot', screenshotFile);
      return api.post(withApi('/student-submission/verify-grade'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    saveStudySession: (data) => api.post(withApi('/student-dashboard/study-timer/session'), data)
  },

    // Student Homework endpoints
    studentHomework: {
      getHomework: () => api.get(withApi('/student-homework')),
      getLecturerHomework: () => api.get(withApi('/student-homework/lecturer/all')),
      createHomework: (data) => api.post(withApi('/student-homework'), data),
      updateHomework: (id, data) => api.put(withApi(`/student-homework/${id}`), data),
      startHomework: (homeworkId) => api.put(withApi(`/student-homework/${homeworkId}/start`)),
      completeHomework: (homeworkId, claimedGrade, isLate = false) => api.put(withApi(`/student-homework/${homeworkId}/complete`), { claimed_grade: claimedGrade, is_late: isLate }),
      getVerifications: () => api.get(withApi('/student-homework/lecturer/verifications')),
      verifyDeadline: (homeworkId, data) => api.put(withApi(`/student-homework/${homeworkId}/verify-deadline`), data),
      deleteHomework: (homeworkId) => api.delete(withApi(`/student-homework/${homeworkId}`))
    },

  // Test data endpoints
  testData: {
    getStatus: () => api.get(withApi('/test-data/status')),
    createSample: () => api.post(withApi('/test-data/create-sample'))
  },
  
  // Homework endpoints (to be implemented)
  homework: {
    getAll: (params) => api.get(withApi('/homework'), { params }),
    getById: (id) => api.get(withApi(`/homework/${id}`)),
    create: (data) => api.post(withApi('/homework'), data),
    update: (id, data) => api.put(withApi(`/homework/${id}`), data),
    delete: (id) => api.delete(withApi(`/homework/${id}`)),
    getByCourse: (courseId) => api.get(withApi(`/homework/course/${courseId}`)),
    getUpcoming: (days) => api.get(withApi(`/homework/upcoming?days=${days}`))
  },
  
  // Grade endpoints (to be implemented)
  grades: {
    getAll: (params) => api.get(withApi('/grades'), { params }),
    getById: (id) => api.get(withApi(`/grades/${id}`)),
    create: (data) => api.post(withApi('/grades'), data),
    update: (id, data) => api.put(withApi(`/grades/${id}`), data),
    delete: (id) => api.delete(withApi(`/grades/${id}`)),
    getByStudent: (studentId) => api.get(withApi(`/grades/student/${studentId}`)),
    getByHomework: (homeworkId) => api.get(withApi(`/grades/homework/${homeworkId}`))
  },
  
  // Study Progress endpoints (to be implemented)
  studyProgress: {
    getAll: (params) => api.get(withApi('/study-progress'), { params }),
    getById: (id) => api.get(withApi(`/study-progress/${id}`)),
    create: (data) => api.post(withApi('/study-progress'), data),
    update: (id, data) => api.put(withApi(`/study-progress/${id}`), data),
    delete: (id) => api.delete(withApi(`/study-progress/${id}`)),
    getByStudent: (studentId) => api.get(withApi(`/study-progress/student/${studentId}`)),
    getWeeklySummary: (studentId, weekStart) => 
      api.get(withApi(`/study-progress/weekly/${studentId}?week=${weekStart}`)),
    getMonthlySummary: (studentId, year, month) => 
      api.get(withApi(`/study-progress/monthly/${studentId}?year=${year}&month=${month}`))
  },
  
  // File endpoints (to be implemented)
  files: {
    upload: (formData) => api.post(withApi('/files/upload'), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getById: (id) => api.get(withApi(`/files/${id}`)),
    download: (id) => api.get(withApi(`/files/${id}/download`), { responseType: 'blob' }),
    delete: (id) => api.delete(withApi(`/files/${id}`)),
    getByHomework: (homeworkId) => api.get(withApi(`/files/homework/${homeworkId}`)),
    getByClass: (classId) => api.get(withApi(`/files/class/${classId}`))
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

// Diagnostic function to test backend connectivity and check configuration
export const testBackendConnection = async () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com';
  const healthUrl = `${baseURL}/api/health`;
  
  console.log('🔍 Backend Connection Test');
  console.log('Backend URL:', baseURL);
  console.log('Health Check URL:', healthUrl);
  console.log('API Instance Timeout:', api.defaults.timeout, 'ms');
  console.log('API Sync Instance Timeout:', apiSync.defaults.timeout, 'ms');
  
  try {
    // Test with simple fetch first (no axios)
    console.log('Testing with fetch...');
    const fetchStart = Date.now();
    const fetchResponse = await fetch(healthUrl, { 
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10s timeout for quick test
    });
    const fetchTime = Date.now() - fetchStart;
    const fetchData = await fetchResponse.json();
    
    console.log('✅ Fetch test successful:', {
      status: fetchResponse.status,
      time: fetchTime + 'ms',
      data: fetchData
    });
    
    // Test with axios
    console.log('Testing with axios...');
    const axiosStart = Date.now();
    const axiosResponse = await api.get('/api/health');
    const axiosTime = Date.now() - axiosStart;
    
    console.log('✅ Axios test successful:', {
      status: axiosResponse.status,
      time: axiosTime + 'ms',
      timeout: api.defaults.timeout,
      data: axiosResponse.data
    });
    
    return {
      success: true,
      backendUrl: baseURL,
      fetchTime,
      axiosTime,
      axiosTimeout: api.defaults.timeout,
      data: axiosResponse.data
    };
  } catch (error) {
    console.error('❌ Backend connection test failed:', error);
    return {
      success: false,
      backendUrl: baseURL,
      error: error.message,
      code: error.code,
      axiosTimeout: api.defaults.timeout
    };
  }
};

export default api;
