import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { createTestMapSnapshot } from '../setup/export-import-fixtures';

type InputFilePayload = Parameters<Page['setInputFiles']>[1];

async function resetDatabase(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('mindflow');
  });
}

async function createImportArchive(): Promise<InputFilePayload> {
  const snapshot = createTestMapSnapshot('restore-map', 'Restored Concept');
  const manifest = {
    manifestVersion: 1,
    generatedAt: new Date().toISOString(),
    appVersion: '1.4.0',
    totalMaps: 1,
    maps: [
      {
        id: snapshot.graph.id,
        name: snapshot.graph.name,
        schemaVersion: snapshot.graph.schemaVersion,
        payloadPath: `maps/${snapshot.graph.id}.json`,
        lastModified: snapshot.graph.lastModified
      }
    ]
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file(`maps/${snapshot.graph.id}.json`, JSON.stringify(snapshot, null, 2));

  const buffer = await zip.generateAsync({ type: 'uint8array' });
  return {
    name: 'library-import.zip',
    mimeType: 'application/zip',
    buffer
  };
}

test.describe('Map Library import restore', () => {
  test('restores deleted map from archive', async ({ page }) => {
    await resetDatabase(page);
    const archivePayload = await createImportArchive();

    await page.goto('/');
    await expect(page.getByText('No maps yet')).toBeVisible();
    await page.getByRole('button', { name: 'Import' }).click();
    await page.setInputFiles('input[type="file"]', archivePayload);

    const summaryDialog = page.getByRole('dialog', { name: /Import summary/i });
    await expect(summaryDialog).toBeVisible();
    await expect(summaryDialog).toContainText('Restored Concept');

    await summaryDialog.getByRole('button', { name: /Import maps/i }).click();

    const progressDialog = page.getByRole('dialog', { name: /Importing/i });
    await expect(progressDialog).toBeVisible();
    await expect(progressDialog).toContainText(/processing 1 of 1/i);

    await expect(page.getByRole('button', { name: 'Restored Concept' })).toBeVisible();
  });
});
