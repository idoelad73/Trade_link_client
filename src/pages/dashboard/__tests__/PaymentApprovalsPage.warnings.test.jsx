import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server.js';
import { API } from '../../../test/mocks/handlers.js';
import { renderWithProviders, signInAsContractor } from '../../../test/utils.jsx';
import { confirmNext, toastFire } from '../../../test/mocks/swal.js';

// The Stripe overage modal mounts Stripe Elements, which needs a real publishable
// key and network access. None of these tests exercise the overage path.
vi.mock('../../../components/contractor/StripePaymentModal.jsx', () => ({ default: () => null }));

const { default: PaymentApprovalsPage } = await import('../PaymentApprovalsPage.jsx');

const ORDER = {
  _id:          'order1',
  status:       'pending',
  date:         '2026-03-02',
  actual_hours: 8,
  hourly_rate:  50,
  workers_no:   1,
  order_sum:    400,
  trade_id:     { _id: 'trade1', fullName: 'Pat Tradesman', professionality: 'Painter' },
  site_id:      { _id: 'site1', name: 'Downtown Tower' },
};

const withOrders = (orders = [ORDER]) =>
  server.use(http.get(`${API}/contractor/payment-approvals`, () => HttpResponse.json({ orders })));

/** Replies to the approval PATCH with `body`. */
const approvalReplies = (body, status = 200) =>
  server.use(http.patch(`${API}/contractor/payment-approvals/:orderId`, () =>
    HttpResponse.json(body, { status })));

/** Renders the page, waits for the row, and clicks Approve past the confirm dialog. */
async function approveFirstOrder() {
  renderWithProviders(<PaymentApprovalsPage />);
  const button = await screen.findByRole('button', { name: /approve/i });
  confirmNext();                       // the SweetAlert2 "are you sure" step
  await userEvent.click(button);
}

const toastsOfIcon = (icon) =>
  toastFire.mock.calls.map(([a]) => a).filter(a => a.icon === icon);

beforeEach(() => { signInAsContractor(); });

describe('PaymentApprovalsPage — server warnings after approval', () => {
  it('shows only a success toast when the payout went through cleanly', async () => {
    withOrders();
    approvalReplies({ deleted: true, _id: 'order1', order: null });

    await approveFirstOrder();

    await waitFor(() => expect(toastsOfIcon('success')).toHaveLength(1));
    expect(toastsOfIcon('warning')).toHaveLength(0);
  });

  it('surfaces a blocked-payout warning alongside the success toast', async () => {
    // The approval itself succeeded, so the success toast is still correct — but
    // the contractor has to learn the trade pro was not actually paid.
    withOrders();
    approvalReplies({
      deleted: true, _id: 'order1', order: null,
      warnings: [{
        stage:   'payout_blocked',
        code:    'no_bank_account',
        message: 'Pat Tradesman could not be paid — No bank account is attached. They have been emailed. The work is approved and the amount is still owed.',
      }],
    });

    await approveFirstOrder();

    await waitFor(() => expect(toastsOfIcon('warning')).toHaveLength(1));
    const warning = toastsOfIcon('warning')[0];
    expect(warning.title).toContain('Pat Tradesman');
    expect(warning.title).toMatch(/still owed/i);
    // Long enough to actually be read — this is not a throwaway notice.
    expect(warning.timer).toBe(9000);
    expect(toastsOfIcon('success')).toHaveLength(1);
  });

  it('raises one toast per warning', async () => {
    withOrders();
    approvalReplies({
      deleted: true, _id: 'order1', order: null,
      warnings: [
        { stage: 'payout_blocked',     message: 'Payout blocked.' },
        { stage: 'trade_receipt_email', message: 'Receipt email failed.' },
      ],
    });

    await approveFirstOrder();

    await waitFor(() => expect(toastsOfIcon('warning')).toHaveLength(2));
    expect(toastsOfIcon('warning').map(w => w.title))
      .toEqual(['Payout blocked.', 'Receipt email failed.']);
  });

  it('removes the approved row even when a warning came back', async () => {
    // The work *was* approved. Leaving the row behind would invite a duplicate
    // approval, which the server would then 404.
    withOrders();
    approvalReplies({
      deleted: true, _id: 'order1', order: null,
      warnings: [{ stage: 'payout_blocked', message: 'Payout blocked.' }],
    });

    await approveFirstOrder();

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument());
  });

  it('tolerates a response with no warnings key at all', async () => {
    withOrders();
    approvalReplies({ deleted: true, _id: 'order1' });

    await approveFirstOrder();

    await waitFor(() => expect(toastsOfIcon('success')).toHaveLength(1));
    expect(toastsOfIcon('warning')).toHaveLength(0);
    expect(toastsOfIcon('error')).toHaveLength(0);
  });

  it('shows an error and keeps the row when the approval itself fails', async () => {
    withOrders();
    approvalReplies({ message: 'boom' }, 500);

    await approveFirstOrder();

    await waitFor(() => expect(toastsOfIcon('error')).toHaveLength(1));
    expect(toastsOfIcon('success')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  it('does not approve anything when the confirm dialog is dismissed', async () => {
    withOrders();
    let patched = false;
    server.use(http.patch(`${API}/contractor/payment-approvals/:orderId`, () => {
      patched = true;
      return HttpResponse.json({ deleted: true });
    }));

    renderWithProviders(<PaymentApprovalsPage />);
    const button = await screen.findByRole('button', { name: /approve/i });
    await userEvent.click(button);     // swalFire defaults to dismissed

    await waitFor(() => expect(toastFire).not.toHaveBeenCalled());
    expect(patched).toBe(false);
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });
});
