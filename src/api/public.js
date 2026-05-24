import api from './axios.js';

export const getPublicSites    = () => api.get('/sites').then(r => r.data.sites);
export const getPublicTradePros = () => api.get('/tradepros').then(r => r.data.tradePros);
