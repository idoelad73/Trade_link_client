import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// Request interceptor — attach token if needed
api.interceptors.request.use((config) => {
  // functional code added later
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // functional code added later
    return Promise.reject(err);
  }
);

export default api;
