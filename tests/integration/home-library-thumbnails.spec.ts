import { test, expect } from '@playwright/test';

test.describe('Home library thumbnails – happy path (INTENTIONAL FAIL)', () => {
  test('captures thumbnail after export and swaps placeholder within 1s', async ({ page }) => {
    // TODO(T007): drive UI per quickstart scenario once implementation is ready.
    // 1. Seed a new map and trigger export/idle refresh.
    // 2. Navigate to library, wait for placeholder → thumbnail swap.
    // 3. Assert alt text "Thumbnail of <name>" and structured log output.
    await page.goto('/');
    expect(false).toBe(true);
  });
});
