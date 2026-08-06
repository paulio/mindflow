# React Flow DOM PNG Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export a whole graph as a PNG captured from a cloned React Flow DOM surface, preserving the editor's nodes, SVG edge paths, dark canvas, and dot grid while excluding editor chrome.

**Architecture:** A DOM-capture helper clones a named mounted React Flow root into an attached off-screen staging surface and fits the clone to the complete graph without changing the user's viewport. `html-to-image` renders that clone to a canvas, which reuses the existing download and thumbnail persistence path. The existing data/canvas renderer remains the fallback for no-DOM contexts such as background thumbnail generation.

**Tech Stack:** TypeScript 5, React 19, React Flow 11, `html-to-image`, Vite, Vitest/jsdom, Playwright.

---

## File Structure

- Modify: `package.json` and `package-lock.json` - add `html-to-image`.
- Create: `src/lib/react-flow-png-capture.ts` - clone, frame, rasterize, and clean up a mounted React Flow root.
- Modify: `src/components/graph/GraphCanvas.tsx` - give React Flow a stable export class and publish a canvas-export handler.
- Modify: `src/components/panels/GraphMetaPanel.tsx` - invoke the mounted canvas handler first and retain model-export fallback.
- Modify: `src/lib/export.ts` - preserve the data renderer as fallback and thumbnail source.
- Create: `tests/unit/react-flow-png-capture.test.ts` - mock `html-to-image` and assert staging/capture/cleanup behavior.
- Modify: `tests/unit/export-thumbnail-hook.test.ts` - cover user export fallback when no DOM capture handler is registered.
- Create: `playwright.config.ts` - configure Vite web server for browser tests.
- Create: `tests/integration/react-flow-png-export.spec.ts` - verify actual PNG capture keeps grid/nodes/edges and omits controls.

### Task 1: DOM Capture Helper

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/react-flow-png-capture.ts`
- Create: `tests/unit/react-flow-png-capture.test.ts`

- [ ] **Step 1: Install the capture dependency**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' install html-to-image@^1.11.11 --save-dev
```

Expected: `package.json` and `package-lock.json` record `html-to-image` without peer-resolution errors.

- [ ] **Step 2: Write failing helper tests**

Mock `html-to-image` and assert clone capture behavior:
```ts
vi.mock('html-to-image', () => ({ toCanvas: vi.fn() }));

it('captures a cloned React Flow surface with grid while hiding editor-only elements', async () => {
  const surface = renderFlowSurface();
  await captureReactFlowPng(surface);

  expect(document.querySelector('[data-mf-export-stage]')).toBeNull();
  expect(toCanvas).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
    width: expect.any(Number),
    height: expect.any(Number),
    pixelRatio: expect.any(Number),
  }));
  const [, options] = vi.mocked(toCanvas).mock.calls[0] as [HTMLElement, { width: number; height: number; pixelRatio: number }];
  expect(options.width).toBeGreaterThan(0);
  expect(options.height).toBeGreaterThan(0);
  expect(options.pixelRatio).toBeGreaterThan(0);
  expect(options.width * options.pixelRatio).toBeLessThanOrEqual(8_000);
  expect(options.height * options.pixelRatio).toBeLessThanOrEqual(8_000);
  const capturedClone = vi.mocked(toCanvas).mock.calls[0][0];
  expect(capturedClone.querySelector('.react-flow__background')).not.toBeNull();
  expect(capturedClone.querySelector('.react-flow__controls')).toBeNull();
  expect(capturedClone.querySelector('.react-flow__handle')).toBeNull();
});
```

Bounds note: marker capture padding is fixed at 12 logical graph/SVG units (derived from GraphCanvas 9px marker geometry plus stroke margin). Because screen-space rectangles are converted to graph coordinates first, marker and stroke padding must not be divided by source zoom a second time.

Add cases that verify `null` for an absent root and staging cleanup when `toCanvas` rejects.

- [ ] **Step 3: Run test to verify it fails**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' exec vitest run tests/unit/react-flow-png-capture.test.ts
```

Expected: FAIL because `react-flow-png-capture.ts` does not exist.

- [ ] **Step 4: Implement clone capture and cleanup**

Create `src/lib/react-flow-png-capture.ts` with this public contract:
```ts
import { toCanvas } from 'html-to-image';

const EXCLUDED_SELECTOR = [
  '.react-flow__controls', '.react-flow__attribution', '.react-flow__nodesselection',
  '.react-flow__selection', '.react-flow__connectionline', '.react-flow__edgeupdater',
  '.react-flow__handle',
].join(',');

