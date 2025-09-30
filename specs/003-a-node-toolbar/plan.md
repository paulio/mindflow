# Implementation Plan: Node Toolbar & Additional Node Types

**Feature Branch**: `003-a-node-toolbar`  
**Spec**: `/specs/003-a-node-toolbar/spec.md`  
**Date**: 2025-09-30  
**Status**: Draft

## 1. Summary
Add a creation toolbar that introduces two new non-thought node types (Text Note, Rectangle) with customizable background (both) and foreground/text color (Text Note only), binary z-order (front / behind thought nodes), multi-line text support (Text Note), rectangle resizing (resize handles shown only when the Rectangle tool is active and a rectangle is selected) with min 40x40 constraint, and full Undo/Redo coverage for creation, movement, color changes, z-order changes, and rectangle resize. Placement requires 50px edge-to-edge spacing from existing nodes and does not auto-deactivate the tool. Data persists with the graph; history remains session-only.

## 2. Goals & Non-Goals
### Goals
- Quick addition of annotation / decorative nodes without altering existing thought node flow.
- Consistent undo/redo semantics with existing system (one entry per atomic user action, no duplicates for no-ops).
- Accessible keyboard navigation and semantic labeling of toolbar & new node types.
- Deterministic binary z-order that preserves stable stacking on reload.
- Reusable color system with palette + custom + picker sampling.

### Non-Goals
- Arbitrary multi-tier z-order (>2 tiers) (future scope).
- Rectangle text content (remains decorative; no inline text editing this release).
- Bulk multi-select operations (handled later by global multi-select feature).
- Keyboard shortcut for tool activation/deactivation beyond standard tab navigation.

## 3. Assumptions & Constraints
- Existing persistence layer (IndexedDB) can be extended with additional node attributes (type, colors, frontFlag, multiLineText if applicable).
- No performance regression: creation action expected <16ms perceived on graphs ≤300 nodes.
- Undo stack depth remains 100 (shared global constraint).
- Z-order implemented via a frontFlag boolean + stable ordering by created timestamp inside each tier.

## 4. Architecture & Design Overview
### Node Type Extension
Add `nodeKind: 'thought' | 'note' | 'rect'` to node records. Rectangle nodes omit text; note nodes store multiLine text. Colors stored per node (`bgColor`, `textColor?`). Rectangle nodes additionally store `width` and `height` (resizable) while initial implementation may retain fixed size for notes (note resize out-of-scope). Default colors derived from theme tokens but overridden per user change.

### Z-Order Model
Two tiers: frontFlag=true renders above thought nodes; false renders beneath. Rendering order = (tier asc) then created timestamp asc. Undo of z-order flips flag back; redo re-applies. Thought nodes implicitly default to frontFlag=true (or treat absence as true) — no retro migration required if defaulting undefined to true.

### Toolbar State
Global UI state slice: `{ activeTool: 'note' | 'rect' | null }`. Mutually exclusive. Toggled by click; remains active post-placement; toggled off by clicking again or selecting a different tool.

### Placement Rule
Compute minimum edge-to-edge distance: For candidate default size (note: width/height constants), calculate bounding box at click; reject if any existing node's bounding box horizontal & vertical distances overlap closer than 50px threshold (distance >=50 qualifies). Simple axis delta test: if `dx < (w1/2 + w2/2 + 50)` && `dy < (h1/2 + h2/2 + 50)` consider too close (choose exact edge interpretation; adjust formula in implementation). Inclusive at exactly 50.

### Undo/Redo Integration
Entry types added: `create-note`, `create-rect`, `update-node-color`, `update-node-zorder`, `resize-rect`, plus reuse existing move & delete. Each entry stores minimal diff (previous values vs new). Color change merges not performed; each commit is one entry. Rectangle resize batches pointer drags into one entry committed on mouseup (or equivalent gesture end) capturing previous and final `width` & `height`; no entry if net delta is zero.

### Color System
Palette: reuse application theme semantic colors plus a curated set (e.g., neutral, warm, cool). Custom color hex input; eyedropper/picker mode reads color from clicked node (produces new custom hex). Changes apply via details pane; invalid HEX gracefully rejected with validation message.

## 5. Data Model Changes
Add to node schema:
- `nodeKind` (enum)
- `bgColor?: string`
- `textColor?: string` (notes only)
- `frontFlag?: boolean` (default true for thought & note, false optional for rectangle? -> default true for all new nodes; user toggles)
- `width?: number` (rect only; persisted; min 40)
- `height?: number` (rect only; persisted; min 40)

No schema version bump if dynamic fields allowed; otherwise increment version & migrate existing nodes with default values.

## 6. Events (Contract Additions)
- `toolbar:toolActivated { tool }`
- `toolbar:toolDeactivated { tool }`
- `node:colorChanged { nodeId, bgColor?, textColor? }`
- `node:zOrderChanged { nodeId, frontFlag }`
- (Internal / optional) `node:resized { nodeId, width, height, prevWidth, prevHeight }` (Not mandated by spec FRs but included to simplify contract testing & telemetry; can be omitted without violating spec.)
(Reuse existing `node:created`, `node:deleted`, `node:moved`.)

## 7. Accessibility
- Tools: role="button", aria-pressed for active state, labels "note tool" / "rectangle tool".
- Nodes: aria-label "note" or "rectangle" plus optional text snippet (first line) for notes.

## 8. Performance Considerations
- Avoid full re-render on palette hover (apply on commit only).
- Batch state updates for color + undo push in one React state act.
- Distance check O(N); acceptable for N≤1000; optimize later if needed with spatial index.

## 9. Testing Strategy
### Unit
- Distance rule acceptance & rejection (edge cases: exactly 50px).
- Undo entries for each new action type (including `resize-rect`).
- Z-order toggle updates frontFlag only.
- Color change no-op avoidance.
- Rectangle resize min constraint (clamps at 40x40) and no-op detection.

