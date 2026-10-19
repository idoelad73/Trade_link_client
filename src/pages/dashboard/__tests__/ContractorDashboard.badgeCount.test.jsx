import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server.js';
import { API } from '../../../test/mocks/handlers.js';
import { renderWithProviders, signInAsContractor } from '../../../test/utils.jsx';

/**
 * getApplications returns approved worker offers and reschedules as well as
 * pending ones, so the contractor can review what they actioned. The navbar
 * badge must still count ONLY what is outstanding — counting array lengths
 * would leave it permanently lit.
 */

// Heavy children that fetch on mount and are irrelevant to the badge.
vi.mock('../../../components/contractor/ContractorInfoModal.jsx',         () => ({ default: () => null }));
vi.mock('../../../components/contractor/AddSiteModal.jsx',                () => ({ default: () => null }));
vi.mock('../../../components/contractor/ManageTradesModal.jsx',           () => ({ default: () => null }));
vi.mock('../../../components/contractor/UpdateSitePhotoModal.jsx',        () => ({ default: () => null }));
vi.mock('../../../components/contractor/ContractorApplicationsModal.jsx', () => ({ default: () => null }));
vi.mock('../../../components/contractor/DepositSummaryModal.jsx',         () => ({ default: () => null }));
vi.mock('../../../components/contractor/TradeGradesListModal.jsx',        () => ({ default: () => null }));
vi.mock('../../../components/contractor/SiteMessagesModal.jsx',           () => ({ default: () => null }));
vi.mock('../../../components/shared/RateCommentModal.jsx',                () => ({ default: () => null }));

const { default: ContractorDashboard } = await import('../ContractorDashboard.jsx');

const tradePro = { _id: 't1', fullName: 'Pat Tradesman', professionality: 'Painter', photo: null, hourlyRate: 50 };
const site     = { _id: 's1', name: 'Downtown Tower', tradesNeeded: [] };

function mountWith({ applications = [], reschedules = [], workerOffers = [] }) {
  server.use(
    http.get(`${API}/contractor/applications`, () =>
      HttpResponse.json({ applications, reschedules, workerOffers, sentRequests: [] })),
    http.get(`${API}/contractor/sites`,                     () => HttpResponse.json({ sites: [] })),
    http.get(`${API}/contractor/payment-approvals/count`,   () => HttpResponse.json({ pendingCount: 0 })),
    http.get(`${API}/contractor/trade-grades/eligible`,     () => HttpResponse.json({ trades: [] })),
    http.get(`${API}/contractor/pending-deposits`,          () => HttpResponse.json({ pending: [] })),
  );
  signInAsContractor();
  return renderWithProviders(<ContractorDashboard />);
}

const app     = (status) => ({ _id: `a-${status}`, tradePro, site, status, requestedDate: '2026-12-01' });
const offer   = (status) => ({ _id: `o-${status}`, tradePro, site, status, requestedDate: '2026-12-01', workersOffered: 1 });
const resched = (status) => ({ _id: `r-${status}`, tradePro, site, status, requestedDate: '2026-12-09' });

describe('ContractorDashboard — applications badge', () => {
  it('counts only pending items across all three lists', async () => {
    mountWith({
      applications: [app('pending'),     app('accepted')],
      workerOffers: [offer('pending'),   offer('approved')],
      reschedules:  [resched('pending'), resched('approved')],
    });

    // 3 pending out of 6 returned — not 6.
    await waitFor(() => expect(screen.getByText('3 apps')).toBeInTheDocument());
    expect(screen.queryByText('6 apps')).not.toBeInTheDocument();
  });

  it('clears the badge entirely once everything is actioned', async () => {
    mountWith({
      applications: [app('accepted')],
      workerOffers: [offer('approved')],
      reschedules:  [resched('approved')],
    });

    // signInAsContractor() seeds this company name; it renders in more than one
    // place, so wait on it with getAllBy before asserting the badge's absence —
    // an absence check that runs before load would pass for the wrong reason.
    await waitFor(() => expect(screen.getAllByText('Acme Builders').length).toBeGreaterThan(0));
    expect(screen.queryByText(/^\d+ apps?$/)).not.toBeInTheDocument();
  });

  it('uses the singular when exactly one item is outstanding', async () => {
    mountWith({ workerOffers: [offer('pending'), offer('approved')] });
    await waitFor(() => expect(screen.getByText('1 app')).toBeInTheDocument());
  });
});
