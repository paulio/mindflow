import { describe, it, expect } from 'vitest';
import schema from '../../specs/001-build-an-application/contracts/persistence-schema.json';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema as any);

describe('Persistence Schema Contract', () => {
  it('validates a sample serialized graph against schema', () => {
    const sample = {
      graph: {
        id: 'g1', name: 'Test', created: new Date().toISOString(), lastModified: new Date().toISOString(), lastOpened: new Date().toISOString(), schemaVersion: 1,
        settings: { autoLoadLast: true },
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      nodes: [],
      edges: []
    };
    const ok = validate(sample);
    if (!ok) {
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });
});

