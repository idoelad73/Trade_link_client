import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './server.js';
import SwalMock, { resetSwalMock } from './mocks/swal.js';
import useAuthStore from '../stores/authStore.js';
import useUIStore from '../stores/uiStore.js';

// SweetAlert2 is used both directly (confirm dialogs) and indirectly through
// utils/toast.js. Replacing the module covers both. See mocks/swal.js.
vi.mock('sweetalert2', () => ({ default: SwalMock }));

// ── MSW ───────────────────────────────────────────────────────────────────────
// `error` rather than `warn`: a request nobody handled means the component under
// test hit an endpoint the test didn't account for, and it would otherwise
// quietly render its error branch and produce a confusing assertion failure.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

afterEach(() => {
  server.resetHandlers();
  cleanup();               // globals:false ⇒ RTL's auto-cleanup is not installed
});

// Snapshotted before any test mutates them. Zustand stores are module
// singletons: clearing localStorage only drops what the persist middleware
// wrote, it does NOT roll back the live in-memory state, so a sign-in in one
// test would otherwise still be there in the next.
const authInitialState = useAuthStore.getState();
const uiInitialState   = useUIStore.getState();

beforeEach(() => {
  resetSwalMock();
  localStorage.clear();
  sessionStorage.clear();
  // `true` replaces the whole state rather than merging — actions live on the
  // snapshot too, so they survive the replace.
  useAuthStore.setState(authInitialState, true);
  useUIStore.setState(uiInitialState, true);
});

// ── jsdom gaps ────────────────────────────────────────────────────────────────
// Not implemented in jsdom; components that call them would otherwise throw.
window.matchMedia ??= (query) => ({
  matches: false, media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(),
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
});

window.scrollTo ??= vi.fn();

globalThis.IntersectionObserver ??= class {
  observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
};

globalThis.ResizeObserver ??= class {
  observe() {} unobserve() {} disconnect() {}
};
