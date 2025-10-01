# Tasks: Undo & Redo System (Graph Editor)

**Spec**: `/specs/002-the-graph-editor/spec.md`
**Plan**: `/specs/002-the-graph-editor/plan.md`
**Branch**: `002-the-graph-editor`
**Scope**: Implement full Undo & Redo per FR-001..FR-035 (and previously established shared FRs) with deterministic behavior, depth 100, session-only history.

> TDD RULE: All test tasks in "Tests First" sections MUST be authored and failing (red) before corresponding implementation tasks are executed.

---
## Phase U0: Inventory & Gap Confirmation
- [ ] U000 Audit existing code paths (create, connected create, delete, move, text) to confirm each pushes an undo entry (note any missing).
- [ ] U001 Document current `UndoStack` pointer behavior (internal comment draft) before modifications.
- [ ] U002 Capture baseline manual sanity (create → undo → redo) to confirm starting regression state.

## Phase U1: Contract & Unit Tests (Author First, Expect Fail)
### Contract-Oriented / Event Tests
- [ ] U010 Add contract test for `undo:applied` / `redo:applied` events including `{ actionType }` (FR-002, FR-032, FR-033).
- [ ] U011 Add contract test ensuring export & clone actions DO NOT emit undo/redo mutation events nor alter history (FR-004, FR-027, FR-028, FR-034).

### Core Undo/Redo Logic Unit Tests
- [ ] U020 Depth rollover: push 101 synthetic entries -> size remains 100, oldest dropped (FR-026).
- [ ] U021 Single drag gesture yields exactly one entry (simulate move start, ephemeral moves, commit) (FR-015).
- [ ] U022 Text edit: no-op (same text) does not push entry; changed text does (FR-016, FR-018, FR-013).
- [ ] U023 Redo cleared after divergence: A,B,C -> undo B,C -> new D => redo disabled (FR-006, FR-034).
- [ ] U024 Creation undo/redo: atomic node+edge restored identically (FR-009, FR-010).
- [ ] U025 Deletion undo restores original node + edges; re-parent edges removed (FR-011).
- [ ] U026 Deletion redo re-applies deterministic re-parent edges (FR-012).
- [ ] U027 Mixed sequence (create, text, move, delete) undone in LIFO order (FR-020, FR-017, FR-019).
- [ ] U028 Graph switch resets history (select different graph) (FR-023, FR-021 baseline start empty).
- [ ] U029 Clone resets history (FR-027).
- [ ] U030 Session reload clears history but preserves graph state (FR-021).
- [ ] U031 Baseline disabling: after undoing to index 0, undo disabled / redo enabled if forward entries exist (FR-022, FR-007, FR-008).
- [ ] U032 New change after baseline forward traversal clears redo (FR-034).
- [ ] U033 Ensure exclusion of export/clone/theme/view operations (explicit negative test) (FR-004, FR-028, FR-029).
- [ ] U034 Forward traversal order: redo reapplies steps in original chronological order (FR-035).
- [ ] U035 Undo/Redo operations emit events with correct `actionType` matching entry.type (FR-024 accessibility via metadata future; traceability).

### Data Integrity / Safety
- [ ] U040 Creation undo leaves no orphan edges (scan edges) (FR-009).
- [ ] U041 Deletion undo does not duplicate existing edges (FR-011, FR-043b legacy constraint alignment).

