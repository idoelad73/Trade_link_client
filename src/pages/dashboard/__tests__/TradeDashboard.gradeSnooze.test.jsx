import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server.js';
import { API } from '../../../test/mocks/handlers.js';
import { renderWithProviders, signInAsTrade } from '../../../test/utils.jsx';

vi.mock('../../../components/trade/TradeInfoModal.jsx', () => ({ default: () => null }));
vi.mock('../../../components/trade/TradeSchedule.jsx', () => ({ default: () => <div data-testid="schedule" /> }));
vi.mock('../../../components/trade/AvailabilityMessagesModal.jsx', () => ({ default: () => null }));

const { default: TradeDashboard } = await import('../TradeDashboard.jsx');

const SNOOZE_KEY = 'tl-grade-snooze';
const HOUR = 3_600_000;

const UNRATED = [
  { order_id: 'o1', contractor_id: 'c1', contractor_name: 'Acme Builders', site_name: 'Downtown Tower', date: '2026-03-02', order_sum: 400 },
  { order_id: 'o2', contractor_id: 'c2', contractor_name: 'Beta Construction', site_name: null, date: '2026-03-05', order_sum: 250 },
];

const eligible = (list) =>
  server.use(http.get(`${API}/trade/contractor-grades/eligible`, () => HttpResponse.json({ contractors: list })));

const ratingModal = () => screen.queryByRole('heading', { name: /rate contractors/i });

/** The modal's own ✕ — the dashboard chrome has one too, so scope the query. */
function closeRatingModal() {
  const overlay = ratingModal().closest('div.fixed');
  return within(overlay).getByRole('button', { name: '✕' });
}

beforeEach(() => { signInAsTrade(); });

describe('TradeDashboard — rating prompt snooze', () => {
  it('auto-opens when there are unrated jobs and no snooze is set', async () => {
    eligible(UNRATED);
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(ratingModal()).toBeInTheDocument());
  });

  it('stays shut while a snooze is live', async () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 12 * HOUR));
    eligible(UNRATED);

    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(screen.getByTestId('schedule')).toBeInTheDocument());
    expect(ratingModal()).not.toBeInTheDocument();
  });

  it('opens again once the snooze has expired', async () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() - HOUR));
    eligible(UNRATED);

    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(ratingModal()).toBeInTheDocument());
  });

  it('writes a ~24h snooze when the pro closes the modal', async () => {
    eligible(UNRATED);
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(ratingModal()).toBeInTheDocument());
    await userEvent.click(closeRatingModal());

    await waitFor(() => expect(localStorage.getItem(SNOOZE_KEY)).toBeTruthy());
    const until = Number(localStorage.getItem(SNOOZE_KEY));
    expect(until).toBeGreaterThan(Date.now() + 23 * HOUR);
    expect(until).toBeLessThanOrEqual(Date.now() + 24 * HOUR);
    expect(ratingModal()).not.toBeInTheDocument();
  });

  it('never opens when there is nothing to rate, snooze or not', async () => {
    eligible([]);
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(screen.getByTestId('schedule')).toBeInTheDocument());
    expect(ratingModal()).not.toBeInTheDocument();
    expect(localStorage.getItem(SNOOZE_KEY)).toBeNull();
  });

  it('survives a corrupt snooze value rather than blocking the prompt forever', async () => {
    localStorage.setItem(SNOOZE_KEY, 'not-a-number');
    eligible(UNRATED);

    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(ratingModal()).toBeInTheDocument());
  });

  it('renders a direct-hire job that has no site', async () => {
    eligible([UNRATED[1]]);
    renderWithProviders(<TradeDashboard />);

    await waitFor(() => expect(ratingModal()).toBeInTheDocument());
    expect(screen.getByText('Beta Construction')).toBeInTheDocument();
    // No stray "📍" marker for the missing site.
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
  });
});
