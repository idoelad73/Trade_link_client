import api from './axios.js';
import useAuthStore from '../stores/authStore.js';

export async function registerTrade(formData) {
  const { data } = await api.post('/auth/register/trade', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function registerContractor(payload) {
  const { data } = await api.post('/auth/register/contractor', payload);
  return data;
}

export async function loginTrade(payload) {
  const { data } = await api.post('/auth/login/trade', payload);
  return data;
}

export async function loginContractor(payload) {
  const { data } = await api.post('/auth/login/contractor', payload);
  return data;
}

export async function forgotPassword(payload) {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data;
}

export async function resetPassword(payload) {
  const { data } = await api.post('/auth/reset-password', payload);
  return data;
}

// Exchange the httpOnly refresh cookie for a fresh access token + user.
// Optional on app load: if a persisted access token has expired, call this once
// at startup so the UI starts authenticated instead of waiting for the first
// protected request to 401 and recover. The axios interceptor also refreshes
// lazily, so this is a convenience, not a requirement.
export async function refreshSession() {
  const { data } = await api.post('/auth/refresh');
  if (data?.token) useAuthStore.getState().setAuth({ user: data.user, token: data.token });
  return data;
}

// Revoke the session server-side (clears the refresh cookie + its stored hash),
// then clear local auth. Best-effort: local state is cleared even if the network
// call fails, so the user is always logged out client-side.
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore — we clear local state regardless
  }
  useAuthStore.getState().clearAuth();
}
