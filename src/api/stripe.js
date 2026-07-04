import api from './axios.js';

/**
 * createPaymentIntent
 * POST /api/stripe/create-payment-intent
 * Contractor-only. Server verifies order ownership + approved status.
 * Returns { clientSecret, amount, tradeName }
 */
export const createPaymentIntent = (orderId) =>
  api.post('/stripe/create-payment-intent', { orderId }).then((r) => r.data);

// For site-based deposits pass siteId; for direct/quick-search pass messageId instead.
export const createDepositIntent = (siteId, amount, messageId = null) =>
  api.post('/stripe/create-deposit-intent', {
    ...(messageId ? { messageId } : { siteId }),
    amount,
  }).then((r) => r.data);
