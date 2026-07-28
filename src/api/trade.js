import api from './axios.js';

export const getMe           = ()           => api.get('/trade/me').then(r => r.data.trade);
export const updateMe        = (data)       => api.patch('/trade/me', data).then(r => r.data.trade);
export const updateSchedule  = (busyDays)   => api.patch('/trade/schedule', { busyDays }).then(r => r.data.busyDays);
export const updateLocation  = (lat, lng)   => api.patch('/trade/location', { lat, lng });
export const getMessages     = ()           => api.get('/trade/messages').then(r => r.data.messages);
export const getScheduleBookings = ()       => api.get('/trade/schedule-bookings').then(r => r.data.bookings);
export const approveMessage  = (id, workersOffered) => api.patch(`/trade/messages/${id}/approve`, { workersOffered }).then(r => r.data);
export const findJobs        = (distance, unit) => api.get(`/trade/find-jobs?distance=${distance}&unit=${unit}`).then(r => r.data);
export const applyToJob       = (siteId, lang, date, workers_no = 1) => api.post(`/trade/jobs/${siteId}/apply`, { lang, date, workers_no }).then(r => r.data);
export const requestReschedule = (siteId, newDate)   => api.post('/trade/reschedule', { siteId, newDate }).then(r => r.data);
export const removeBooking     = (siteId)            => api.delete('/trade/bookings', { data: { siteId } }).then(r => r.data);
export const getTradeChatBySite = (siteId) => api.get(`/chat/trade/${siteId}`).then(r => r.data);
export const uploadChatFile     = (formData) => api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const getMyReceipts           = (params = {}) => api.get('/trade/receipts', { params }).then(r => r.data.receipts);
// Picker options for the receipts search bar
// → { contractors: [{ id, name }], sites: [{ id, name, address }] }
export const getReceiptFilters       = () => api.get('/trade/receipts/filters').then(r => r.data);
export const getMyOrders             = () => api.get('/trade/orders').then(r => r.data.orders);
export const getApprovedOrderDates   = () => api.get('/trade/approved-orders').then(r => r.data.orders);
export const checkWorkLog            = (siteId, date) => api.get(`/trade/work-log/check?siteId=${siteId}&date=${date}`).then(r => r.data);
// Works for both flows — pass { siteId, date } for site-based bookings or
// { contractorId, date } for direct/quick-search bookings. { hasDeposit: bool }
export const getDepositStatus = ({ siteId, contractorId, date }) => {
  const params = new URLSearchParams({ date });
  if (siteId) params.set('siteId', siteId);
  else if (contractorId) params.set('contractorId', contractorId);
  return api.get(`/trade/deposit-status?${params.toString()}`).then(r => r.data);
};
// Bulk list of all held direct-search deposits — [{ contractorId, date }]
export const getDepositedRequests    = () => api.get('/trade/deposited-requests').then(r => r.data.deposits);
export const submitWorkLog           = (payload)  => api.post('/trade/work-log', payload).then(r => r.data);
export const getPaymentApprovedCount = ()  => api.get('/trade/payment-approved/count').then(r => r.data.count);
// Approved work whose payout is stuck on bank-detail problems — { blocked, reason, totalOwed, ... }
export const getPayoutBlocked        = ()  => api.get('/trade/payout-blocked').then(r => r.data);
// Returns { orders: [...approved], rejected: [...rejectedNotices] }
export const getPaymentApproved      = ()  => api.get('/trade/payment-approved').then(r => r.data);

// Working hours & portfolio photos
export const updateWorkingHours = (workingHours) =>
  api.patch('/trade/working-hours', { workingHours }).then(r => r.data.workingHours);
export const addPortfolioPhoto = (file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.post('/trade/portfolio-photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.portfolioPhotos);
};
export const deletePortfolioPhoto = (index) =>
  api.delete(`/trade/portfolio-photos/${index}`).then(r => r.data.portfolioPhotos);

// Contractor grading
export const getGradableContractors     = () => api.get('/trade/contractor-grades/eligible').then(r => r.data.contractors);
export const submitContractorGrade      = (contractor_id, site_id, order_id, trade_grade, review_text, photos) =>
  api.post('/trade/contractor-grades', { contractor_id, site_id, order_id, trade_grade, review_text, photos }).then(r => r.data);
export const uploadContractorGradePhoto = (file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.post('/trade/contractor-grades/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.url);
};

export const getContractorReviews = (contractorId) =>
  api.get(`/trade/contractor-grades/${contractorId}/reviews`).then(r => r.data);
