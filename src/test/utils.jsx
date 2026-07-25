import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';
import useUIStore from '../stores/uiStore.js';

/**
 * Renders a component inside the providers the app supplies at runtime.
 * Pass `route` to control what useSearchParams / useNavigate see.
 */
export function renderWithProviders(ui, { route = '/', ...options } = {}) {
  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}

/** Puts a trade pro in the auth store, as if they had just logged in. */
export function signInAsTrade(overrides = {}) {
  const user = { _id: 'trade1', fullName: 'Pat Tradesman', type: 'trade', ...overrides };
  useAuthStore.setState({ user, token: 'test-token', isAuthenticated: true });
  return user;
}

/** Puts a contractor in the auth store. */
export function signInAsContractor(overrides = {}) {
  const user = { _id: 'contractor1', companyName: 'Acme Builders', type: 'contractor', ...overrides };
  useAuthStore.setState({ user, token: 'test-token', isAuthenticated: true });
  return user;
}

export function setLang(lang) {
  useUIStore.setState({ lang });
}

export * from '@testing-library/react';
