import api from './axios.js';

export const getMe           = ()           => api.get('/trade/me').then(r => r.data.trade);
export const updateMe        = (data)       => api.patch('/trade/me', data).then(r => r.data.trade);
export const updateSchedule  = (busyDays)   => api.patch('/trade/schedule', { busyDays }).then(r => r.data.busyDays);
export const updateLocation  = (lat, lng)   => api.patch('/trade/location', { lat, lng });
export const getMessages     = ()           => api.get('/trade/messages').then(r => r.data.messages);
export const approveMessage  = (id)         => api.patch(`/trade/messages/${id}/approve`).then(r => r.data);
export const findJobs        = (distance, unit) => api.get(`/trade/find-jobs?distance=${distance}&unit=${unit}`).then(r => r.data);
export const applyToJob       = (siteId, lang, date) => api.post(`/trade/jobs/${siteId}/apply`, { lang, date }).then(r => r.data);
export const requestReschedule = (siteId, newDate)   => api.post('/trade/reschedule', { siteId, newDate }).then(r => r.data);
export const removeBooking     = (siteId)            => api.delete('/trade/bookings', { data: { siteId } }).then(r => r.data);
export const getTradeChatBySite = (siteId) => api.get(`/chat/trade/${siteId}`).then(r => r.data);
export const uploadChatFile     = (formData) => api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const getApprovedOrderDates   = () => api.get('/trade/approved-orders').then(r => r.data.orders);
export const checkWorkLog            = (siteId, date) => api.get(`/trade/work-log/check?siteId=${siteId}&date=${date}`).then(r => r.data);
export const submitWorkLog           = (payload)  => api.post('/trade/work-log', payload).then(r => r.data);
export const getPaymentApprovedCount = ()  => api.get('/trade/payment-approved/count').then(r => r.data.count);
// Returns { orders: [...approved], rejected: [...rejectedNotices] }
export const getPaymentApproved      = ()  => api.get('/trade/payment-approved').then(r => r.data);