export async function captureReactFlowPng(surface: HTMLElement): Promise<HTMLCanvasElement | null> {
  const stage = document.createElement('div');
  stage.dataset.mfExportStage = 'true';
  stage.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;overflow:hidden;';
  const clone = surface.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(EXCLUDED_SELECTOR).forEach(element => element.remove());
  stage.append(clone);
  document.body.append(stage);
  try {
    return await toCanvas(clone, { pixelRatio: 2, cacheBust: true, backgroundColor: '#0d0f17' });
  } catch {
    return null;
  } finally {
    stage.remove();
  }
}
```

Before `toCanvas`, calculate full node and SVG edge bounds in the clone, set padded clone dimensions, and set its `.react-flow__viewport` transform to fit those bounds. Keep the `.react-flow__background` grid. Derive one output scale that keeps either canvas dimension at or below `8000px`; do not mutate the source surface.

- [ ] **Step 5: Run helper tests to verify they pass**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' exec vitest run tests/unit/react-flow-png-capture.test.ts
```

Expected: PASS.

### Task 2: Mounted Export Handoff And Fallback

**Files:**
- Modify: `src/components/graph/GraphCanvas.tsx`
- Modify: `src/components/panels/GraphMetaPanel.tsx`
- Modify: `src/lib/export.ts`
- Modify: `tests/unit/export-thumbnail-hook.test.ts`

- [ ] **Step 1: Write failing handler/fallback tests**

Add a test that registers a successful mounted-capture handler and verifies the PNG action receives its canvas blob. Add a second test with no surface handler and verify the existing fallback is called:
```ts
expect(exportGraphAsPng).toHaveBeenCalledWith(graph, nodes, edges, {
  persistThumbnail: true,
  trigger: 'export',
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' exec vitest run tests/unit/export-thumbnail-hook.test.ts
```

Expected: FAIL because no mounted export handler exists.

- [ ] **Step 3: Wire mounted React Flow export**

In `GraphCanvas.tsx`, add `className="mf-graph-export-surface"` to `<ReactFlow>`. Register a typed browser-scoped event or graph-context callback that calls `captureReactFlowPng` with that mounted React Flow root. On success, call `persistThumbnailFromCanvas` with `{ mapId: graph.id, trigger: 'export' }` and serialize its canvas blob.

In `GraphMetaPanel.tsx`, call the mounted handler before `exportGraphAsPng`. If it returns `null`, call the existing model renderer unchanged. Keep the current `triggerDownload` file naming and no-op behavior for null blobs. Remove the mounted handler when `GraphCanvas` unmounts. The export action must not update React Flow viewport or graph persistence.

- [ ] **Step 4: Run handler/fallback tests to verify they pass**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' exec vitest run tests/unit/export-thumbnail-hook.test.ts tests/unit/react-flow-png-capture.test.ts
```

Expected: PASS.

### Task 3: Browser-Level Visual Export Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/integration/react-flow-png-export.spec.ts`

- [ ] **Step 1: Configure Playwright to start Vite**

Create:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Write failing browser test**

Use a download expectation around the PNG button. Decode the downloaded PNG and assert non-background pixels occur where graph nodes appear. Assert the capture stage is cleaned up after completion:
```ts
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'PNG' }).click();
const download = await downloadPromise;
expect(download.suggestedFilename()).toMatch(/\.png$/);
await expect(page.locator('[data-mf-export-stage]')).toHaveCount(0);
```

- [ ] **Step 3: Run browser test to verify it fails before capture is wired**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:ui -- tests/integration/react-flow-png-export.spec.ts
```

Expected: FAIL because the DOM capture path is absent.

- [ ] **Step 4: Implement browser capture observability and make test pass**

Dispatch a `mindflow:png-capture` event after clone preparation with `{ hasGrid, controlsCount, handlesCount }`. The browser test must assert `hasGrid === true`, `controlsCount === 0`, and `handlesCount === 0` before download completion.

- [ ] **Step 5: Run browser test to verify it passes**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:ui -- tests/integration/react-flow-png-export.spec.ts
```

Expected: PASS.

### Task 4: Final Validation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-whole-graph-png-export-design.md`

- [ ] **Step 1: Re-read updated design against implementation**

Confirm the implementation preserves grid/nodes/edges, excludes editor-only clone elements, uses DOM capture when mounted, retains no-DOM fallback rendering, and avoids visible viewport mutation.

- [ ] **Step 2: Run complete validation**

Run:
```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:ci
& 'C:\Program Files\nodejs\npm.cmd' run typecheck
& 'C:\Program Files\nodejs\npm.cmd' run lint
& 'C:\Program Files\nodejs\npm.cmd' run test:ui -- tests/integration/react-flow-png-export.spec.ts
git diff --check
```

Expected: tests and typecheck pass; lint reports no errors; Playwright capture test passes; `git diff --check` produces no output.
