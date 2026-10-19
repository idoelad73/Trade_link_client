import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server.js';
import { API } from '../../../test/mocks/handlers.js';
import { renderWithProviders, signInAsContractor } from '../../../test/utils.jsx';
import SiteMessagesModal from '../SiteMessagesModal.jsx';

const SITE = { _id: 'site1', name: 'Downtown Tower' };

const reply = (messages) =>
  http.get(`${API}/contractor/sites/site1/messages`, () =>
    HttpResponse.json({ site: { name: SITE.name, address: '3 Main St' }, messages }));

const base = {
  tradePro: { _id: 't1', fullName: 'Pat Tradesman', professionality: 'Painter', photo: null },
  senderType: 'trade', tradeName: 'Painter', createdAt: '2026-10-01T10:00:00Z',
  requestedDate: null, workersOffered: null, totalHours: null,
  min_deposit: null, snapshot: null, text: null,
};

const open = () => {
  signInAsContractor();
  return renderWithProviders(<SiteMessagesModal site={SITE} onClose={vi.fn()} />);
};

describe('SiteMessagesModal', () => {
  it('shows a spinner, then the project name and message count', async () => {
    server.use(reply([
      { ...base, _id: 'm1', type: 'application',  status: 'pending'  },
      { ...base, _id: 'm2', type: 'worker_offer', status: 'approved' },
    ]));
    open();

    expect(screen.getByText(/loading messages/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Downtown Tower/)).toBeInTheDocument());
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });

  it('renders both pending and approved items — this is the audit trail', async () => {
    server.use(reply([
      { ...base, _id: 'm1', type: 'application',  status: 'pending'  },
      { ...base, _id: 'm2', type: 'worker_offer', status: 'approved' },
    ]));
    open();

    await waitFor(() => expect(screen.getByText('⏳ Pending')).toBeInTheDocument());
    expect(screen.getByText('✓ Approved')).toBeInTheDocument();
    // Each type label appears twice on purpose: once as a filter chip and once
    // as the row's own badge — so assert on the count, not a single match.
    expect(screen.getAllByText(/Job Application/)).toHaveLength(2);
    expect(screen.getAllByText(/Worker Offer/)).toHaveLength(2);
  });

  it('filters by type, and restores the full list via All', async () => {
    const user = userEvent.setup();
    server.use(reply([
      { ...base, _id: 'm1', type: 'application',  status: 'pending'  },
      { ...base, _id: 'm2', type: 'worker_offer', status: 'approved' },
    ]));
    open();

    await waitFor(() => expect(screen.getByText('⏳ Pending')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /👷 Worker Offer \(1\)/ }));
    expect(screen.queryByText('⏳ Pending')).not.toBeInTheDocument();
    expect(screen.getByText('✓ Approved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /All \(2\)/ }));
    expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
  });

  it('hides the filter bar when there is only one message type', async () => {
    server.use(reply([{ ...base, _id: 'm1', type: 'application', status: 'pending' }]));
    open();

    await waitFor(() => expect(screen.getByText('1 message')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /^All \(/ })).not.toBeInTheDocument();
  });

  it('renders decoded payment figures rather than raw JSON', async () => {
    server.use(reply([{
      ...base, _id: 'm1', type: 'payment', status: 'pending',
      snapshot: { actual_hours: 7, hourly_rate: 50, workers_no: 2, order_sum: 700 },
      text: null,
    }]));
    open();

    await waitFor(() => expect(screen.getByText('💰 $700')).toBeInTheDocument());
    expect(screen.getByText('🕐 7h logged')).toBeInTheDocument();
    expect(screen.queryByText(/actual_hours/)).not.toBeInTheDocument();
  });

  it('shows an empty state when the project has no messages', async () => {
    server.use(reply([]));
    open();
    await waitFor(() => expect(screen.getByText(/no messages for this project yet/i)).toBeInTheDocument());
  });

  it('surfaces a load failure instead of an empty list', async () => {
    server.use(http.get(`${API}/contractor/sites/site1/messages`, () =>
      HttpResponse.json({ message: 'nope' }, { status: 500 })));
    open();
    await waitFor(() => expect(screen.getByText(/failed to load messages/i)).toBeInTheDocument());
  });

  it('closes on Escape and on the Close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(reply([]));
    signInAsContractor();
    renderWithProviders(<SiteMessagesModal site={SITE} onClose={onClose} />);

    await waitFor(() => expect(screen.getByText(/no messages/i)).toBeInTheDocument());

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
