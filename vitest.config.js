import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate from vite.config.js on purpose: the dev config pulls in the Tailwind
// plugin and a dev-server proxy, neither of which applies under test, and the
// proxy in particular would silently swallow the requests MSW needs to see.
export default defineConfig({
  plugins: [react()],
  test: {
    environment:    'jsdom',
    globals:        false,
    setupFiles:     ['./src/test/setup.js'],
    include:        ['src/**/*.test.{js,jsx}'],
    // jsdom leaks between files otherwise (persisted zustand state, timers).
    restoreMocks:   true,
    clearMocks:     true,
    testTimeout:    10_000,
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000/api'),
  },
});
