// Polyfill indexedDB for jsdom test environment
import 'fake-indexeddb/auto';
// Minimal ResizeObserver polyfill for ReactFlow in jsdom
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
	(globalThis as any).ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
