import axios from 'axios';

// Base URL for API - will be replaced with actual backend URL in production
const API_BASE_URL = '';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage or other storage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      
      // Redirect to login page or show login modal
      // window.location.href = '/login';
    }
    
    // Handle 500 server errors with user-friendly message
    if (error.response && error.response.status >= 500) {
      // Server error occurred
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient; 