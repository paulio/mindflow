import { test, expect } from '@playwright/test';
test('text length enforcement 255 char limit (INTENTIONAL FAIL)', async () => {
  expect(false).toBe(true);
});
