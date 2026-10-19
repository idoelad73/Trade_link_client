import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/server.js';
import { API } from '../../../test/mocks/handlers.js';
import { renderWithProviders } from '../../../test/utils.jsx';

/**
 * The checkbox only matters if it actually blocks registration. These drive the
 * real form and assert on what reaches the register endpoint.
 */

vi.mock('../../../components/Navbar', () => ({ default: () => null }));

const { default: ContractorRegister } = await import('../ContractorRegister.jsx');

// Captures the POST body so we can assert termsVersion travels with it.
function captureRegister() {
  const seen = { body: null, calls: 0 };
  server.use(
    http.get(`${API}/address/autocomplete`, () => HttpResponse.json({ results: [] })),
    http.post(`${API}/auth/register/contractor`, async ({ request }) => {
      seen.calls += 1;
      seen.body = await request.json();
      return HttpResponse.json(
        { token: 'tok', user: { _id: 'c1', companyName: 'Smith Construction LLC', type: 'contractor' } },
        { status: 201 },
      );
    }),
  );
  return seen;
}

// Every text input on this form carries `required`, so a half-filled form is
// stopped by native constraint validation before handleSubmit ever runs —
// which would make the gate look like it worked for the wrong reason.
async function fillRequiredFields(user) {
  const email = 'owner@smith.test';
  await user.type(screen.getByPlaceholderText('Smith Construction LLC'), 'Smith Construction LLC');
  await user.type(screen.getByPlaceholderText('+1 (555) 000-0000'), '5550100');
  await user.type(screen.getByPlaceholderText('123 Main St, New York, NY 10001'), '1 Main St, New York, NY');

  // Email and confirm-email share a placeholder.
  const emails = screen.getAllByPlaceholderText('company@gmail.com');
  await user.type(emails[0], email);
  await user.type(emails[1], email);

  const pwds = document.querySelectorAll('input[type="password"]');
  await user.type(pwds[0], 'Passw0rd!');
  await user.type(pwds[1], 'Passw0rd!');

  // At least one expertise is required by handleSubmit.
  await user.click(screen.getByRole('button', { name: /Residential Construction/i }));
}

const submitBtn = () => screen.getByRole('button', { name: /create account/i });
const termsBox  = () => screen.getByRole('checkbox');

describe('ContractorRegister — Terms of Use gate', () => {
  it('disables Create Account until the terms are accepted', async () => {
    captureRegister();
    const user = userEvent.setup();
    renderWithProviders(<ContractorRegister />);

    expect(submitBtn()).toBeDisabled();
    await user.click(termsBox());
    expect(submitBtn()).toBeEnabled();

    // Un-ticking must put the gate back.
    await user.click(termsBox());
    expect(submitBtn()).toBeDisabled();
  });

  it('never posts to the register endpoint while the box is unticked', async () => {
    const seen = captureRegister();
    const user = userEvent.setup();
    renderWithProviders(<ContractorRegister />);

    await fillRequiredFields(user);
    await user.click(submitBtn());          // disabled — should do nothing

    await new Promise((r) => setTimeout(r, 50));
    expect(seen.calls).toBe(0);
  });

  it('blocks an Enter-key submit too, not just the button click', async () => {
    const seen = captureRegister();
    const user = userEvent.setup();
    renderWithProviders(<ContractorRegister />);

    await fillRequiredFields(user);
    await user.type(screen.getByPlaceholderText('Smith Construction LLC'), '{Enter}');

    // Implicit submission is suppressed because the default submit button is
    // disabled; the guard inside handleSubmit is the second line of defence if
    // that button is ever re-enabled. Either way nothing may be posted.
    await new Promise((r) => setTimeout(r, 50));
    expect(seen.calls).toBe(0);
  });

  it('registers once accepted, sending termsVersion with the payload', async () => {
    const seen = captureRegister();
    const user = userEvent.setup();
    renderWithProviders(<ContractorRegister />);

    await fillRequiredFields(user);
    await user.click(termsBox());
    await user.click(submitBtn());

    await waitFor(() => expect(seen.calls).toBe(1));
    expect(seen.body.termsVersion).toBe('2026-10-18');
    expect(seen.body.companyName).toBe('Smith Construction LLC');
    // The confirm fields are local-only and must not be sent.
    expect(seen.body.confirmPassword).toBeUndefined();
    expect(seen.body.confirmEmail).toBeUndefined();
  });

  it('opens the Terms from the inline link without submitting the form', async () => {
    const seen = captureRegister();
    const user = userEvent.setup();
    renderWithProviders(<ContractorRegister />);

    await user.click(screen.getByRole('button', { name: /^terms of use$/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(seen.calls).toBe(0);
  });
});
