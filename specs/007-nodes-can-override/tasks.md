# Task Plan: Node Border Colour Overrides & Hierarchical Defaults

**Branch**: 007-nodes-can-override  
**Spec**: specs/007-nodes-can-override/spec.md  
**Plan**: specs/007-nodes-can-override/plan.md  

## Conventions
- TDD: Write failing test before implementation.
- [P] = Parallelizable (different files / no shared mutable artifact sequencing).
- Keep functions <= cyclomatic complexity 10; add constants instead of magic values.
- Use existing design tokens; palette defined once.

## Palette Constant (Reference Only)
`["#1e222b","#2d323f","#444b5a","#556070","#6b7687","#8892a0","#b48ead","#a3be8c","#d08770","#bf616a"]`

---
## Tasks

### Setup & Foundations
T001. Create palette & mapping helper file `src/lib/node-border-palette.ts` exporting: PALETTE (array), ROOT_FALLBACK, computeInitialBorderColour(depth, palette). Include JSDoc + unit-ready pure function.  
T002. Extend type definitions in `src/lib/types.ts` (or appropriate node type file) adding new optional/required fields (originalBorderColour, currentBorderColour, borderPaletteIndex, borderOverrideFlag, borderOverrideColour?). Add doc comments.  

### Unit Tests (Write First)
T003. [P] Add failing unit test `tests/unit/node-border-mapping.test.ts` covering: depth mapping wrap, empty palette fallback, deterministic index capture.  
T004. [P] Add failing unit test `tests/unit/node-border-override.test.ts` for apply/clear logic (pure reducer style) using mock node objects.  
T005. Add failing undo test `tests/unit/undo-border-override.test.ts` verifying single undo step toggles override state correctly (simulate push/pop on undo stack).  

### Store & State Layer
T006. Implement mapping usage on node creation in `src/state/graph-store.tsx`: when creating a node, set originalBorderColour/currentBorderColour/borderPaletteIndex/flag=false. Ensure legacy load hydration adds missing fields.  
T007. Implement override action `overrideNodeBorder(id, hex)` with validation & state mutation + undo registration.  
T008. Implement clear action `clearNodeBorderOverride(id)` restoring original border colour + undo entry.  
T009. Update serialization/deserialization logic (persistence layer in graph-store / indexeddb utility) to include new fields.  
T010. Add selector/helper `getNodeBorderInfo(id)` returning computed shape for UI (colour, overridden, original).  

### UI Integration
T011. [P] Add border styling logic to node components (`src/components/nodes/ThoughtNode.tsx`, `RectNode`, `NoteNode`) using `currentBorderColour`. Replace previous static border style for nodes.  
T012. Add override controls to Detail/GraphMetaPanel: new section "Border" listing palette swatches (reuse existing background palette component logic but for border).  
T013. Include custom hex input (shared validation) for border override; on commit call override action.  
T014. Add reset button (if node has overrideFlag) calling clear action.  
T015. Ensure buttons have aria-labels and keyboard focus order; add focus ring classes.  

### Integration Tests
T016. Add failing integration test `tests/integration/override-border-colour.spec.ts` scenario: create node → note colour; override → assert change; undo → revert; redo → reapplied; reset → back to original after override.  
T017. Add failing integration test `tests/integration/reparent-border-colour.spec.ts` verifying re-parent (or simulated depth change) leaves border colour unchanged. Skip if re-parent UI not yet available; include TODO comment.  

### Undo/Redo & Regression Tests
T018. Extend existing undo tests by adding case in `tests/unit/undo-depth-rollover.test.ts` or new file verifying no unintended side effects on unrelated node fields when performing colour overrides.  

### Accessibility & UX
T019. [P] Add a11y test (integration or contract style) ensuring palette buttons have labels & are focusable (e.g., extend `tests/integration/accessibility.spec.ts`).  
T020. [P] Ensure colour contrast note: add comment in code referencing future enhancement for contrast checks (no runtime logic yet).  

### Documentation & Quickstart Alignment
T021. Update `quickstart.md` (append verification step referencing new reset button label).  
T022. Update `spec.md` Derived Rules section to confirm implemented field names if any differ after coding review.  
T023. Add short README snippet (if needed) in root or docs describing border colour feature (optional if existing docs pattern).  

### Refactors / Polish
T024. [P] Deduplicate palette constant if originally duplicated in `GraphMetaPanel` by importing new shared constant; remove inline array.  
T025. [P] Add JSDoc comments to new store actions & mapping helper ensuring inputs/outputs documented for maintainability.  
T026. [P] Run lint & fix any new warnings; ensure no magic numbers (extract threshold constants if added).  

### Final Validation
T027. Execute all unit + integration tests; ensure new tests pass while initially failing before implementations (verify TDD).  
T028. Manual QA: Follow `quickstart.md` step-by-step; capture screenshot evidence (optional) and attach to PR description.  
T029. Coverage Review: Confirm coverage threshold maintained; add focused tests if drop > acceptable baseline.  
T030. Final Constitution Gate: Confirm principles (quality, tests, UX, performance) & update plan progress (Phase 3, Phase 4 readiness).  

---
## Parallelization Guide
- Early Parallel: T003, T004 can run together. T011 can begin after T006 completes.
- After Store Core (T006–T010): UI tasks T011–T015 can parallelize with integration test authoring (T016).
- Polish tasks (T024–T026) can batch-run after primary implementation but before final validation.

## Agent Command Examples
```
# Run unit tests only
npm test -- --run tests/unit/node-border-mapping.test.ts

# Run integration test
npm test -- --run tests/integration/override-border-colour.spec.ts
```

## Progress Mapping
- T001–T005: Establish TDD foundation.
- T006–T010: Core state & persistence.
- T011–T015: UI/UX feature surfacing.
- T016–T018: Behavioral integration & undo regression.
- T019–T020: Accessibility & future-proofing.
- T021–T023: Documentation alignment.
- T024–T026: Refactors & quality gates.
- T027–T030: Validation & readiness for merge.

## Completion Criteria
- All tasks T001–T030 complete.
- All new tests pass; prior suite unaffected.
- No lint/type errors; coverage unchanged or improved.
- Feature behaves per quickstart and spec.

