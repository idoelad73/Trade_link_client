import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, signInAsTrade } from './utils.jsx';
import { getPayoutBlocked } from '../api/trade.js';
import useAuthStore from '../stores/authStore.js';

// Proves the harness works end to end: jsdom renders, jest-dom matchers are
// installed, the router wrapper is in place, MSW intercepts axios, and the
// zustand stores reset between tests.
describe('test harness', () => {
  it('renders a component and applies jest-dom matchers', () => {
    renderWithProviders(<h1>TradeLink</h1>);
    expect(screen.getByRole('heading', { name: 'TradeLink' })).toBeInTheDocument();
  });

  it('intercepts axios calls with MSW', async () => {
    await expect(getPayoutBlocked()).resolves.toEqual({ blocked: false });
  });

  it('starts each test with an empty auth store', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    signInAsTrade();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("does not leak the previous test's sign-in", () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
