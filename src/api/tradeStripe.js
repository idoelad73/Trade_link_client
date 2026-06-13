import api from './axios.js';

export const getStripeStatus      = ()  => api.get('/trade/stripe/status').then(r => r.data);
export const startOnboarding      = ()  => api.post('/trade/stripe/onboard').then(r => r.data);
export const completeOnboarding   = ()  => api.post('/trade/stripe/onboard/complete').then(r => r.data);
