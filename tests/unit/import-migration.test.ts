import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { createTestMapSnapshot } from '../setup/export-import-fixtures';
import {
  CURRENT_MAP_SCHEMA_VERSION,
  EXPORT_MANIFEST_VERSION,
  inspectImportArchive,
} from '../../src/lib/export';

async function createLegacyArchive(): Promise<Uint8Array> {
  const snapshot = createTestMapSnapshot('legacy-sample', 'Legacy Sample', {
    graph: { schemaVersion: CURRENT_MAP_SCHEMA_VERSION - 2 },
  });

  const manifest = {
    manifestVersion: EXPORT_MANIFEST_VERSION - 1,
    generatedAt: '2024-01-01T00:00:00.000Z',
    appVersion: '0.9.0',
    totalMaps: 1,
    maps: [
      {
        id: snapshot.graph.id,
        name: snapshot.graph.name,
        schemaVersion: CURRENT_MAP_SCHEMA_VERSION - 2,
        payloadPath: `maps/${snapshot.graph.id}.json`,
        lastModified: snapshot.graph.lastModified,
      },
    ],
  };

  const payload = {
    graph: { ...snapshot.graph, schemaVersion: CURRENT_MAP_SCHEMA_VERSION - 2 },
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    references: snapshot.references,
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest));
  zip.file(`maps/${snapshot.graph.id}.json`, JSON.stringify(payload));
  return zip.generateAsync({ type: 'uint8array' });
}

describe('import archive migration', () => {
  it('marks migration as attempted and succeeded for older schemas', async () => {
    const archiveBuffer = await createLegacyArchive();
    const inspection = await inspectImportArchive(archiveBuffer);

    const [entry] = inspection.session.entries;
    expect(entry.migrationAttempted).toBe(true);
    expect(entry.migrationSucceeded).toBe(true);
    expect(entry.snapshot.schemaVersion).toBe(CURRENT_MAP_SCHEMA_VERSION);
    expect(entry.migrationNotes).toContainEqual(expect.stringContaining('Upgraded schema'));
  });

  it('rejects archives with manifest versions newer than supported', async () => {
    const snapshot = createTestMapSnapshot('future-map', 'Future Map');
    const manifest = {
      manifestVersion: EXPORT_MANIFEST_VERSION + 5,
      generatedAt: '2026-01-01T00:00:00.000Z',
      appVersion: '2.0.0',
      totalMaps: 1,
      maps: [
        {
          id: snapshot.graph.id,
          name: snapshot.graph.name,
          schemaVersion: snapshot.graph.schemaVersion,
          payloadPath: `maps/${snapshot.graph.id}.json`,
          lastModified: snapshot.graph.lastModified,
        },
      ],
    };

    const payload = {
      graph: snapshot.graph,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      references: snapshot.references,
    };

    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify(manifest));
    zip.file(`maps/${snapshot.graph.id}.json`, JSON.stringify(payload));
    const buffer = await zip.generateAsync({ type: 'uint8array' });

    await expect(inspectImportArchive(buffer)).rejects.toMatchObject({
      code: 'IMPORT_MANIFEST_UNSUPPORTED',
    });
  });
});
