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
      nodes: [
        {
          id: 'n1', graphId: 'g1', text: 'Hello', x: 10, y: 20, created: new Date().toISOString(), lastModified: new Date().toISOString(),
          nodeKind: 'note', fontFamily: 'Inter', fontSize: 14, fontWeight: 'normal', italic: false, underline: false, highlight: false,
          bgColor: '#ffeeaa', textColor: '#222222', backgroundOpacity: 80, overflowMode: 'auto-resize', hideShapeWhenUnselected: false, maxHeight: 280
        }
      ],
      edges: []
    };
    const ok = validate(sample);
    if (!ok) {
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });
});

