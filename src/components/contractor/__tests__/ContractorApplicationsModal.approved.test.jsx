import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server.js';
import { API } from '../../../test/mocks/handlers.js';
import { renderWithProviders, signInAsContractor } from '../../../test/utils.jsx';
import ContractorApplicationsModal from '../ContractorApplicationsModal.jsx';

/**
 * getApplications now returns approved worker offers and reschedules as well as
 * pending ones. The contractor must be able to SEE what they approved without
 * being able to approve it twice.
 */

const tradePro = { _id: 't1', fullName: 'Pat Tradesman', professionality: 'Painter', photo: null, hourlyRate: 50 };
const site     = { _id: 's1', name: 'Downtown Tower', tradesNeeded: [{ name: 'Painter', workers_no: 3, totalHours: 6 }] };

const offer = (over) => ({
  _id: 'o1', tradePro, site, tradeName: 'Painter',
  requestedDate: '2026-12-01', workersOffered: 2, totalHours: 6,
  ...over,
});

const resched = (over) => ({
  _id: 'r1', tradePro, site, requestedDate: '2026-12-09', ...over,
});

const reply = ({ applications = [], reschedules = [], workerOffers = [] }) =>
  http.get(`${API}/contractor/applications`, () =>
    HttpResponse.json({ applications, reschedules, workerOffers, sentRequests: [] }));

const open = () => {
  signInAsContractor();
  return renderWithProviders(<ContractorApplicationsModal onClose={vi.fn()} onApproved={vi.fn()} />);
};

describe('ContractorApplicationsModal — approved worker offers', () => {
  it('shows an approved offer with a confirmation line and no approve button', async () => {
    server.use(reply({ workerOffers: [offer({ status: 'approved' })] }));
    open();

    await waitFor(() => expect(screen.getByText('✓ Approved')).toBeInTheDocument());
    expect(screen.getByText(/2 workers confirmed/i)).toBeInTheDocument();
    // The whole point: an already-approved offer cannot be approved again.
    expect(screen.queryByRole('button', { name: /approve 2 worker/i })).not.toBeInTheDocument();
  });

  it('still offers the approve button while an offer is pending', async () => {
    server.use(reply({ workerOffers: [offer({ status: 'pending' })] }));
    open();

    await waitFor(() => expect(screen.getByText('⏳ Pending')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /approve 2 worker/i })).toBeInTheDocument();
  });

  it('labels the section by how many are still outstanding', async () => {
    server.use(reply({ workerOffers: [
      offer({ _id: 'o1', status: 'pending'  }),
      offer({ _id: 'o2', status: 'approved' }),
    ] }));
    open();

    await waitFor(() => expect(screen.getByText(/1 Pending Approval/)).toBeInTheDocument());
  });

  it('says All Approved when nothing is outstanding', async () => {
    server.use(reply({ workerOffers: [offer({ status: 'approved' })] }));
    open();
    await waitFor(() => expect(screen.getByText(/All Approved/)).toBeInTheDocument());
  });
});

describe('ContractorApplicationsModal — approved reschedules', () => {
  it('shows an approved reschedule read-only', async () => {
    server.use(reply({ reschedules: [resched({ status: 'approved' })] }));
    open();

    await waitFor(() => expect(screen.getByText('✓ Approved')).toBeInTheDocument());
    expect(screen.getByText(/new date approved/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
  });

  it('keeps approve and decline on a pending reschedule', async () => {
    server.use(reply({ reschedules: [resched({ status: 'pending' })] }));
    open();

    await waitFor(() => expect(screen.getByText('Reschedule')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });
});
