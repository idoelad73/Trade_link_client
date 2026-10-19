import api from './axios.js';

// For site-based deposits pass siteId; for direct/quick-search pass messageId instead.
export const createDepositIntent = (siteId, amount, messageId = null) =>
  api.post('/stripe/create-deposit-intent', {
    ...(messageId ? { messageId } : { siteId }),
    amount,
  }).then((r) => r.data);
