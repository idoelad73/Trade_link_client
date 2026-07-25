import { http, HttpResponse } from 'msw';

// Must match the baseURL vitest.config.js defines for VITE_API_URL.
export const API = 'http://localhost:3000/api';

/**
 * Default happy-path handlers. A test overrides only the endpoint it is about:
 *
 *   server.use(http.get(`${API}/trade/payout-blocked`, () => HttpResponse.json({ ... })));
 *
 * Anything a component fetches on mount needs a handler here, otherwise MSW
 * raises "unhandled request" and the component renders its error branch instead
 * of the state under test.
 */
export const handlers = [
  // ── Trade ───────────────────────────────────────────────────────────────────
  http.get(`${API}/trade/me`, () => HttpResponse.json({
    trade: {
      _id: 'trade1', fullName: 'Pat Tradesman', email: 'pat@test.local',
      professionality: 'Painter', hourlyRate: 50, bookings: [], busyDays: [],
      stripeAccountId: 'acct_ready', stripeOnboarded: true,
    },
  })),
  http.get(`${API}/trade/payment-approved/count`, () => HttpResponse.json({ count: 0 })),
  http.get(`${API}/trade/approved-orders`,        () => HttpResponse.json({ orders: [] })),
  http.get(`${API}/trade/deposited-requests`,     () => HttpResponse.json({ deposits: [] })),
  http.get(`${API}/trade/gradable-contractors`,   () => HttpResponse.json({ contractors: [] })),
  http.get(`${API}/trade/payout-blocked`,         () => HttpResponse.json({ blocked: false })),
  http.patch(`${API}/trade/location`,             () => HttpResponse.json({ ok: true })),
  http.post(`${API}/trade/stripe/onboard`,        () => HttpResponse.json({ url: 'https://connect.stripe.test/onboard' })),
  http.post(`${API}/trade/stripe/onboard/complete`, () => HttpResponse.json({ onboarded: true })),

  // ── Contractor ──────────────────────────────────────────────────────────────
  http.get(`${API}/contractor/payment-approvals`, () => HttpResponse.json({ orders: [] })),
  http.patch(`${API}/contractor/payment-approvals/:orderId`, () =>
    HttpResponse.json({ deleted: true, _id: 'order1', order: null })),
];
