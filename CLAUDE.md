# TradeLink — Client

React + Vite + Tailwind CSS frontend.

## Stack
- **Framework**: React 18 + JSX (TypeScript migration planned)
- **Bundler**: Vite + `@tailwindcss/vite`
- **Routing**: React Router v6 — `createBrowserRouter` defined in `src/router/index.jsx`
- **Server state**: TanStack Query v5 (`useQuery`, `useMutation`)
- **Client state**: Zustand — slice pattern, one store per domain
- **HTTP**: Axios instance in `src/api/axios.js`
- **Charts**: Recharts (dashboard)
- **Payments**: Stripe Connect (Stripe.js)
- **i18n**: JSON locale files in `src/locales/` — English first, Spanish second

## Folder structure
```
client/src/
├── api/
│   └── axios.js            # Axios instance + interceptors
├── locales/
│   ├── en.json             # English strings
│   └── es.json             # Spanish strings
├── router/
│   └── index.jsx           # All routes (createBrowserRouter)
├── stores/
│   ├── authStore.js        # Zustand — auth & current user
│   └── uiStore.js          # Zustand — lang, modals, sidebar
├── pages/                  # One folder per route (added when built)
├── components/             # Shared UI components
├── layouts/                # Route layout wrappers
├── hooks/                  # Custom React hooks
└── types/                  # Shared TS/JSDoc types
```

## Conventions
- **API calls**: plain async functions in `src/api/` — never inside components
- **Query keys**: always start with entity name `['users', id]`
- **Zustand stores**: one file per domain in `src/stores/`
- **Routes**: defined only in `src/router/index.jsx`
- **i18n**: all user-facing strings in `en.json` / `es.json`; use `useUIStore` `lang` to select

## Environment variables
```
VITE_API_URL=http://localhost:3000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_CLOUDINARY_CLOUD_NAME=...
```

## Dev
```bash
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build
```
