import { test, expect, type Page, type Download } from '@playwright/test';

async function createMap(page: Page, name: string) {
  await page.getByRole('button', { name: 'New Map' }).click();
  await page.getByRole('textbox').first().fill(name);
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('button', { name: '← Library' }).click();
  await expect(page.getByRole('button', { name })).toBeVisible();
}

async function resetDatabase(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('mindflow');
  });
}

async function setupLibrary(page: Page) {
  await resetDatabase(page);
  await page.goto('/');
  await createMap(page, 'Alpha Plan');
  await createMap(page, 'Beta Launch');
  await createMap(page, 'Gamma Retro');
}

test.describe('Map Library export flow', () => {
  test('exports multiple maps with progress feedback', async ({ page }) => {
    await setupLibrary(page);

    await page.getByRole('checkbox', { name: 'Beta Launch' }).check();
    await page.getByRole('checkbox', { name: 'Gamma Retro' }).check();
    await page.getByRole('button', { name: 'Export' }).click();

    const confirmDialog = page.getByRole('dialog', { name: 'Export maps' });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByRole('list')).toContainText(['Beta Launch', 'Gamma Retro']);
    const downloadPromise: Promise<Download> = page.waitForEvent('download');
    await confirmDialog.getByRole('button', { name: /download zip/i }).click();

    const progressDialog = page.getByRole('dialog', { name: /exporting/i });
    await expect(progressDialog).toBeVisible();
    await expect(progressDialog.getByRole('status')).toHaveText(/preparing 2 maps/i);

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/mindflow-export-\d{8}T\d{6}Z\.zip/);
    await expect(progressDialog).toContainText(/download ready/i);
  });
});
