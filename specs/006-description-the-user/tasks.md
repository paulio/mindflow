# Feature 006 Tasks: Multi-Select Bounding Box

Feature Directory: `specs/006-description-the-user`
Source Plan: `plan.md`
Spec: `spec.md`

Conventions:
- TDD-first: test tasks precede implementation where feasible.
- [P] indicates tasks that can be executed in parallel with other [P] tasks (no shared file contention expected).
- Non-[P] tasks must run in listed order.
- Each task description is explicit so an agent can complete it without additional clarification.

## Summary Dependency Flow
Setup → Store State & Events (tests then impl) → Canvas Gesture (tests then impl) → Selection Resolution (tests then impl) → Additive & Toggle → Group Move (batch) → Clear/Escape → Event Diff Tests → Performance/Polish → Docs.

## Tasks

T001. Create test scaffold for multi-select state [X]
- Files: `tests/unit/` (new `selection-state.test.ts`)
- Actions: Add unit tests covering initial empty selection, replaceSelection, addToSelection, toggleSelection, clearSelection behavior (API not implemented yet — tests will fail initially).
- Depends: None (can write tests before implementation)

T002. Implement selection state & mutators in store [X]
- File: `src/state/graph-store.tsx`
- Actions: Add `selectedNodeIds`, helper selectors, mutator functions: `replaceSelection`, `addToSelection`, `toggleSelection`, `clearSelection`; ensure existing node selection flows redirect to these.
- Depends: T001

T003. Add unit tests for marquee activation threshold logic [X]
- File: `tests/unit/marquee-threshold.test.ts`
- Actions: Tests should simulate pointer down/move deltas (<8px no activation; ≥8px activates). Use mock functions or minimal harness; gesture impl not yet present (tests fail initially).
- Depends: None (independent of selection state tests) [P]

T004. Implement marquee ephemeral state in store [X]
- File: `src/state/graph-store.tsx`
- Actions: Add `marquee` object (active,start,current,additive). Add actions: `beginMarquee(startPoint, additiveFlag)`, `updateMarquee(point)`, `endMarquee()`, `cancelMarquee()`.
- Depends: T002 (store structure) & T003 (threshold semantics reference)

T005. Integration test: basic marquee replaces selection
- File: `tests/integration/marquee-basic.spec.ts`
- Actions: Simulate creating 3 nodes; drag marquee around two; expect only those two selected.
- Depends: T004 (marquee state & preliminary gesture hooks—will initially fail until gesture implemented)

T006. Implement canvas gesture handlers [X]
- File: `src/components/graph/GraphCanvas.tsx`
- Actions: Add pointer listeners (pointerdown/move/up) on background; enforce start-on-empty rule; threshold detection; shift-key additive flag capture; no selection commit yet (end just computes bounds placeholder).
- Depends: T004 (marquee state), T003 (threshold tests)

T007. Implement selection resolution on marquee end [X]
- File: `src/components/graph/GraphCanvas.tsx`
- Actions: On valid marquee end, compute node overlaps, call `replaceSelection` or `addToSelection`; deactivate marquee.
- Depends: T006, T002

T008. Unit tests: overlap inclusion rule
- File: `tests/unit/marquee-overlap.test.ts`
- Actions: Supply mock node bounding boxes vs marquee rectangle; assert partial edge contact counts as inclusion.
- Depends: T007 (logic present) [P]

T009. Integration test: additive marquee with Shift
- File: `tests/integration/marquee-additive.spec.ts`
- Actions: First marquee selects Node A; second marquee with Shift adds Node B; assert both selected.
- Depends: T007

T010. Implement node toggle (Ctrl/Cmd-click) logic
- File: `src/components/graph/GraphCanvas.tsx`
- Actions: On node click with Ctrl/Cmd and movement < threshold, toggle membership without clearing others; prevent drag.
- Depends: T002

T011. Integration test: toggle membership
- File: `tests/integration/toggle-selection.spec.ts`
- Actions: Select one node; Ctrl-click adds another; Ctrl-click removes first; ensure no unintended drag.
- Depends: T010

