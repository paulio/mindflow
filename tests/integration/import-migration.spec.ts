import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { createTestMapSnapshot } from '../setup/export-import-fixtures';

type InputFilePayload = Parameters<Page['setInputFiles']>[1];

async function resetDatabase(page: Page) {
  await page.addInitScript(() => {
    indexedDB.deleteDatabase('mindflow');
  });
}

async function createLegacyArchive(): Promise<InputFilePayload> {
  const snapshot = createTestMapSnapshot('legacy-map', 'Legacy Vision', {
    graph: { schemaVersion: 0 }
  });
  const legacyManifest = {
    manifestVersion: 0,
    generatedAt: '2024-01-01T00:00:00.000Z',
    appVersion: '0.9.0',
    totalMaps: 1,
    maps: [
      {
        id: snapshot.graph.id,
        name: snapshot.graph.name,
        schemaVersion: 0,
        payloadPath: `maps/${snapshot.graph.id}.json`,
        lastModified: snapshot.graph.lastModified
      }
    ]
  };

  const legacyPayload = {
    graph: {
      ...snapshot.graph,
      schemaVersion: 0,
      viewport: undefined
    },
    nodes: snapshot.nodes.map(node => ({
      ...node,
      text: (node.text || '').toUpperCase()
    })),
    edges: snapshot.edges,
    references: undefined
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(legacyManifest, null, 2));
  zip.file(`maps/${snapshot.graph.id}.json`, JSON.stringify(legacyPayload, null, 2));

  const buffer = await zip.generateAsync({ type: 'uint8array' });
  return {
    name: 'legacy-import.zip',
    mimeType: 'application/zip',
    buffer
  };
}

test('Older export triggers migration messaging and succeeds', async ({ page }) => {
  await resetDatabase(page);
  const archive = await createLegacyArchive();

  await page.goto('/');
  await page.getByRole('button', { name: 'Import' }).click();
  await page.setInputFiles('input[type="file"]', archive);

  const summaryDialog = page.getByRole('dialog', { name: /Import summary/i });
  await expect(summaryDialog).toContainText(/Migration required/i);
  await summaryDialog.getByRole('button', { name: /Import maps/i }).click();

  const progressDialog = page.getByRole('dialog', { name: /Importing/i });
  await expect(progressDialog).toContainText(/Migrating manifest version 0/i);
  await expect(progressDialog).toContainText(/Upgrading map legacy-map/i);

  await expect(page.getByRole('button', { name: 'Legacy Vision' })).toBeVisible();
});
