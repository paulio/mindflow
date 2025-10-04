import { describe, it, expect } from 'vitest';
import { createImportSummaryLike } from '../setup/export-import-fixtures';

const exportLib = await import('../../src/lib/export');
const validateImportSummary = (exportLib as {
  validateImportSummary?: (summary: unknown, context?: { cancelled?: boolean; failedMapIds?: string[] }) => void;
}).validateImportSummary;

type ImportSummaryValidationError = Error & { code?: string };

describe('Import Summary Contract', () => {
  if (!validateImportSummary) {
    throw new Error('validateImportSummary not implemented');
  }

  it('verifies total counts align', () => {
    const summary = createImportSummaryLike({ totalProcessed: 5, succeeded: 1, skipped: 1, failed: 1 });

    try {
      validateImportSummary(summary);
      throw new Error('expected import summary validation to fail');
    } catch (err) {
      const error = err as ImportSummaryValidationError;
      expect(error.code).toBe('IMPORT_SUMMARY_TOTAL_MISMATCH');
    }
  });

  it('requires cancel warning when session cancelled', () => {
    const summary = createImportSummaryLike({
      totalProcessed: 3,
      succeeded: 0,
      skipped: 0,
      failed: 3,
      messages: []
    });

    try {
      validateImportSummary(summary, { cancelled: true, failedMapIds: ['graph-alpha', 'graph-beta', 'graph-gamma'] });
      throw new Error('expected import summary validation to fail');
    } catch (err) {
      const error = err as ImportSummaryValidationError;
      expect(error.code).toBe('IMPORT_SUMMARY_CANCEL_WARNING_MISSING');
    }
  });

  it('ensures each failed map has error message', () => {
    const summary = createImportSummaryLike({
      totalProcessed: 3,
      succeeded: 2,
      skipped: 0,
      failed: 1,
      messages: [
        { mapId: 'graph-alpha', level: 'info', detail: 'Imported successfully.' }
      ]
    });

    try {
      validateImportSummary(summary, { failedMapIds: ['graph-beta'] });
      throw new Error('expected import summary validation to fail');
    } catch (err) {
      const error = err as ImportSummaryValidationError;
      expect(error.code).toBe('IMPORT_SUMMARY_FAILED_MESSAGE_MISSING');
    }
  });
});
