// @ts-ignore - Playwright types may be provided via global setup in this repo
import { test, expect, Page } from '@playwright/test';

// Assumptions: App loads with a root node already present and a side detail pane visible after selecting the node.
// We will:
// 1. Select the root node (should already be selected or click it)
// 2. Capture its initial border colour (via computed style)
// 3. Click a border colour swatch in the Detail pane
// 4. Assert border colour changes immediately
// 5. Click Reset to clear override and assert it reverts to original

test('override and reset node border colour via detail pane', async ({ page }: { page: Page }) => {
  await page.goto('/');
  // Wait for canvas/root node (heuristic: text content 'New Thought' or class from focus wrapper)
  const node = page.locator('text=New Thought').first();
  await expect(node).toBeVisible();
  await node.click();

  // Detail pane should show Border Colour section
  const section = page.getByRole('heading', { name: 'Details' });
  await expect(section).toBeVisible();
  // Border Colour label presence
  await expect(page.getByText('Border Colour')).toBeVisible();

  // Get initial border colour via JS (compute style of parent container of text span)
  const initialBorderColor = await node.evaluate((el: Element) => {
    const parent = el.closest('div');
    if (!parent) return '';
    return getComputedStyle(parent).borderColor;
  });

  // Click first border override swatch (button with aria-label starting with 'Set border colour')
  const swatch = page.locator('button[aria-label^="Set border colour"]').first();
  const swatchLabel = await swatch.getAttribute('aria-label');
  expect(swatchLabel).toBeTruthy();
  await swatch.click();

  // After override, border colour should change (unless the swatch matches original; handle that gracefully)
  const afterOverride = await node.evaluate((el: Element) => {
    const parent = el.closest('div');
    if (!parent) return '';
    return getComputedStyle(parent).borderColor;
  });
  // It's possible first swatch equals initial; if so, pick second swatch
  if (afterOverride === initialBorderColor) {
    const second = page.locator('button[aria-label^="Set border colour"]').nth(1);
    await second.click();
  }

  const changedBorderColor = await node.evaluate((el: Element) => {
    const parent = el.closest('div');
    if (!parent) return '';
    return getComputedStyle(parent).borderColor;
  });
  expect(changedBorderColor).not.toBe(initialBorderColor);

  // Reset override
  const resetBtn = page.getByRole('button', { name: 'Reset' });
  await resetBtn.click();

  const reverted = await node.evaluate((el: Element) => {
    const parent = el.closest('div');
    if (!parent) return '';
    return getComputedStyle(parent).borderColor;
  });
  expect(reverted).toBe(initialBorderColor);
});
