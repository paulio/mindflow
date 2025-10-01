# Task Breakdown: Rich Note Formatting & Adaptive Presentation

Feature Branch: `004-create-a-fully`
Source Spec: `specs/004-create-a-fully/spec.md`
Assumptions Locked (Defaults Accepted 2025-10-01)

Legend:
- [P] = Parallelizable (no dependency on earlier uncompleted tasks)
- Deliverable styles: Code, Test, Doc, Refactor
- FR refs map to spec Functional Requirements

## Phase 0 / Prep

1. [X] Confirm Clarification Entries (Fonts + Defaults) in Spec (update Clarification Resolutions table with all defaults). Deliverable: spec patch. (FR-001..FR-025) [Code]
2. [X] Add Assumptions Section to `plan.md` (fonts, size range, opacity steps, max dims, min dims, contrast policy, undo granularity). [Code]
3. [X] Create Changelog stub (`CHANGELOG.rich-notes.md`) summarizing scope & risks. [Doc] [P]

## Data Model & Persistence

4. [X] Extend `NodeRecord` (in `src/lib/types.ts`) with new optional fields: `fontFamily`, `fontSize`, `fontWeight`, `italic`, `underline`, `highlight`, `backgroundOpacity`, `overflowMode`, `hideShapeWhenUnselected`, `maxWidth`, `maxHeight`. (FR-001..FR-012, FR-017, FR-025) [Code]
5. [X] Add migration / defaulting logic where nodes are loaded (ensure existing notes get defaults). (FR-012) [Code]
6. [X] Update serialization order tests (add new fields with deterministic ordering). (FR-012, FR-015) [Test]
7. [X] Persistence schema JSON update + contract test update in `tests/contract/persistence-schema.test.ts` to assert new keys allowed. (FR-012) [Code/Test]

## Font & Formatting Infrastructure

8. [X] Implement OS font detection utility (canvas probe, width signature) with fallback curated list. (FR-001) [Code]
9. [X] Add formatting defaults constant (baseline + reset values) in `src/lib/formatting.ts`. (FR-018) [Code]
10. Create contrast evaluator + warning helper (WCAG ratio approximate w/ opacity blending). (FR-017, FR-022) [Code]

## UI Components & Panels

11. [X] Add Note Formatting Panel (`src/components/panels/NoteFormatPanel.tsx`) with grouped controls: Font, Size, Style (bold/italic/highlight), Opacity, Overflow, Hide Shape, Reset. (FR-001..FR-010, FR-017, FR-018, FR-022) [Code]
12. Add Inline Toolbar (shows on note selection near node) minimal subset: Bold, Italic, Font Size quick inc/dec, Reset. (FR-016, FR-018, FR-019) [Code]
13. Integrate formatting state binding: selecting a note loads current formatting into panel; edits push changes live + undo entry grouping. (FR-016, FR-023) [Code]

## Note Rendering & Behavior

14. [X] Update Note node component to apply dynamic styles for formatting (font family/size/weight/style, highlight). (FR-001..FR-005, FR-016) [Code]
15. [X] Implement background color opacity layering + hide shape state (FR-005, FR-017) [Code]
16. [X] Hide Shape When Unselected behavior (FR-010, FR-011, FR-020) [Code]
17. [~] Partial overflow modes implemented: truncate fade overlay + scroll container; auto-resize vertical logic basic (needs fallback decision logic). (FR-006..FR-009, FR-014) [Code]
18. Add width/height resize interplay: user manual resize overrides auto-resize width; vertical auto-resize only. (FR-025 deferred scope note) [Code]
19. Implement overflow mode switching semantics (preserve original text, adjust container only). (FR-007, FR-015) [Code]

## Undo/Redo & State Integration

20. Add undo entries for each formatting change (batch continuous slider/spinner changes). (FR-023) [Code]
21. Add reset formatting action (reapply defaults & single undo step). (FR-018, FR-023) [Code]
22. Keyboard shortcuts: Ctrl/Cmd+B, Ctrl/Cmd+I scoped to focused note editing. (FR-019) [Code]

## Validation & Warnings

23. Contrast warning UI (icon + tooltip) when ratio < 3:1. (FR-017) [Code]
24. Invisible risk confirmation dialog (opacity <=5% AND hide shape). (FR-022) [Code]
25. Prevent selecting opacity <5% when hide-shape toggled ON (or require confirm). (FR-022) [Code]

## Testing (Unit / Integration / Contract)

