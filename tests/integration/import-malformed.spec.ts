import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';

type InputFilePayload = Parameters<Page['setInputFiles']>[1];

async function resetDatabase(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('mindflow');
  });
}

async function createMalformedArchive(): Promise<InputFilePayload> {
  const zip = new JSZip();
  zip.file('readme.txt', 'This is not a valid export bundle.');
  const buffer = await zip.generateAsync({ type: 'uint8array' });
  return {
    name: 'malformed.zip',
    mimeType: 'application/zip',
    buffer
  };
}

async function seedMap(page: Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Map' }).click();
  await page.getByRole('textbox').first().fill(name);
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('button', { name: '← Library' }).click();
  await expect(page.getByRole('button', { name })).toBeVisible();
}

test('Import surfaces validation error for malformed ZIP', async ({ page }) => {
  await resetDatabase(page);
  const archive = await createMalformedArchive();
  await seedMap(page, 'Reference Map');

  await page.getByRole('button', { name: 'Import' }).click();
  await page.setInputFiles('input[type="file"]', archive);

  const errorDialog = page.getByRole('dialog', { name: /Import failed/i });
  await expect(errorDialog).toBeVisible();
  await expect(errorDialog).toContainText(/manifest\.json missing/i);
  await errorDialog.getByRole('button', { name: /Close/i }).click();

  await expect(page.getByRole('button', { name: 'Reference Map' })).toBeVisible();
});
