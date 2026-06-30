import api from './axios.js';

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
