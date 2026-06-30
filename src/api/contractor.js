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
export const findTradesForSite = (siteId, trade, distance, unit, maxRate, minRating) =>
  api.get(`/contractor/sites/${siteId}/find-trades`, {
    params: {
      trade, distance, unit,
      ...(maxRate   ? { maxRate }   : {}),
      ...(minRating ? { minRating } : {}),
    },
  }).then(r => r.data);

// Trade pro calendar (busy days)
export const getTradeBusyDays = (tradeId) =>
  api.get(`/contractor/trade-pros/${tradeId}/busy-days`).then(r => r.data.pro);

// Ask trade pro for availability on a specific date
export const askAvailability = (tradeId, date, siteName, siteAddress, lang, siteId, tradeName, workersOffered) =>
  api.post(`/contractor/trade-pros/${tradeId}/ask-availability`, {
    date, siteName, siteAddress, lang, siteId, tradeName, workersOffered,
  }).then(r => r.data);

// Get remaining worker slots for a trade+date on a site
export const getWorkersLeft = (siteId, tradeName, date) =>
  api.get(`/contractor/sites/${siteId}/workers-left`, { params: { tradeName, date } }).then(r => r.data);

export const getSiteDepositSummary = (siteId) =>
  api.get(`/contractor/sites/${siteId}/deposit-summary`).then(r => r.data);

export const confirmDeposit = (siteId, paymentIntentId) =>
  api.post('/contractor/deposit-confirmed', { siteId, paymentIntentId }).then(r => r.data);

// Applications (trade pros who applied to contractor sites)
export const getApplications      = () => api.get('/contractor/applications').then(r => r.data);
export const approveApplication        = (id, scheduledDate) => api.patch(`/contractor/applications/${id}/approve`, { scheduledDate }).then(r => r.data);
export const approveAvailabilityRequest = (id) => api.patch(`/contractor/messages/${id}/approve-availability`).then(r => r.data);
export const approveWorkerOffer        = (id) => api.patch(`/contractor/messages/${id}/approve-worker-offer`).then(r => r.data);
export const approveReschedule         = (id) => api.patch(`/contractor/messages/${id}/approve-reschedule`).then(r => r.data);
export const declineReschedule         = (id) => api.patch(`/contractor/messages/${id}/decline-reschedule`).then(r => r.data);
export const getWorkPlan        = (siteId) => api.get(`/contractor/sites/${siteId}/work-plan`).then(r => r.data);
export const getChatHistory     = (contractorId, tradeProId, siteId) => api.get(`/chat/${contractorId}/${tradeProId}/${siteId}`).then(r => r.data.chat);
export const uploadChatFile     = (formData) => api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const updateWorkPlanDate    = (siteId, tradeName, requiredDate) => api.patch(`/contractor/sites/${siteId}/work-plan`, { tradeName, requiredDate }).then(r => r.data);
export const requestWorkPlanDate   = (siteId, tradeName, requiredDate, lang) => api.post(`/contractor/sites/${siteId}/work-plan/request-date`, { tradeName, requiredDate, lang }).then(r => r.data);
export const deleteWorkPlanTrade = (siteId, tradeName) => api.delete(`/contractor/sites/${siteId}/work-plan`, { data: { tradeName } }).then(r => r.data);

// Payment approvals (tradehours_orders)
export const getPaymentApprovalsCount  = ()               => api.get('/contractor/payment-approvals/count').then(r => r.data.pendingCount);
export const getPaymentApprovals       = ()               => api.get('/contractor/payment-approvals').then(r => r.data.orders);
// Returns { deleted: true, _id } on rejection OR { order } on approval
// Returns 402 { needsOverage, overageAmount, clientSecret, piId } if hours exceed deposit
export const updatePaymentApproval = (orderId, status, overagePiId = null) =>
  api.patch(`/contractor/payment-approvals/${orderId}`, { status, ...(overagePiId ? { overagePiId } : {}) }).then(r => r.data);


// Trade grading
export const getGradableTrades  = () => api.get('/contractor/trade-grades/eligible').then(r => r.data.trades);
export const submitTradeGrade   = (trade_id, site_id, order_id, trade_grade, review_text, photos) =>
  api.post('/contractor/trade-grades', { trade_id, site_id, order_id, trade_grade, review_text, photos }).then(r => r.data);
export const uploadGradePhoto   = (file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return api.post('/contractor/trade-grades/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.url);
};
