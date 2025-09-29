import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Include both .ts and .tsx so component tests are discovered
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // Exclude all Playwright integration specs (run via `npm run test:ui`). Keep RTL/unit specs.
    exclude: [
      'tests/integration/**/*.spec.ts',
      'tests/integration/**/*.spec.tsx'
    ],
    globals: true,
    // Use jsdom for React component rendering
    environment: 'jsdom',
    setupFiles: ['tests/setup/indexeddb-polyfill.ts']
  }
});
