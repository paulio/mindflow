import { describe, it, expect } from 'vitest';
import { createManifestLike } from '../setup/export-import-fixtures';

const exportLib = await import('../../src/lib/export');
const validateExportManifest = (exportLib as { validateExportManifest?: (manifest: unknown) => void }).validateExportManifest;

type ManifestValidationError = Error & { code?: string; field?: string };

describe('Export Manifest Contract', () => {
  if (!validateExportManifest) {
    throw new Error('validateExportManifest not implemented');
  }

  it('rejects missing manifestVersion field', () => {
    const manifest = createManifestLike();
    delete (manifest as any).manifestVersion;

    try {
      validateExportManifest(manifest);
      throw new Error('expected manifest validation to fail');
    } catch (err) {
      const error = err as ManifestValidationError;
      expect(error.code).toBe('MANIFEST_MISSING_FIELD');
      expect(error.field).toBe('manifestVersion');
    }
  });

  it('detects totalMaps mismatch', () => {
    const manifest = createManifestLike();
    manifest.totalMaps = 999;

    try {
      validateExportManifest(manifest);
      throw new Error('expected manifest validation to fail');
    } catch (err) {
      const error = err as ManifestValidationError;
      expect(error.code).toBe('MANIFEST_INTEGRITY_MISMATCH');
    }
  });

  it('flags duplicate map ids', () => {
    const manifest = createManifestLike();
    manifest.maps[1].id = manifest.maps[0].id;

    try {
      validateExportManifest(manifest);
      throw new Error('expected manifest validation to fail');
    } catch (err) {
      const error = err as ManifestValidationError;
      expect(error.code).toBe('MANIFEST_DUPLICATE_ID');
    }
  });
});
