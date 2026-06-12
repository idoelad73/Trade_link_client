# TradeLink — Client

React 18 + Vite + Tailwind CSS v4 (`@tailwindcss/vite`).

## Stack
- **Routing**: React Router v6 — `src/router/index.jsx` (all routes here, nowhere else)
- **Server state**: TanStack Query v5
- **Client state**: Zustand — `src/stores/authStore.js`, `src/stores/uiStore.js`
- **HTTP**: Axios instance + interceptors in `src/api/axios.js`
- **Payments**: Stripe Connect via `@stripe/stripe-js`
- **i18n**: `src/locales/en.json` + `es.json` — use `uiStore.lang` to select

## Key conventions
- API functions live in `src/api/` — never inline in components
- Query keys: `['entity', id]` pattern
- All user-facing strings go in locale files

## Dev
```bash
npm run dev      # → http://localhost:5173
npm run build
```

## Env
```
VITE_API_URL=http://localhost:3000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_CLOUDINARY_CLOUD_NAME=...
```
