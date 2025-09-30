# Implementation Plan: Undo & Redo System Enhancement (Graph Editor)

**Branch**: `002-the-graph-editor` | **Date**: 2025-09-30 | **Spec**: `/specs/002-the-graph-editor/spec.md`
**Scope**: Introduce full Undo/Redo functionality per updated spec (FR-001..FR-035) including forward replay model (logical two-stack), comprehensive test coverage, and integration into existing graph store & UI.

## Summary
Provide reliable, deterministic reversible editing for graph operations (create, delete with re-parenting, text edit, position move). Redo allows users to traverse forward through reverted actions until a divergence (new change) clears the Redo stack. Implementation will leverage existing global undo stack abstraction (`UndoStack`) and extend semantics to support Redo pointer (already structurally present) ensuring contract alignment with conceptual two-stack model.

## Objectives
1. Implement Redo semantics consistent with FR-031..FR-035 (two logical stacks model).
2. Ensure every undoable action pushes a single atomic entry; redo perfectly mirrors original forward effect.
3. Guarantee clearing of Redo history on new divergence after Undo.
4. Provide accessible UI state (enabled/disabled) for Redo button.
5. Add robust tests preventing regressions, including edge traversal limits & depth rollover.
6. Document behavior and developer guidance for future multi-select grouping.

## Non-Goals
- Keyboard shortcuts (explicitly excluded by FR-029).
- History persistence across reload (FR-021 forbids).
- Time-travel visualization or history inspectors (future tooling backlog).

## Current State Assessment
- Undo implemented for: creation (single node, atomic node+edge), deletion (with & without re-parenting), text edits, moves.
- Redo mechanics implicitly supported by `UndoStack` (has redo pointer) but limited test coverage; spec now formalizes Redo contract.
- Integration tests for undo/redo mostly placeholders (need replacement with real scenarios).

## Design Overview
Logical Model (Two-Stack Equivalent):
- Represented internally via a single array + index (current cursor). Entries < index are applied (Undo stack), entries ≥ index are redoable (Redo stack). Pushing trims tail when index < length.
- Undo: decrement index; invoke entry.undo(); Redo: invoke entry.redo(); increment index.
- New Change: if index < length → truncate array to index; push new entry; enforce depth (drop oldest if >100).

Entry Contract:
```
interface UndoEntry {
  type: 'create' | 'delete' | 'text' | 'move' | string;
  undo(): void;   // MUST fully restore prior observable state for covered entities
  redo(): void;   // MUST reapply forward state exactly once; idempotent under stack discipline
}
```

Atomicity Rules:
- Each undoable user intent = one entry.
- Node creation with connected edge = one entry (create node+edge). Undo deletes both; redo restores both (events node:created then edge:created).
- Deletion with re-parenting: entry captures original node + removed edges + newly created re-parent edges; undo restores originals & removes re-parent edges; redo re-applies deletion algorithm deterministically.

## Risk & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Duplicate event emissions on redo leading to inconsistent caches | Medium | Ensure redo uses same event order & no-op guards (no double insert of existing IDs) |
| Partially applied undo on thrown exception | Low | Keep undo/redo functions side-effect minimal & synchronous; wrap in try/catch at dispatcher if needed (future) |
| Creation undo leaves stale selection/edit state | Low | Clear editing/selection referencing removed node inside undo functions |
| Redo stack not cleared after divergence | High | Add unit test + integration test asserting Redo disabled after new action post-undo |
| Depth enforcement off-by-one causing silent history loss | Medium | Unit test pushing 101 entries validates oldest dropped and pointer intact |

## Phases
### Phase 0 – Inventory & Gap Closure
- [ ] Review `useUndoRedo.ts` for pointer-based implementation; annotate mapping to FR-031..FR-035.
- [ ] Confirm all mutation pathways call `pushUndo` (creation, connected creation, delete, move, text edit). Add missing if any.
- [ ] Add guard for root creation exclusion (already implicit).

