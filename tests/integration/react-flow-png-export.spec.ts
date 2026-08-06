import { test, expect, type Download } from '@playwright/test';

test.describe('React Flow PNG export capture', () => {
  test('exports a PNG via mounted DOM capture with grid and no editor chrome in clone', async ({ page }) => {
    await page.addInitScript(() => {
      indexedDB.deleteDatabase('mindflow');
      (window as any).__mfCaptureDetail = null;
      document.addEventListener('mindflow:png-capture', (event: Event) => {
        const custom = event as CustomEvent;
        (window as any).__mfCaptureDetail = custom.detail;
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'New Map' }).click();
    await page.getByRole('textbox').first().fill('Capture Test Map');
    await page.getByRole('button', { name: 'Rename' }).click();

    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PNG' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/i);

    const captureDetail = await page.evaluate(() => (window as any).__mfCaptureDetail);
    expect(captureDetail).toEqual({
      hasGrid: true,
      controlsCount: 0,
      handlesCount: 0,
    });

    await expect(page.locator('[data-mf-export-stage]')).toHaveCount(0);
  });
});
