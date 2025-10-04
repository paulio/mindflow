import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { createTestMapSnapshot } from '../setup/export-import-fixtures';

const MAP_NAME = 'Alpha Plan';

type InputFilePayload = Parameters<Page['setInputFiles']>[1];

async function resetDatabase(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('mindflow');
  });
}

async function createConflictArchive(): Promise<InputFilePayload> {
  const snapshot = createTestMapSnapshot('conflict-map', MAP_NAME);
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
    name: 'conflict-import.zip',
    mimeType: 'application/zip',
    buffer
  };
}

async function createBaseMap(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Map' }).click();
  await page.getByRole('textbox').first().fill(MAP_NAME);
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('button', { name: '← Library' }).click();
  await expect(page.getByRole('button', { name: MAP_NAME })).toBeVisible();
}

test.describe('Import conflict prompt', () => {
  test('Add keeps both maps with suffix', async ({ page }) => {
    await resetDatabase(page);
    const archive = await createConflictArchive();
    await createBaseMap(page);

    await page.getByRole('button', { name: 'Import' }).click();
    await page.setInputFiles('input[type="file"]', archive);

    const summaryDialog = page.getByRole('dialog', { name: /Import summary/i });
    await summaryDialog.getByRole('button', { name: /Continue/i }).click();

    const conflictDialog = page.getByRole('dialog', { name: /Conflict detected/i });
    await expect(conflictDialog).toContainText(MAP_NAME);
    await conflictDialog.getByRole('button', { name: /Add/ }).click();

    await expect(page.getByRole('button', { name: `${MAP_NAME} (1)` })).toBeVisible();
  });

  test('Overwrite replaces existing map', async ({ page }) => {
    await resetDatabase(page);
    const archive = await createConflictArchive();
    await createBaseMap(page);

    await page.getByRole('button', { name: 'Import' }).click();
    await page.setInputFiles('input[type="file"]', archive);

    const summaryDialog = page.getByRole('dialog', { name: /Import summary/i });
    await summaryDialog.getByRole('button', { name: /Continue/i }).click();

    const conflictDialog = page.getByRole('dialog', { name: /Conflict detected/i });
    await conflictDialog.getByRole('button', { name: /Overwrite/ }).click();

    const completeDialog = page.getByRole('dialog', { name: /Import complete/i });
    await expect(completeDialog).toContainText(/Overwrote "Alpha Plan"/i);
  });

  test('Cancel aborts import without changes', async ({ page }) => {
    await resetDatabase(page);
    const archive = await createConflictArchive();
    await createBaseMap(page);

    await page.getByRole('button', { name: 'Import' }).click();
    await page.setInputFiles('input[type="file"]', archive);

    const summaryDialog = page.getByRole('dialog', { name: /Import summary/i });
    await summaryDialog.getByRole('button', { name: /Continue/i }).click();

    const conflictDialog = page.getByRole('dialog', { name: /Conflict detected/i });
    await conflictDialog.getByRole('button', { name: /Cancel import/i }).click();

    await expect(page.getByRole('button', { name: MAP_NAME })).toBeVisible();
    await expect(page.getByRole('button', { name: `${MAP_NAME} (1)` })).toHaveCount(0);
    const toast = page.getByRole('status');
    await expect(toast).toContainText(/Import cancelled/i);
  });
});
