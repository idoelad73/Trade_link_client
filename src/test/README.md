# Client tests

Vitest + React Testing Library in jsdom, with MSW intercepting HTTP. Nothing
here reaches the network or needs the API server running.

```bash
npm test           # everything, once
npm run test:watch # re-run on change
```

## Layout

| Path | What it holds |
|---|---|
| `setup.js` | jest-dom matchers, MSW lifecycle, store resets, jsdom polyfills |
| `server.js` | The MSW `setupServer` instance |
| `mocks/handlers.js` | Default happy-path handlers + the `API` base URL |
| `mocks/swal.js` | SweetAlert2 fake — `confirmNext()`, `swalCall()`, `toastFire` |
| `utils.jsx` | `renderWithProviders`, `signInAsTrade`, `signInAsContractor`, `setLang` |

Tests live next to what they cover, in `__tests__/` folders.

## Config

`vitest.config.js` is separate from `vite.config.js` on purpose. The dev config
registers the Tailwind plugin and a `/api` dev-server proxy; the proxy in
particular would swallow the very requests MSW needs to intercept.

`VITE_API_URL` is pinned to `http://localhost:3000/api` via `define`, and
`mocks/handlers.js` exports that same value as `API`. If you change one, change
the other or every handler silently stops matching.

## Conventions

**Unhandled requests are errors, not warnings.** If a component fetches an
endpoint with no handler the run fails loudly, rather than the component quietly
rendering its error branch and producing a baffling assertion failure. Add a
default to `mocks/handlers.js` when you introduce a new mount-time fetch.

**Override per test, not globally:**

```js
server.use(http.get(`${API}/trade/payout-blocked`, () => HttpResponse.json({ blocked: true, ... })));
```

**SweetAlert2 is mocked**, both for confirm dialogs and for `utils/toast.js`
(which builds its toaster from `Swal.mixin`). Assert on what was asked and script
the answer instead of driving a real modal:

```js
confirmNext();                       // next Swal.fire resolves isConfirmed: true
await userEvent.click(approveButton);
expect(swalCall().html).toContain('$480.50');
toastFire.mock.calls.map(([a]) => a) // every toast raised, with icon + title + timer
```

**Stub heavy children.** Page components pull in modals that fetch on mount or
need Stripe Elements. Mock them so the test stays about the behaviour under test:

```js
vi.mock('../../../components/contractor/StripePaymentModal.jsx', () => ({ default: () => null }));
const { default: Page } = await import('../PaymentApprovalsPage.jsx');
```

The `await import` after the `vi.mock` calls is required — `vi.mock` is hoisted
above imports, but a static import of the page would still be evaluated before
the mock factories are registered.

## Gotcha: zustand stores are module singletons

`localStorage.clear()` only drops what the persist middleware wrote; it does
**not** roll back live in-memory state. `setup.js` snapshots both stores at load
and replaces their state before each test. If you add a third store, add it
there too, or a sign-in in one test will leak into the next.
