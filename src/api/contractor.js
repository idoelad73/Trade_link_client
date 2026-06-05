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

// Trade search
export const findTradesForSite = (siteId, trade, distance, unit, maxRate) =>
  api.get(`/contractor/sites/${siteId}/find-trades`, { params: { trade, distance, unit, ...(maxRate ? { maxRate } : {}) } })
     .then(r => r.data);

// Trade pro calendar (busy days)
export const getTradeBusyDays = (tradeId) =>
  api.get(`/contractor/trade-pros/${tradeId}/busy-days`).then(r => r.data.pro);

// Ask trade pro for availability on a specific date
export const askAvailability = (tradeId, date, siteName, siteAddress, lang, siteId) =>
  api.post(`/contractor/trade-pros/${tradeId}/ask-availability`, { date, siteName, siteAddress, lang, siteId }).then(r => r.data);

// Applications (trade pros who applied to contractor sites)
export const getApplications    = () => api.get('/contractor/applications').then(r => r.data.applications);
export const approveApplication = (id, scheduledDate) => api.patch(`/contractor/applications/${id}/approve`, { scheduledDate }).then(r => r.data);

// Availability-approved notifications
export const getNotifications       = () => api.get('/contractor/notifications').then(r => r.data.notifications);
export const markNotificationsRead  = () => api.patch('/contractor/notifications/read').then(r => r.data);
