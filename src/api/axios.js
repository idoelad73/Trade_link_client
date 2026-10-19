import axios from 'axios';
import useAuthStore from '../stores/authStore.js';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // send the httpOnly refresh cookie on /auth/* calls
});

// Request interceptor — attach the short-lived access token as a Bearer header.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on one of these is terminal — bad credentials, an already-failing
// refresh, or logout. Trying to refresh-and-retry them would loop.
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
const skipRefresh = (url = '') => NO_REFRESH.some((p) => url.includes(p));

// Single-flight refresh. The access token is short-lived (2h) and
// POST /auth/refresh ROTATES the refresh cookie, so two concurrent refreshes
// would invalidate each other. Every 401 awaits the SAME in-flight refresh,
// then retries its original request once.
let refreshing = null;

function refreshAccessToken() {
  if (!refreshing) {
    // Bare axios (not `api`) so this request bypasses the interceptors below
    // and can't itself trigger the 401-retry path.
    refreshing = axios
      .post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        if (!data?.token) throw new Error('No token in refresh response');
        useAuthStore.getState().setToken(data.token);
        return data.token;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

// Response interceptor — on a 401, transparently refresh the access token once
// and replay the original request. If refresh fails, the session is over.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry || skipRefresh(original.url)) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const token = await refreshAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshError) {
      // Only bounce a user who thought they were logged in — don't redirect an
      // anonymous caller who merely hit a protected endpoint.
      const wasAuthed = useAuthStore.getState().isAuthenticated;
      useAuthStore.getState().clearAuth();
      if (wasAuthed && typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.assign('/');
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
