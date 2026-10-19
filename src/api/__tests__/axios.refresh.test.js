import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/server.js';
import { API } from '../../test/mocks/handlers.js';
import api from '../axios.js';
import useAuthStore from '../../stores/authStore.js';

// A protected endpoint used purely to exercise the interceptor.
const PROTECTED = `${API}/trade/me`;

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'u1' }, token: 'expired-token', isAuthenticated: true });
});

describe('axios refresh interceptor', () => {
  it('on 401, refreshes the access token and retries the original request', async () => {
    let served = 0;
    server.use(
      http.get(PROTECTED, ({ request }) => {
        const auth = request.headers.get('authorization');
        // First call carries the expired token → 401. After refresh → fresh token → 200.
        if (auth === 'Bearer fresh-token') return HttpResponse.json({ ok: true });
        served += 1;
        return new HttpResponse(null, { status: 401 });
      }),
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ token: 'fresh-token', user: { id: 'u1' } })),
    );

    const res = await api.get('/trade/me');
    expect(res.data).toEqual({ ok: true });
    expect(served).toBe(1);                                   // original 401'd exactly once
    expect(useAuthStore.getState().token).toBe('fresh-token'); // store updated
  });

  it('coalesces concurrent 401s into a single refresh (rotation-safe)', async () => {
    let refreshCount = 0;
    server.use(
      http.get(PROTECTED, ({ request }) =>
        request.headers.get('authorization') === 'Bearer fresh-token'
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => {
        refreshCount += 1;
        return HttpResponse.json({ token: 'fresh-token', user: { id: 'u1' } });
      }),
    );

    const [a, b, c] = await Promise.all([
      api.get('/trade/me'), api.get('/trade/me'), api.get('/trade/me'),
    ]);
    expect(a.data).toEqual({ ok: true });
    expect(b.data).toEqual({ ok: true });
    expect(c.data).toEqual({ ok: true });
    expect(refreshCount).toBe(1);   // one refresh for all three — no cookie-rotation clobber
  });

  it('does not retry more than once if the refreshed token is still rejected', async () => {
    let getCalls = 0;
    server.use(
      http.get(PROTECTED, () => { getCalls += 1; return new HttpResponse(null, { status: 401 }); }),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({ token: 'fresh-token', user: { id: 'u1' } })),
    );

    await expect(api.get('/trade/me')).rejects.toMatchObject({ response: { status: 401 } });
    expect(getCalls).toBe(2);   // original + one retry, then it gives up
  });

  it('clears auth when the refresh itself fails', async () => {
    server.use(
      http.get(PROTECTED, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    );

    await expect(api.get('/trade/me')).rejects.toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('a 401 from the login endpoint is passed through, never refreshed', async () => {
    let refreshCalled = false;
    server.use(
      http.post(`${API}/auth/login/contractor`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => { refreshCalled = true; return HttpResponse.json({ token: 'x' }); }),
    );

    await expect(api.post('/auth/login/contractor', {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshCalled).toBe(false);
  });
});
