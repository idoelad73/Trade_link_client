import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server.js';
import { API } from '../../../test/mocks/handlers.js';
import { renderWithProviders, signInAsTrade } from '../../../test/utils.jsx';
import { swalFire, swalCall, confirmNext, toastFire } from '../../../test/mocks/swal.js';

// The page pulls in four heavy children that each fetch on mount and are
// irrelevant to the payout prompt. Stubbing them keeps this test about the one
// effect under test instead of the whole dashboard.
vi.mock('../../../components/trade/TradeInfoModal.jsx', () => ({ default: () => null }));
vi.mock('../../../components/trade/TradeSchedule.jsx', () => ({ default: () => <div data-testid="schedule" /> }));
vi.mock('../../../components/trade/AvailabilityMessagesModal.jsx', () => ({ default: () => null }));
vi.mock('../../../components/trade/ContractorGradesListModal.jsx', () => ({ default: () => null }));

const { default: TradeDashboard } = await import('../TradeDashboard.jsx');

const BLOCKED = {
  blocked:   true,
  count:     2,
  totalOwed: 480.5,
  code:      'no_bank_account',
  reason:    'No bank account is attached to your payout account.',
  jobs: [
    { site: 'Downtown Tower',  date: '2026-03-02', amount: 360 },
    { site: 'Riverside Lofts', date: '2026-03-05', amount: 120.5 },
  ],
};

const blockedWith = (payload) =>
  server.use(http.get(`${API}/trade/payout-blocked`, () => HttpResponse.json(payload)));

// jsdom refuses a real navigation, so window.location is replaced with a plain
// object the assertions can read back.
let locationStub;
beforeEach(() => {
  signInAsTrade();
  locationStub = { href: 'http://localhost:5173/dashboard/trade', assign: vi.fn() };
  Object.defineProperty(window, 'location', { value: locationStub, writable: true, configurable: true });
});

describe('TradeDashboard — blocked payout prompt', () => {
  it('stays silent when nothing is blocked', async () => {
    renderWithProviders(<TradeDashboard />);

    // Let the mount effects settle before asserting a negative.
    await waitFor(() => expect(swalFire).not.toHaveBeenCalled());
    expect(swalFire).not.toHaveBeenCalled();
  });

  it('prompts with the reason, the total owed and the job list', async () => {
    blockedWith(BLOCKED);
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(swalFire).toHaveBeenCalled());

    const opts = swalCall();
    expect(opts.icon).toBe('warning');
    expect(opts.title).toMatch(/check your bank account/i);
    expect(opts.html).toContain('No bank account is attached');
    expect(opts.html).toContain('$480.50');
    expect(opts.html).toContain('Downtown Tower');
    expect(opts.html).toContain('Riverside Lofts');
    expect(opts.html).toContain('$360.00');
    expect(opts.html).toContain('$120.50');
    // Reassurance that the money is not lost is the whole point of the prompt.
    expect(opts.html).toMatch(/still owed/i);
    expect(opts.showCancelButton).toBe(true);
  });

  it('pluralises the job count', async () => {
    blockedWith({ ...BLOCKED, count: 1, jobs: [BLOCKED.jobs[0]], totalOwed: 360 });
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(swalFire).toHaveBeenCalled());
    expect(swalCall().html).toContain('1 approved job awaiting payout');
    expect(swalCall().html).not.toContain('jobs awaiting');
  });

  it('lists at most four jobs', async () => {
    const jobs = Array.from({ length: 7 }, (_, i) => ({
      site: `Site ${i + 1}`, date: '2026-03-02', amount: 100,
    }));
    blockedWith({ ...BLOCKED, count: 7, jobs });
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(swalFire).toHaveBeenCalled());
    const html = swalCall().html;
    expect(html).toContain('Site 4');
    expect(html).not.toContain('Site 5');
    // The count still reflects the true total, not the truncated list.
    expect(html).toContain('7 approved jobs awaiting payout');
  });

  it('falls back to a generic reason when the server sends none', async () => {
    blockedWith({ ...BLOCKED, reason: undefined });
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(swalFire).toHaveBeenCalled());
    expect(swalCall().html).toContain('We could not send your payout.');
  });

  it('sends the trade pro to Stripe onboarding when they confirm', async () => {
    blockedWith(BLOCKED);
    confirmNext();

    let onboardCalled = false;
    server.use(http.post(`${API}/trade/stripe/onboard`, () => {
      onboardCalled = true;
      return HttpResponse.json({ url: 'https://connect.stripe.test/setup/abc' });
    }));

    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(onboardCalled).toBe(true));
    await waitFor(() => expect(locationStub.href).toBe('https://connect.stripe.test/setup/abc'));
  });

  it('does nothing when they dismiss the prompt', async () => {
    blockedWith(BLOCKED);   // swalFire defaults to dismissed

    let onboardCalled = false;
    server.use(http.post(`${API}/trade/stripe/onboard`, () => {
      onboardCalled = true;
      return HttpResponse.json({ url: 'https://connect.stripe.test/setup/abc' });
    }));

    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(swalFire).toHaveBeenCalled());
    expect(onboardCalled).toBe(false);
    expect(locationStub.href).toBe('http://localhost:5173/dashboard/trade');
  });

  it('warns instead of navigating when onboarding returns no url', async () => {
    blockedWith(BLOCKED);
    confirmNext();
    server.use(http.post(`${API}/trade/stripe/onboard`, () => HttpResponse.json({})));

    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(toastFire).toHaveBeenCalled());
    expect(toastFire.mock.calls[0][0].title).toMatch(/could not open bank verification/i);
    expect(locationStub.href).toBe('http://localhost:5173/dashboard/trade');
  });

  it('warns instead of crashing when onboarding fails outright', async () => {
    blockedWith(BLOCKED);
    confirmNext();
    server.use(http.post(`${API}/trade/stripe/onboard`, () => new HttpResponse(null, { status: 500 })));

    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(toastFire).toHaveBeenCalled());
    expect(toastFire.mock.calls[0][0].title).toMatch(/could not open bank verification/i);
  });

  it('renders the dashboard normally when the payout check itself fails', async () => {
    // A failing check must not take the page down with it.
    server.use(http.get(`${API}/trade/payout-blocked`, () => new HttpResponse(null, { status: 500 })));

    const { getByTestId } = renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(getByTestId('schedule')).toBeInTheDocument());
    expect(swalFire).not.toHaveBeenCalled();
  });
});
