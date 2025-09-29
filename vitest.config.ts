import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Include both .ts and .tsx so component tests are discovered
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // Exclude only the old placeholder integration specs (keep new RTL integration tests runnable)
    exclude: [
      'tests/integration/dblclick-edit.spec.ts',
      'tests/integration/edit-commit.spec.ts',
      'tests/integration/edit-idempotent.spec.ts'
    ],
    globals: true,
    // Use jsdom for React component rendering
    environment: 'jsdom',
    setupFiles: ['tests/setup/indexeddb-polyfill.ts']
  }
});