### Phase 1 – Redo Semantics Validation & Adjustments
- [ ] Add internal doc comment in `undo-stack.ts` clarifying two-stack equivalence.
- [ ] Expose optional debug inspection helper (dev only) for current depth & pointer (not exported in prod build) to aid tests if necessary.
- [ ] Ensure events `undo:applied` / `redo:applied` include original action type (extend payload).

### Phase 2 – Test Implementation
Unit Tests:
- [ ] `undo-stack`: push → undo → redo roundtrip retains structural invariants.
- [ ] Depth trimming: push 101 create entries, expect length 100 & earliest dropped.
- [ ] Redo clearance: push A,B,C → undo twice (A,[B,C in redo]) → push D → redo disabled.
- [ ] Move action single entry for drag simulation (simulate multiple ephemeral updates not recorded).
- [ ] Text change no-op (same text) does not push entry.

Integration Tests (Playwright):
- [ ] Create node → Undo → Redo (node reappears, position/text stable).
- [ ] Delete node with children → Undo (structure & edges restored) → Redo (re-parent edges re-created deterministically).
- [ ] Mixed sequence A,B,C,D undo-all then redo-all path returns to final state.
- [ ] Undo to baseline (Redo available) then perform new action resets Redo availability.
- [ ] Rapid create via drag threshold ensures no ghost edges or duplicate entries.

Contract / Event Tests:
- [ ] `undo:applied` and `redo:applied` events payload contains `{ actionType }` matching entry.type.

### Phase 3 – Documentation & DX
- [ ] Update `spec.md` Execution Status once tests pass.
- [ ] Add developer README section: "Undo/Redo Internals" (debugging guidance; entry authoring checklist).
- [ ] Add note in `serialization-contract.md` confirming history excluded from persistence layer.

### Phase 4 – Hardening
- [ ] Manual exploratory: rapid alternating undo/redo 50 cycles stable.
- [ ] Performance smoke: measure average undo & redo latency (<5ms local for mid-size graph) – log metric.

## Task Seeds (Preview — final list generated in tasks.md)
- T1: Annotate undo-stack with model doc
- T2: Extend events for actionType propagation
- T3: Create unit tests for undo-stack pointer & depth
- T4: Create integration test: create→undo→redo
- T5: Create integration test: delete re-parent → undo→redo
- T6: Create integration test: sequence undo/redo traversal
- T7: Create unit test: redo clearance on divergence
- T8: Create unit test: no-op text edit
- T9: Update serialization contract docs
- T10: Add developer README undo/redo internals section

## Traceability Matrix (Spec FR ↔ Plan Artifacts)
| FR | Plan Coverage |
|----|---------------|
| FR-001..FR-008 | UI controls & undo-stack behavior tests (T1–T4, T6, T7) |
| FR-009..FR-014 | Creation/deletion/move/text tests (T4, T5, unit move + text tests) |
| FR-015..FR-016 | Drag granularity + text no-op tests (unit + integration) |
| FR-017..FR-020 | Sequence integrity tests (T6) |
| FR-021..FR-023 | History reset verified implicitly (add test in sequence set) |
| FR-024 | Accessibility audit (existing a11y infra; add note) |
| FR-025 | Atomic visual state via integration sequence tests |
| FR-026 | Depth rollover test (T3) |
| FR-027..FR-028 | Exclusion asserted (add negative test optionally) |
| FR-029 | Non-goal documented (plan section) |
| FR-030 | Future note; not implemented now |
| FR-031..FR-035 | Two-stack doc + undo/redo traversal tests (T1, T6, T7) |

## Open Questions
- Do we need user-facing notification when history depth truncates? (Current answer: No, silent per spec.)
- Should selection restore on undo of deletion? Spec says no automatic focus restore; leaving as-is.

## Acceptance Criteria for Plan Completion
- All FR entries mapped to at least one planned test or design note.
- No unresolved open questions blocking implementation.
- Risks have explicit mitigations.

---
Ready for task decomposition (/tasks) once approved.