26. Unit tests: formatting defaults, migration ensuring missing fields injected. (FR-012, FR-018) [Test]
27. Unit tests: overflow mode logic (truncate indicator presence, auto-resize limit, scroll enabling). (FR-006..FR-009, FR-014) [Test]
28. Unit tests: contrast computation given color + opacity blending. (FR-017) [Test]
29. Undo/redo tests for formatting stack coherence (grouped operations). (FR-023) [Test]
30. Integration test: user changes font + size + color persists across reload. (FR-001..FR-005, FR-012) [Test]
31. Integration test: truncate scenario (enter > capacity) shows fade/ellipsis; switching to scroll shows scroll. (FR-006..FR-009) [Test]
32. Integration test: hide shape when unselected reappears on selection + still selectable via text. (FR-010..FR-011, FR-020) [Test]
33. Integration test: auto-resize growth until cap then fallback behavior engages. (FR-008) [Test]
34. Integration test: reset formatting restores baseline. (FR-018) [Test]
35. Integration test: invisible risk confirmation blocks accidental vanish. (FR-022) [Test]
36. Performance test (script/manual harness): apply 100 formatting ops across 50 notes, assert <50ms P95 per op (log instrumentation). (FR-021) [Test]

## Performance & Metrics

37. Add lightweight instrumentation hooks around formatting apply + overflow recalculation (report to `metrics.ts`). (FR-021) [Code]
38. Document performance measurement steps in quickstart / perf section. (FR-021) [Doc]

## Accessibility

39. Ensure toolbar controls have aria-labels + keyboard navigation order (tab cycle). (A11y) [Code]
40. Ensure hidden-shape mode still has accessible focus outline or textual label. (FR-020) [Code]
41. Accessibility integration test: keyboard-only formatting change (Bold) works. (FR-019, FR-020) [Test]

## Documentation & Developer Experience

42. Update `quickstart.md` with new formatting workflow + reset + overflow explanation. (FR-016..FR-018) [Doc]
43. Add README section (or docs page) describing Note formatting features & limits. [Doc]
44. Update agent context file via provided script after model-affecting additions (post major steps 4, 14, 17). [Refactor]

## Finalization

45. Full regression pass: run existing integration + contract tests ensure no breakage to thought/rect flows. (FR-024) [Test]
46. Prepare release notes entry summarizing new capabilities + migration safety. [Doc]
47. Merge readiness checklist: schema version bump (if used), test coverage spot check, performance threshold logs captured. [Doc]

## Parallelization Notes
- Safe to parallel: 8, 9, 10 after 4 scaffold; 26–28 after 5; 30–35 after corresponding feature tasks (14–19) land.
- Avoid parallel conflicts: 4 & 5 (types + migration) must precede dependent tasks; 17 must precede tests referencing overflow behaviors.

## Risk Register (Inline)
- Font detection variability across browsers → fallback list ensures resilience.
- Performance risk with auto-resize recalculation → throttle measurement & micro-batch style updates.
- Hidden shape + near-zero opacity risk → confirmation & safeguards tasks (24–25).
- Undo explosion (too many steps) → batch logic required (task 20).

## Acceptance Mapping
| FR | Core Implementing Tasks |
|----|-------------------------|
| FR-001 | 4, 8, 11, 14 |
| FR-002 | 4, 11, 12, 14 |
| FR-003 | 11, 12, 14, 22 |
| FR-004 | 4, 11, 14, 30 |
| FR-005 | 4, 15, 23, 24, 25 |
| FR-006 | 17, 27, 31 |
| FR-007 | 17, 27, 31 |
| FR-008 | 17, 33 |
| FR-009 | 17, 27, 31 |
| FR-010 | 16, 32 |
| FR-011 | 16, 32 |
| FR-012 | 4, 5, 6, 7, 26, 30 |
| FR-013 | (Handled via existing min size logic + 17) |
| FR-014 | 17, 27, 31 |
| FR-015 | 17, 19, 30 |
| FR-016 | 11, 12, 14, 30 |
| FR-017 | 10, 14, 23, 28 |
| FR-018 | 9, 21, 34 |
| FR-019 | 12, 22, 41 |
| FR-020 | 16, 32, 40 |
| FR-021 | 37, 36, 38 |
| FR-022 | 10, 23, 24, 25, 35 |
| FR-023 | 20, 29 |
| FR-024 | 45 |
| FR-025 | 18 (deferred horizontal scope) |

## Completion Criteria
- All tasks 1–47 complete or explicitly deferred with justification
- All FRs mapped with status PASS
- Performance instrumentation shows P95 < 50ms formatting apply
- No regression in existing node creation/edit/delete flows
- Contract & persistence tests green

---
Generated 2025-10-01.
