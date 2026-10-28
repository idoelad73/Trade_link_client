import api from './axios.js';

export const getPublicSites    = (params = {}) => api.get('/sites', { params }).then(r => r.data.sites);
export const getPublicTradePros = (params = {}) => api.get('/tradepros', { params }).then(r => r.data.tradePros);

// Typical market rate per trade — fetched once per page load, then cached
let tradeRatesPromise = null;
export const getTradeRates = () => {
  tradeRatesPromise ??= api.get('/trade-rates')
    .then(r => r.data.rates)
    .catch((err) => { tradeRatesPromise = null; throw err; });
  return tradeRatesPromise;
};
