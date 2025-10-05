import { test, expect } from '@playwright/test';

test.describe('Home library thumbnails – failure handling (INTENTIONAL FAIL)', () => {
  test('shows placeholder and logs after retrying once', async ({ page }) => {
    // TODO(T008): inject export failure, confirm retry limit, and observe failed state.
    // Expected steps once implemented:
    // 1. Arrange mock to throw on first export & retry.
    // 2. Navigate to library, validate placeholder with failed status + "Thumbnail unavailable" alt text.
    // 3. Assert structured log includes failure reason and retryCount === 1.
    await page.goto('/');
    expect(false).toBe(true);
  });
});