## Phase U2: Integration Tests (Author First, Expect Fail)
Map these directly to Acceptance Scenarios (#1–#15):
- [ ] U050 Scenario 1: Create → Undo (node removed, redo enabled) (FR-001, FR-007, FR-008).
- [ ] U051 Scenario 2: Create → Undo → Redo (node restored) (FR-002, FR-010).
- [ ] U052 Scenario 3: Delete (with children) → Undo (structure restored) (FR-011).
- [ ] U053 Scenario 3b: Delete (with children) → Undo → Redo (re-parent edges deterministic) (FR-012).
- [ ] U054 Scenario 4: Text edit revert (FR-013).
- [ ] U055 Scenario 5: Move revert (FR-014, FR-015).
- [ ] U056 Scenario 6: Mixed chain multi-undo correctness (FR-020).
- [ ] U057 Scenario 7: Redo stack cleared on new change (FR-006, FR-034).
- [ ] U058 Scenario 8: Baseline boundary (undo disabled, redo available) (FR-022, FR-007, FR-008).
- [ ] U059 Scenario 9: Multi text commits undo step-by-step (FR-016).
- [ ] U060 Scenario 10: Single drag = single entry (FR-015).
- [ ] U061 Scenario 11: Fresh load controls disabled (FR-007, FR-008, FR-021).
- [ ] U062 Scenario 12: Reload clears history, keeps graph (FR-021).
- [ ] U063 Scenario 13: Delete → Undo does not auto-select restored node (FR-011, selection nuance).
- [ ] U064 Scenario 14: Multi-step redo (undo 3; redo 3 in original order) (FR-035).
- [ ] U065 Scenario 15: Redo disabled after divergence (FR-006, FR-034).
// Edge Reconnection Scenarios (extends list: Acceptance Scenario 16)
- [ ] U066 Scenario 16: Edge endpoint reconnection (same node) updates handle & is undoable (FR-036, FR-037, FR-038, FR-039).
- [ ] U067 Scenario 16b: Reconnection to same handle is a no-op (no history entry) (FR-040).
- [ ] U068 Scenario 16c: Edge metadata (id, labels placeholder) unchanged after reconnection + undo/redo (FR-041, FR-042).

## Phase U3: Implementation Tasks (Execute After Tests Are Red)
- [ ] U100 Add internal documentation comment in `undo-stack.ts` describing logical two-stack equivalence (FR-031 conceptual clarity).
- [ ] U101 Extend `useUndoRedo.pushUndo` logic (if needed) to truncate redo tail when pointer < length (FR-034).
- [ ] U102 Modify `perform('undo'|'redo')` to include `actionType` from entry in emitted events (FR-032, FR-033, FR-035).
- [ ] U103 Ensure all mutation paths push entries (audit from U000) & add missing: simple `addNode`, `addConnectedNode`, `deleteNode`, `moveNode`, `updateNodeText` (FR-003).
- [ ] U104 Add guards to skip root initial creation from history (FR-021 baseline cleanliness).
- [ ] U105 Refine deletion undo logic to remove re-parent edges cleanly before restoring originals (FR-011).
- [ ] U106 Ensure deletion redo re-runs deterministic handle selection or reuses stored re-parent edges (FR-012, atomicity FR-025).
- [ ] U107 Confirm creation undo deletes associated edge (atomic pair) (FR-009).
- [ ] U108 Confirm creation redo re-inserts node then edge (event ordering) (FR-010, FR-025).
- [ ] U109 Implement depth enforcement exactly 100 in `UndoStack` (drop oldest) (FR-026) (enhance existing if needed).
- [ ] U110 Integrate history reset on graph load/select & clone (FR-023, FR-027).
- [ ] U111 Guarantee export/clone/theme/view actions bypass pushUndo (FR-004, FR-028).
- [ ] U112 Update Undo/Redo UI disabled state to reflect pointer boundaries (FR-007, FR-008, FR-022).
- [ ] U113 Add aria-labels / tooltips with action count or state (FR-024 accessibility).
- [ ] U114 Batch state updates within undo/redo functions to avoid intermediate paints (FR-025 visual atomicity).
- [ ] U115 Strengthen type for `UndoEntry.type` to union of known plus extensible string (dev ergonomics).
- [ ] U116 Add optional development-only inspection helper (e.g., `window.__undoDebug()`) (DX aid; not part of prod bundle) (Plan Phase Hardening).
// Edge Reconnection Implementation
- [ ] U117 Add `edge-reconnect` action type to undo stack type union.
- [ ] U118 Implement edge endpoint drag-to-different-handle logic (capture start handle id & endpoint role).
- [ ] U119 On successful drop to a different handle: mutate edge `sourceHandleId` or `targetHandleId`, emit `edge:reconnected` event, push undo entry (FR-036..FR-039).
- [ ] U121 Guard: if drop handle === original handle → skip pushUndo (FR-040).
- [ ] U122 Ensure undo restores previous handle and redo re-applies new handle (FR-038, FR-039).
- [ ] U123 Preserve edge object identity (no new id) and all other fields (FR-041, FR-042).
- [ ] U124 Clear redo stack upon new reconnection after undo (reuse existing divergence logic) (FR-043 synergy with FR-034).
- [ ] U125 Add developer log (dev mode only) for reconnection events for traceability; remove in cleanup phase.

## Phase U4: Documentation & Developer Experience
- [ ] U120 Update `spec.md` Execution Status checklist marking tests/implementation milestones.
- [ ] U121 Add README or section in existing docs: "Undo/Redo Internals" explaining entry authoring rules (FR traceability).
- [ ] U122 Update `serialization-contract.md` to explicitly state history excluded from persistence (FR-021 reassurance).
- [ ] U123 Add comment headers to each undo/redo implementation block referencing FR IDs.
// Edge Reconnection Docs
- [ ] U126 Update spec checklist marking FR-036..FR-043 coverage.
- [ ] U127 Add section to internal docs describing edge reconnection lifecycle and event sequence.

## Phase U5: Hardening & Performance
- [ ] U130 Manual stress: 50 rapid alternating undo/redo cycles no drift (FR-017 stability).
- [ ] U131 Performance measure: average undo/redo execution <5ms for mid-sized (e.g., 50 nodes) (non-functional objective).
- [ ] U132 Add dev metrics marks `undo:apply` / `redo:apply` in `metrics.ts` (traceability & future profiling).
- [ ] U133 Exploratory test: Interleave undo/redo with new creations mid-sequence (branch prevention) (FR-034).
// Edge Reconnection Hardening
- [ ] U134 Stress: 25 rapid reconnections on same edge cycles between two handles (no memory leak, stable undo depth) (FR-036..FR-039).
- [ ] U135 Performance sample: reconnection apply + undo each <5ms median (profiling note).
- [ ] U136 Edge reconnection while another node is being moved is prevented or gracefully deferred (decide & document) (stability).

## Phase U6: Cleanup
- [ ] U140 Remove any temporary debug logging added during implementation (retain metrics).
- [ ] U141 Final lint & type pass.
- [ ] U142 Ensure coverage thresholds met (undo/redo modules ≥ 90%).
// Edge Reconnection Cleanup
- [ ] U143 Remove temporary reconnection debug logs (retain structured metrics if added).

## Optional / Backlog
- [ ] U150 Keyboard shortcuts (Ctrl+Z / Shift+Ctrl+Z) (FR-029 future).
- [ ] U151 Grouped multi-select actions single entry (FR-030 future).
- [ ] U152 Configurable depth (currently fixed at 100) – backlog.
- [ ] U153 Time-travel history inspector panel (future DX).
- [ ] U154 Text edit merge window (debounce-based grouping) toggle.

---
## Traceability Matrix (FR ↔ Tasks)
| FR | Tasks |
|----|-------|
| FR-001 | U050 |
| FR-002 | U051, U102 |
| FR-003 | U103 |
| FR-004 | U011, U033, U111 |
| FR-005 | (Implicit) All undo ops atomic; tested in U027/U050-U056 |
| FR-006 | U023, U057, U065, U101 |
| FR-007 | U050, U058, U061, U112 |
| FR-008 | U051, U058, U061, U112 |
| FR-009 | U024, U040, U107 |
| FR-010 | U024, U051, U108 |
| FR-011 | U025, U052, U105, U041 |
| FR-012 | U026, U053, U106 |
| FR-013 | U054, U022 |
| FR-014 | U055, U021 |
| FR-015 | U021, U060 |
| FR-016 | U022, U059 |
| FR-017 | U027, U130 |
| FR-018 | U022 |
| FR-019 | U027 |
| FR-020 | U027, U056 |
| FR-021 | U030, U028 (baseline), U104, U110, U122 |
| FR-022 | U031, U058, U112 |
| FR-023 | U028, U110 |
| FR-024 | U113, U035 |
| FR-025 | U108, U114, (all atomic ops) |
| FR-026 | U020, U109 |
| FR-027 | U029, U110, U111 |
| FR-028 | U011, U033, U111 |
| FR-029 | U150 (backlog) |
| FR-030 | U151 (backlog) |
| FR-031 | U100 (doc) |
| FR-032 | U010, U102 |
| FR-033 | U010, U102 |
| FR-034 | U023, U057, U065, U101, U133 |
| FR-035 | U034, U064, U102 |
| FR-036 | U066, U117, U118, U119 |
| FR-037 | U066, U119 |
| FR-038 | U066, U119, U122 |
| FR-039 | U066, U119, U122 |
| FR-040 | U067, U121 |
| FR-041 | U068, U123 |
| FR-042 | U068, U123 |
| FR-043 | U124 (uses existing divergence logic), U066 |

## Ordering / Dependencies
1. U010–U035 (tests) before U100–U116 (implementation).
2. Integration U050–U065 authored after unit layer U020–U035 (can start in parallel once core unit tests drafted).
3. Implementation (U100+) only after all failing tests committed.
4. Documentation (U120–U123) after green test suite.
5. Hardening & performance (U130–U133) after feature complete.

## Parallelization Guidance
- Unit tests (U020–U035) largely independent; parallelizable.
- Integration tests (U050–U065) can be scaffolded concurrently; prefer order of increasing complexity (start with U050/U051).
- Implementation tasks mostly linear where they mutate central undo stack; combine U103/U109/U101 in one focused PR if desired.

## Exit Criteria
- All FRs mapped & verified by passing tests.
- Undo/Redo observed stable under stress (manual + automated).
- Depth, divergence, and re-parent behaviors confirmed.
- No lingering debug logs; metrics optional retained.

---
Ready for execution.
