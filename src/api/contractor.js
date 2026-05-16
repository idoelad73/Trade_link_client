import api from './axios.js';

// Profile
export const getMe    = ()     => api.get('/contractor/me').then(r => r.data.contractor);
export const updateMe = (data) => api.patch('/contractor/me', data).then(r => r.data.contractor);

// Sites
export const createSite  = (form)  => api.post('/contractor/sites', form).then(r => r.data.site);
export const getSites    = ()      => api.get('/contractor/sites').then(r => r.data.sites);
export const getSite     = (id)    => api.get(`/contractor/sites/${id}`).then(r => r.data.site);
export const updateSite  = (id, form) => api.patch(`/contractor/sites/${id}`, form).then(r => r.data.site);
export const deleteSite  = (id)    => api.delete(`/contractor/sites/${id}`).then(r => r.data);
