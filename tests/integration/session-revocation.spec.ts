import { test, expect } from '@playwright/test';

test('Session revocation on newer login (INTENTIONAL FAIL)', async () => {
  await expect.soft(false, 'placeholder until session revocation flow implemented').toBe(true);
});
