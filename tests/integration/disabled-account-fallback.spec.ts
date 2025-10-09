import { test, expect } from '@playwright/test';

test('Disabled account fallback (INTENTIONAL FAIL)', async () => {
  await expect.soft(false, 'placeholder until disabled account fallback implemented').toBe(true);
});