### Resize Gesture Logic (Design Snippet)
- Pointer down on handle captures starting box & pointer position.
- On move: live update width/height (not pushed to undo yet) respecting min.
- On up: compare final vs initial; if changed persist & push `resize-rect` entry.
- Abort (Escape or pointer cancel) reverts to initial without entry.
### Integration
- Toolbar activation exclusivity.
- Creation flows (note & rect) + undo/redo.
- Color palette selection + custom hex + picker simulation.
- Z-order front/back toggle + undo/redo.
- Rectangle resize gesture (handles visible only under correct tool/selection conditions) + undo/redo.
- Mixed history chain integrity with existing thought node operations.
- Persistence reload (nodes & attributes present; history empty) including rectangle size restoration.

### Contract
- Event payload shapes for new events (including optional `node:resized` if implemented).
- Persistence schema includes new fields including width/height for rectangles.

## 10. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Distance miscalculation causes unexpected placement blocking | Medium | Unit tests with geometric cases; isolate function |
| Resize handle interaction lag on large graphs | Low | Avoid state thrash; local component state during drag |
| Inconsistent undo for partial drags | Low | Commit only on gesture end; track active drag flag |
| Persisted size missing after schema update | Medium | Add contract test for width/height, migration default fallback |
| Z-order inconsistent across reloads | High | Persist flag; deterministic secondary sort by created timestamp |
| Overlapping undo entry types cause confusion | Low | Prefixed type strings (`create-note`, etc.) |
| Color picker introduces side-effects in selection | Low | Implement sampling as read-only event not altering selection |
| Performance regression with large graphs | Medium | Lazy distance check early exit when threshold violated |

## 11. Phases
### Phase 0 (Research / Prep)
- Validate existing persistence flexibility for new node fields.
- Determine default sizes (NOTE_W, NOTE_H, RECT_W, RECT_H) & add constants.

### Phase 1 (Contracts & Data Model)
- Update data model doc + persistence schema (if strict) adding new fields.
- Draft event contract entries + failing contract tests.

### Phase 2 (Tests First)
- Unit: distance util, undo action types, z-order toggle, color no-op.
- Contract: events, schema fields.
- Integration skeletons for creation/color/z-order/undo sequences.

### Phase 3 (Implementation Core)
1. Toolbar UI & state slice.
2. Node creation logic (placement validation + undo push).
3. Data model integration & persistence for new fields.
4. Color editing controls in details pane.
5. Z-order toggles & render layering.
6. Undo entry wiring.

### Phase 3b (Rectangle Resizing)
1. Extend node record persistence (width/height default constants for rectangles).
2. RectNode resize handles (corners; show only if active tool == 'rect' AND rect selected).
3. Gesture handling (live local size state, clamped min 40, pixel rounding).
4. Commit + persistence + `resize-rect` undo entry on gesture end (skip if no net change).
5. Optional `node:resized` event emission & contract test toggle.

### Phase 4 (Integration Completion)
- Color picker sample logic.
- Multi-line note editing parity.
- Persistence reload verification adjustments (including resize persistence).

### Phase 5 (Polish)
- A11y audit (axe) updates.
- Visual distinction styling.
- Docs & quickstart update.

### Phase 6 (Hardening)
- Stress test rapid placement & undo.
- Performance timing instrumentation around placement & color commit.

## 12. Task Seeds
(Will be expanded into tasks.md later)
- T1 Distance util + tests
- T2 Data model + schema update
- T3 Event contract tests
- T4 Toolbar components & state
- T5 Placement logic + undo
- T6 Note creation & multi-line edit reuse
- T7 Rectangle creation
- T8 Color palette + custom + picker
- T9 Z-order toggle + undo
- T10 Persistence reload test
- T11 Mixed undo sequence test
- T12 A11y labels & keyboard nav test
- T13 Performance mark instrumentation
- T14 Rectangle width/height persistence + defaults
- T15 Resize handles & gesture logic
- T16 Resize undo entry + tests
- T17 Resize persistence reload test
- T18 Optional resize event contract test

## 13. Traceability (Spec FR → Plan Sections)
| Spec FR | Plan Coverage |
|---------|---------------|
| FR-001..005 | Toolbar state & UI (Phase 3) |
| FR-006..008 | Placement logic + distance util (T1, T5) |
| FR-009..016 | Creation & undo entries (T5–T7) |
| FR-017..021 | Z-order + undo (T9) |
| FR-022–024 | Tool behavior & rejection tests (integration) |
| FR-025–026 | Coexist & deletion path unchanged (regression tests) |
| FR-027–028 | Accessibility & exclusivity (T12) |
| FR-029–030 | Persistence reload & perf marks (T10, T13) |
| FR-031–033 | Movement + color system (T8) |
| FR-034–036 | Z-order persistence & overlap prevention (T5, T9) |
| FR-037–040 | Visual distinction, selection stability, activation race (Polish + tests) |
| FR-041–046 | Rectangle resizing (Phase 3b, Tasks T14–T18) |

## 14. Open Questions
(NONE — all clarified.)

## 15. Exit Criteria
- All new FRs covered by at least one passing test (including FR-041–046 for resizing).
- Undo/Redo includes create, move, color, z-order, resize for appropriate node types.
- Distance rule validated at 50px inclusive edge-to-edge.
- Z-order stable & persists across reload.
- Rectangle size persists across reload and undo/redo cycles retain selection focus.
- A11y checks pass (toolbar, nodes, focus remains stable after resize).
- No performance regression for target graph sizes (resize gesture remains responsive <16ms per frame during drag).

---
Ready for task decomposition.