T012. Implement group drag movement (simple per-node updates)
- File: `src/components/graph/GraphCanvas.tsx`, possibly `src/state/graph-store.tsx`
- Actions: When dragging a selected node and multi-selection size >1, move all selected nodes in sync using delta; commit final positions via existing move calls (Option A interim).
- Depends: T007 (selection), existing drag infra

T013. Upgrade to batch move API (optional optimization)
- File: `src/state/graph-store.tsx`
- Actions: Add `moveNodesBatch([{id,x,y}])` with single undo entry; integrate with group drag handler.
- Depends: T012

T014. Integration test: group move preserves relative offsets
- File: `tests/integration/group-move.spec.ts`
- Actions: Select multiple nodes; record original relative distances; drag group; assert relative deltas unchanged.
- Depends: T012

T015. Implement clear selection behaviors
- File: `src/components/graph/GraphCanvas.tsx`
- Actions: Click empty canvas (no drag) clears selection; Escape key clears selection; ensure additive marquee start doesn’t prematurely clear.
- Depends: T007

T016. Integration test: clear & escape
- File: `tests/integration/clear-selection.spec.ts`
- Actions: Populate selection; click empty area; expect empty; reselect; press Escape; expect empty.
- Depends: T015

T017. Implement selection:changed event emission
- File: `src/lib/events.ts` (or create new) & `src/state/graph-store.tsx`
- Actions: On selection mutations, compute diff, emit event with {added,removed,current}.
- Depends: T002

T018. Unit test: selection:changed diff correctness
- File: `tests/unit/selection-events.test.ts`
- Actions: Sequence of selection operations; capture emitted payloads; assert diff arrays accurate.
- Depends: T017

T019. Visual rendering of marquee rectangle [X]
- File: `src/components/graph/GraphCanvas.tsx` (or new `MarqueeOverlay.tsx`)
- Actions: Draw translucent rectangle while active; style using tokens; ensure pixel alignment.
- Depends: T006

T020. Performance micro-benchmark (dev instrumentation)
- File: `src/lib/metrics.ts` (extend) & `src/components/graph/GraphCanvas.tsx`
- Actions: Time marquee selection resolution for synthetic 150 nodes; log if >8ms (dev only behind flag).
- Depends: T007

T021. Polish: constant extraction & feature flag
- File: `src/lib/types.ts` or new constants file
- Actions: Export `MULTISELECT_THRESHOLD_PX`, `ENABLE_MULTISELECT` (default true), update usages.
- Depends: T020 (can be parallel if constant not already used) [P]

T022. Polish: documentation comments & spec cross-references
- Files: modified earlier touched files
- Actions: Add JSDoc summarizing marquee workflow; reference FR IDs; ensure no functional changes.
- Depends: Majority core done (after T020)

T023. Regression integration test: single-node behaviors unaffected
- File: `tests/integration/single-node-regression.spec.ts`
- Actions: Node create, select, move, edit label, delete works same with multi-select code present.
- Depends: T015

T024. Final cleanup & lint pass
- Files: all modified
- Actions: Run linter, fix warnings; ensure type safety; prune unused imports.
- Depends: All prior implementation tasks

T025. Update feature spec acceptance checklist status
- File: `specs/006-description-the-user/spec.md`
- Actions: Mark FRs implemented; note any deferred items; add performance note.
- Depends: T024

## Parallel Execution Guidance Examples
After T002 completes, the following can run in parallel:
- [P] T003 (threshold tests)
After T007 completes:
- [P] T008 (overlap unit tests)
- [P] T009 (additive integration test)
- [P] T019 (visual rendering) if not already done
After T012 completes:
- [P] T014 (group move relative offsets test)
After T017 completes:
- [P] T018 (event diff test)
After T020 completes:
- [P] T021 (constants extraction)

## Task Agent Command Examples
(Adjust numbering as needed if tasks are split)
- Run a single task: `task run specs/006-description-the-user/tasks.md T002`
- Run parallel group: `task run-parallel specs/006-description-the-user/tasks.md T008 T009 T019`

## Notes
- Batch move optimization (T013) can be skipped if time-constrained; update T014 expectation accordingly.
- If feature flag disabled, ensure all gesture handlers early-return.

---
Tasks file generated from plan.md. Proceed with execution and iterative validation.
