# Whole-Graph PNG Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make whole-graph PNG exports preserve editor-style node placement and directional curved connections.

**Architecture:** Keep `exportGraphAsPng` as the sole renderer for downloads and thumbnails. Extract pure node-handle and cubic-Bezier geometry into `src/lib/export-geometry.ts`; the canvas renderer consumes that geometry for bounds and edge drawing, while unit tests exercise it without DOM or canvas dependencies.

**Tech Stack:** TypeScript 5, React Flow handle conventions, HTML Canvas 2D, Vitest.

---

## File Structure

- Create: `src/lib/export-geometry.ts` - resolve node handle anchors, directional cubic Bezier control points, and curve bounds.
- Create: `tests/unit/export-geometry.test.ts` - test handle anchors, legacy fallback anchors, and curve bounds.
- Modify: `src/lib/export.ts` - use geometry helper for full-graph PNG edges and bounds.
- Modify: `tests/unit/export-thumbnail-hook.test.ts` - extend the canvas fake only if the renderer's new calls require it.

### Task 1: Export Geometry Contract

**Files:**
- Create: `tests/unit/export-geometry.test.ts`
- Create: `src/lib/export-geometry.ts`

- [ ] **Step 1: Write failing tests for handle anchors and legacy fallback**

```ts
import { describe, expect, it } from 'vitest';
import { getHandleAnchor, getBezierBounds, getBezierCurve } from '../../src/lib/export-geometry';

describe('export geometry', () => {
  const node = { x: 100, y: 200, width: 120, height: 60 };

  it('uses directional handle anchors', () => {
    expect(getHandleAnchor(node, 'e')).toEqual({ x: 220, y: 230, direction: 'e' });
    expect(getHandleAnchor(node, 'n')).toEqual({ x: 160, y: 200, direction: 'n' });
  });

  it('uses the node centre for missing legacy handles', () => {
    expect(getHandleAnchor(node, undefined)).toEqual({ x: 160, y: 230, direction: null });
  });

  it('includes cubic control points in curve bounds', () => {
    const curve = getBezierCurve(
      { x: 0, y: 0, direction: 'e' },
      { x: 240, y: 80, direction: 'w' },
    );
    expect(getBezierBounds(curve)).toMatchObject({ minX: 0, maxX: 240 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm exec vitest run tests/unit/export-geometry.test.ts`

Expected: FAIL because `../../src/lib/export-geometry` does not exist.

- [ ] **Step 3: Implement the pure geometry helpers**

```ts
export type HandleDirection = 'n' | 'e' | 's' | 'w';
export interface ExportRect { x: number; y: number; width: number; height: number; }
export interface HandleAnchor { x: number; y: number; direction: HandleDirection | null; }
export interface BezierCurve { start: HandleAnchor; control1: { x: number; y: number }; control2: { x: number; y: number }; end: HandleAnchor; }

export function getHandleAnchor(rect: ExportRect, handle?: string): HandleAnchor {
  const centre = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  switch (handle) {
    case 'n': return { x: centre.x, y: rect.y, direction: 'n' };
    case 'e': return { x: rect.x + rect.width, y: centre.y, direction: 'e' };
    case 's': return { x: centre.x, y: rect.y + rect.height, direction: 's' };
    case 'w': return { x: rect.x, y: centre.y, direction: 'w' };
    default: return { ...centre, direction: null };
  }
}
```

Implement `getBezierCurve` with control points projected from each anchor in its direction, using a distance capped at `120` pixels. Implement `getBezierBounds` by evaluating cubic extrema on both axes, not only endpoints.

- [ ] **Step 4: Run the geometry tests to verify they pass**

Run: `npm exec vitest run tests/unit/export-geometry.test.ts`

Expected: PASS with all geometry cases green.

### Task 2: Canvas Renderer Integration

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `tests/unit/export-thumbnail-hook.test.ts`

- [ ] **Step 1: Add a failing renderer test for curved path drawing**

Extend the existing fake 2D context with `moveTo`, `bezierCurveTo`, `stroke`, and `beginPath` spies. Add a test that invokes `exportGraphAsPng` with two nodes joined by an edge with `sourceHandleId: 'e'` and `targetHandleId: 'w'`, then expects `bezierCurveTo` to have been called.

```ts
expect(context.bezierCurveTo).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the renderer test to verify it fails**

Run: `npm exec vitest run tests/unit/export-thumbnail-hook.test.ts`

Expected: FAIL because the exporter only calls `lineTo` for edges.

- [ ] **Step 3: Integrate geometry into `exportGraphAsPng`**

Import `getHandleAnchor`, `getBezierBounds`, and `getBezierCurve`. Build `ExportRect` values from the resolved dimensions before calculating bounds. For every valid edge:

```ts
const curve = getBezierCurve(
  getHandleAnchor(sourceRect, edge.sourceHandleId),
  getHandleAnchor(targetRect, edge.targetHandleId),
);
const curveBounds = getBezierBounds(curve);
ctx.beginPath();
ctx.moveTo(curve.start.x - minX + padding, curve.start.y - minY + padding);
ctx.bezierCurveTo(
  curve.control1.x - minX + padding,
  curve.control1.y - minY + padding,
  curve.control2.x - minX + padding,
  curve.control2.y - minY + padding,
  curve.end.x - minX + padding,
  curve.end.y - minY + padding,
);
ctx.stroke();
```

Merge each `curveBounds` into the pre-canvas `minX`, `minY`, `maxX`, and `maxY` values. Preserve the current edge-before-node paint order and skip edges whose node rectangles are missing.

- [ ] **Step 4: Run renderer and thumbnail tests to verify they pass**

Run: `npm exec vitest run tests/unit/export-thumbnail-hook.test.ts tests/unit/export-geometry.test.ts`

Expected: PASS.

### Task 3: Regression Validation

**Files:**
- Modify: `src/lib/export.ts`
- Test: `tests/unit/export-geometry.test.ts`
- Test: `tests/unit/export-thumbnail-hook.test.ts`

- [ ] **Step 1: Add a missing-node edge regression test**

Add an export test whose edge references a nonexistent target node. Assert the export still resolves to a PNG blob and `bezierCurveTo` is not called for that edge.

- [ ] **Step 2: Run the focused export suite**

Run: `npm exec vitest run tests/unit/export-geometry.test.ts tests/unit/export-thumbnail-hook.test.ts`

Expected: PASS.

- [ ] **Step 3: Run project validation**

Run: `npm run test:ci`

Expected: PASS with no failed tests.

Run: `npm run typecheck`

Expected: exit code `0`.

Run: `npm run lint`

Expected: exit code `0`; existing warnings may remain.

- [ ] **Step 4: Check final patch integrity**

Run: `git diff --check`

Expected: no output and exit code `0`.