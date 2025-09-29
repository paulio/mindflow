// Duplicate legacy file kept to avoid accidental re-creation.
// Real behavioral assertions live in `new-graph-initial-node.test.tsx`.
// Provide a harmless placeholder test so Vitest doesn't fail this file.
import { describe, it, expect } from 'vitest';

describe('legacy placeholder (initial node test duplicate)', () => {
	it('passes (placeholder)', () => {
		expect(true).toBe(true);
	});
});
