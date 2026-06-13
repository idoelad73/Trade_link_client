import api from './axios.js';

/**
 * createPaymentIntent
 * POST /api/stripe/create-payment-intent
 * Contractor-only. Server verifies order ownership + approved status.
 * Returns { clientSecret, amount, tradeName }
 */
export const createPaymentIntent = (orderId) =>
  api.post('/stripe/create-payment-intent', { orderId }).then((r) => r.data);
