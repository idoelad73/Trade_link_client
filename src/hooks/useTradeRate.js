import { useState, useEffect } from 'react';
import { getTradeRates } from '../api/public.js';

// Typical market rate { rateLow, rateHigh, ... } for a trade, or null
export default function useTradeRate(trade) {
  const [rates, setRates] = useState(null);

  useEffect(() => {
    if (!trade) return;
    let alive = true;
    getTradeRates().then((r) => { if (alive) setRates(r); }).catch(() => {});
    return () => { alive = false; };
  }, [trade]);

  return rates?.find((r) => r.trade === trade) ?? null;
}
