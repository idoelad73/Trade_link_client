import api from './axios.js';

export const getMe           = ()           => api.get('/trade/me').then(r => r.data.trade);
export const updateMe        = (data)       => api.patch('/trade/me', data).then(r => r.data.trade);
export const updateSchedule  = (busyDays)   => api.patch('/trade/schedule', { busyDays }).then(r => r.data.busyDays);
export const updateLocation  = (lat, lng)   => api.patch('/trade/location', { lat, lng });
