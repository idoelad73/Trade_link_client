import axios from 'axios';
import useAuthStore from '../stores/authStore.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// Request interceptor — attach JWT as Bearer token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
