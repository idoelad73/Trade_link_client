import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { API } from '../../test/mocks/handlers.js';
import { signInAsTrade } from '../../test/utils.jsx';
import useAuthStore from '../../stores/authStore.js';
import { getPayoutBlocked, getPaymentApprovedCount, getMyOrders } from '../trade.js';

describe('api/trade', () => {
  describe('getPayoutBlocked', () => {
    it('returns the whole payload, not a nested field', async () => {
      // Unlike its neighbours this one unwraps `r.data` rather than
      // `r.data.<field>` — the component reads blocked/count/totalOwed/jobs off
      // the top level, so an accidental unwrap would break the whole prompt.
      const payload = {
        blocked:   true,
        count:     2,
        totalOwed: 480.5,
        code:      'no_bank_account',
        reason:    'No bank account is attached to your payout account.',
        jobs: [
          { site: 'Downtown Tower', date: '2026-03-02', amount: 360 },
          { site: 'Riverside Lofts', date: '2026-03-05', amount: 120.5 },
        ],
      };
      server.use(http.get(`${API}/trade/payout-blocked`, () => HttpResponse.json(payload)));

      await expect(getPayoutBlocked()).resolves.toEqual(payload);
    });

    it('passes the not-blocked case through untouched', async () => {
      await expect(getPayoutBlocked()).resolves.toEqual({ blocked: false });
    });

    it('rejects on a server error so the caller can swallow it', async () => {
      server.use(http.get(`${API}/trade/payout-blocked`, () => new HttpResponse(null, { status: 500 })));
      await expect(getPayoutBlocked()).rejects.toThrow();
    });
  });

  describe('axios instance', () => {
    it('attaches the stored JWT as a Bearer token', async () => {
      signInAsTrade();
      useAuthStore.setState({ token: 'jwt-abc123' });

      let seen;
      server.use(http.get(`${API}/trade/payout-blocked`, ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json({ blocked: false });
      }));

      await getPayoutBlocked();
      expect(seen).toBe('Bearer jwt-abc123');
    });

    it('sends no Authorization header when signed out', async () => {
      let seen = 'unset';
      server.use(http.get(`${API}/trade/payout-blocked`, ({ request }) => {
        seen = request.headers.get('authorization');
        return HttpResponse.json({ blocked: false });
      }));

      await getPayoutBlocked();
      expect(seen).toBeNull();
    });
  });

  describe('sibling unwrapping', () => {
    it('getPaymentApprovedCount pulls out data.count', async () => {
      server.use(http.get(`${API}/trade/payment-approved/count`, () => HttpResponse.json({ count: 7 })));
      await expect(getPaymentApprovedCount()).resolves.toBe(7);
    });

    it('getMyOrders pulls out data.orders', async () => {
      server.use(http.get(`${API}/trade/orders`, () => HttpResponse.json({ orders: [{ _id: 'o1' }] })));
      await expect(getMyOrders()).resolves.toEqual([{ _id: 'o1' }]);
    });
  });
});
