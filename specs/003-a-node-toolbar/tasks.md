# Tasks: Node Toolbar & Additional Node Types

**Spec**: `/specs/003-a-node-toolbar/spec.md`  
**Plan**: `/specs/003-a-node-toolbar/plan.md`  
**Branch**: `003-a-node-toolbar`  
**Scope**: Implement FR-001..FR-046 introducing toolbar, note & rectangle nodes, colors, z-order, distance-based placement, rectangle resizing (min 40x40, persisted, undoable), and full Undo/Redo integration.

> TDD RULE: All Contract, Unit, and Integration test tasks in the "Tests First" phases MUST be authored (and initially failing) before corresponding implementation tasks begin.

---
## Phase P0: Prep / Inventory
- [ ] N000 Audit current node persistence schema & confirm adding optional fields (`nodeKind`, `bgColor`, `textColor`, `frontFlag`) is backward compatible (or note migration need).
- [ ] N001 Define constant sizes & placement metrics: `NOTE_W`, `NOTE_H`, `RECT_W`, `RECT_H`, `PLACEMENT_MIN_EDGE_GAP = 50` (document rationale in code comment referencing FR-006/FR-007).
- [ ] N002 Identify existing selection & double-click edit flows for thought nodes to reuse for note nodes (list function / component entry points).
- [ ] N003 Inventory UndoEntry.type union; reserve new types: `create-note`, `create-rect`, `update-node-color`, `update-node-zorder`.

## Phase P1: Contract & Schema Tests (Author First, Expect Fail)
### Event Contract Tests
- [ ] N010 Event: `toolbar:toolActivated { tool }` fires with correct tool id (FR-001, FR-002, FR-028).
- [ ] N011 Event: `toolbar:toolDeactivated { tool }` fires on toggle off (FR-005).
- [ ] N012 Event: `node:colorChanged { nodeId, bgColor?, textColor? }` fires only when at least one value actually changes (no-op avoidance) (FR-012–FR-015, FR-033).
- [ ] N013 Event: `node:zOrderChanged { nodeId, frontFlag }` (FR-017–FR-020, FR-034).
- [ ] N014 (Optional) Event: `node:resized { nodeId, width, height, prevWidth, prevHeight }` fires only when size actually changes (FR-041–FR-045).

### Persistence / Schema Contract
- [ ] N020 Persistence schema updated (or dynamic) to include fields (`nodeKind`, `bgColor`, `textColor`, `frontFlag`) (FR-014, FR-029, FR-034).
- [ ] N021 Reload test fixture ensures toolbar nodes persist & undo history cleared (FR-029).
- [ ] N022 Rectangle size persistence: width & height fields persisted & restored (FR-043).

## Phase P2: Unit Tests (Author First, Expect Fail)
- [ ] N030 Distance util: reject when edge gap <50; accept at exactly 50 & >50 (FR-006, FR-023). Include multiple geometric placements (diagonal, horizontal, vertical).
- [ ] N031 Placement rule: overlapping bounding boxes at same coordinates rejected (FR-036).
- [ ] N032 Color change no-op: applying identical bg & text colors produces no undo entry & no event (FR-015, FR-039).
- [ ] N033 Z-order no-op: toggling to current tier yields no undo entry/event (FR-019, FR-038).
- [ ] N034 Undo entry creation types: creating note / rect produce `create-note` / `create-rect` respectively (FR-009, FR-016).
- [ ] N035 Undo entry for color change: single entry capturing prev/new diff (FR-015, FR-039).
- [ ] N036 Undo entry for z-order change: single entry capturing frontFlag flip (FR-019, FR-038).
- [ ] N037 Selection stability: undo/redo of color & z-order retains selection (FR-038, FR-039).
- [ ] N038 Multi-line text note: editing & committing (Enter) creates exactly one undo entry if content changed (FR-010, FR-015 consistency rule reuse).
- [ ] N039 Tool exclusivity race: rapid activation calls (simulate) ends with last tool active (FR-002, FR-028, FR-040).
- [ ] N040 Active tool persistence: after placement tool remains active (FR-008, FR-035).
- [ ] N041 Placement while editing another node commits edit first then places (FR-010, FR-035).
- [ ] N042 Deletion of toolbar node integrates with existing deletion undo entries (FR-026).
- [ ] N043 Rectangle resize min constraint clamps sizes to ≥40x40 (FR-042).
- [ ] N044 Rectangle resize undo entry: exactly one entry per completed gesture (FR-044).
- [ ] N045 Rectangle resize undo/redo preserves selection (FR-045).
- [ ] N046 Rectangle resize no-op (no dimension delta) produces no undo entry or resize event (FR-044).

## Phase P3: Integration Tests (Author First, Expect Fail)
Map to Acceptance Scenarios (#1–#15):
- [ ] N050 Scenario 1 Toolbar visibility & single selection (FR-001, FR-002, FR-028).
- [ ] N051 Scenario 2 Toggle off via re-click (FR-005).
- [ ] N052 Scenario 3 Distance constraint accept/reject (FR-006, FR-023).
- [ ] N053 Scenario 4 Rectangle creation defaults (FR-004, FR-008, FR-009, FR-031).
- [ ] N054 Scenario 5 Style editing + undo (FR-012–FR-015, FR-039).
- [ ] N055 Scenario 6 Creation undo/redo (rect) (FR-016, FR-021).
- [ ] N056 Scenario 7 Color change undo/redo (note) (FR-015, FR-039, FR-021).
- [ ] N057 Scenario 8 Z-order toggle + undo (FR-017–FR-020, FR-038, FR-034).
- [ ] N058 Scenario 9 Mixed history integrity (FR-015–FR-021, FR-026).
- [ ] N059 Scenario 10 Escape ignored (no deactivation) (FR-022). (Intent: confirm absence; may be negative test—ensure no event.)
- [ ] N060 Scenario 11 New rectangle auto-selected (FR-009).
- [ ] N061 Scenario 12 Rejected placement leaves no artifacts (FR-023, FR-036).
- [ ] N062 Scenario 13 Persistence reload attributes (FR-014, FR-029, FR-034).
- [ ] N063 Scenario 14 Tool exclusivity (activate one switches off other) (FR-002, FR-028).
- [ ] N064 Scenario 15 Thought node creation unaffected (FR-025, FR-035).
- [ ] N065 Scenario Edge: Editing note while tool active then placement retains active tool (FR-035, FR-010).
- [ ] N066 Scenario Edge: Rapid alternating tool clicks ends with last tool active only (FR-040).
- [ ] N067 Scenario Resize Handles Visibility: With Rectangle tool active & rectangle selected, resize handles appear; deactivated tool hides handles (FR-041).
- [ ] N068 Scenario Resize & Persist: Resize rectangle → size changes visually, persists after reload (FR-041–FR-043).
- [ ] N069 Scenario Resize Undo/Redo: Single undo entry restores previous size; redo reapplies; selection stable (FR-044, FR-045).

## Phase P4: Core Implementation (Execute After Tests Authored Red)
- [ ] N100 Add extended node fields to data model & persistence layer (FR-014, FR-029, FR-034).
- [ ] N101 Implement toolbar state slice (single active tool) + events (FR-001–FR-005, FR-028, FR-040).
- [ ] N102 Toolbar UI component(s) with accessible roles & aria labels (FR-027).
- [ ] N103 Distance util implementation with documented edge-to-edge logic (FR-006, FR-007, FR-023, FR-036).
- [ ] N104 Creation logic for note & rectangle (applies distance rule, sets selection) (FR-003, FR-004, FR-006–FR-009, FR-031).
- [ ] N105 Undo entries wiring: `create-note`, `create-rect` (FR-016, FR-021).
- [ ] N106 Multi-line text editing enablement for notes (reuse existing editor path) (FR-010, FR-035).
- [ ] N107 Rectangle nodes omit editing affordance (FR-011, FR-031).
- [ ] N108 Z-order model: frontFlag + render ordering integration (FR-017–FR-020, FR-034, FR-038).
- [ ] N109 Color editing controls (palette + custom hex) (FR-012–FR-015, FR-033, FR-039).
- [ ] N110 Color change undo entry capturing diff (FR-015, FR-039).
- [ ] N111 Z-order change undo entry capturing old/new flag (FR-019, FR-038).
- [ ] N112 Selection stability logic during undo/redo for new entry types (FR-038, FR-039).
- [ ] N113 Persistence serialization/deserialization of new fields (FR-014, FR-029, FR-034).
- [ ] N114 Maintain tool active after placement (FR-008, FR-035).
- [ ] N115 Ensure thought node creation path unaffected (FR-025, regression guard).
- [ ] N116 Rectangle width/height data model fields + defaults & migration fallback (FR-041, FR-043).
- [ ] N117 RectNode resize handles (conditionally rendered when active tool == 'rect' & selected) (FR-041).
- [ ] N118 Resize gesture logic (pointer events, min constraint, pixel rounding) (FR-041, FR-042).
- [ ] N119 Resize persistence + undo entry (`resize-rect`) + optional event emission (FR-044, FR-043, FR-045).

## Phase P5: Extended Features & Polish
- [ ] N120 Implement color picker / sampler (click sample existing node color) (FR-033).
- [ ] N121 Visual styling distinction (border / shadow tokens) (FR-037).
- [ ] N122 Performance marks around placement & color commit (FR-030, FR-033 instrumentation, FR-013 doc reference).
- [ ] N123 A11y audit & fixes (tab order, roles, names) (FR-027, FR-037).
- [ ] N124 Race-proof tool activation (debounce or last-wins state update) (FR-040).

## Phase P6: Hardening & Performance
- [ ] N130 Stress test rapid placements (>=20) verifying distance & no overlaps (FR-006, FR-036).
- [ ] N131 Stress undo/redo chain mixing existing thought & toolbar nodes (FR-021, FR-026).
- [ ] N132 Measure average placement execution (<16ms subjective check) (FR-030).
- [ ] N133 Ensure no extra re-renders from palette hover (only on commit) (FR-012, perf guard).
- [ ] N134 Memory sanity: creating & deleting 100 notes leaves no retained stale objects (manual profiling note).

## Phase P7: Documentation & Cleanup
- [ ] N140 Update spec Execution Status & mark FRs implemented.
- [ ] N141 Update `persistence-schema.json` & `serialization-contract.md` with new fields & exclusion of undo history (cross-link FR-029).
- [ ] N142 Add developer doc section: "Toolbar & Annotation Nodes" (creation rules, distance formula, undo entry types).
- [ ] N143 Add inline code comments citing FR IDs for critical logic (placement, undo entries, z-order).
- [ ] N144 Remove temporary logs; retain performance marks behind dev flag.
- [ ] N145 Final lint & type check pass.
- [ ] N146 Coverage check: new logic ≥ 85% lines / 90% critical functions (distance util, undo handlers) (quality gate).

## Optional / Backlog
- [ ] N150 Escape key deactivates active tool (future enhancement; FR-022 explicitly deferred).
- [ ] N151 Arbitrary z-index stacking beyond binary (future scope).
- [ ] N152 Rectangle proportional aspect lock / shift-modifier (future enhancement beyond basic resize).
- [ ] N153 Group selection color apply batching.
- [ ] N154 Color change batching (debounced merge) optimization.
- [ ] N155 Multi-select create & aligned placement.

---
## Traceability Matrix (FR ↔ Tasks)
| FR | Tasks |
|----|-------|
| FR-001 | N010, N050, N101, N102 |
| FR-002 | N010, N050, N039, N063, N101, N124 |
| FR-003 | N104 |
| FR-004 | N053, N104 |
| FR-005 | N051, N010 (deactivation event), N101 |
| FR-006 | N030, N052, N103, N104, N130 |
| FR-007 | N001, N103 |
| FR-008 | N053, N104, N114 |
| FR-009 | N053, N104, N060 |
| FR-010 | N038, N041, N106, N065 |
| FR-011 | N107 |
| FR-012 | N032, N054, N109 |
| FR-013 | N054, N109 |
| FR-014 | N020, N062, N100, N113 |
| FR-015 | N032, N054, N055, N035, N109, N110 |
| FR-016 | N034, N055, N105 |
| FR-017 | N057, N108, N111 |
| FR-018 | N057, N108 |
| FR-019 | N033, N057, N111 |
| FR-020 | N057, N108 |
| FR-021 | N055, N056, N062, N105, N110, N111, N131 |
| FR-022 | (Negative) N059 (ensures not implemented) |
| FR-023 | N030, N052, N061, N103 |
| FR-024 | N052 (no active tool branch), N104 (prevents creation), N040 |
| FR-025 | N064, N115 |
| FR-026 | N042, N058, N131 |
| FR-027 | N102, N123 |
| FR-028 | N010, N050, N063, N101, N124 |
| FR-029 | N021, N062, N100, N113, N141 |
| FR-030 | N122, N132 |
| FR-031 | N053, N104, N107 |
| FR-032 | (Covered by existing move undo tests + new node types) N058, N131 |
| FR-033 | N012, N109, N120 |
| FR-034 | N057, N062, N108, N113 |
| FR-035 | N040, N065, N106, N114 |
| FR-036 | N031, N061, N103, N130 |
| FR-037 | N121, N123 |
| FR-038 | N037, N057, N108, N111, N112 |
| FR-039 | N032, N056, N110, N112 |
| FR-040 | N039, N066, N101, N124 |
| FR-041 | N067, N068, N116, N117, N118 |
| FR-042 | N043, N118 |
| FR-043 | N068, N022, N116, N119 |
| FR-044 | N044, N046, N069, N119 |
| FR-045 | N045, N069, N119 |
| FR-046 | (Covered by existing placement rule) N103 (rule unchanged; resize does not retro-adjust) |

## Ordering / Dependencies
1. N010–N066 (all tests) before N100–N115 implementation tasks they cover.
2. Within tests, Unit (N030–N042) can run parallel to Contract (N010–N021); Integration (N050–N066) begins once base utilities (distance, undo type planning) are outlined but still written before implementation.
3. Extended features & polish (N120+) after core implementation is green.
4. Hardening (N130+) after feature complete & passing.
5. Documentation & cleanup (N140+) last.

## Parallelization Guidance
- Distance util & placement tests (N030, N052) can be owned by one dev; color & z-order tests (N032–N036, N057) by another.
- Integration scenarios can be divided by functional area (creation vs styling vs z-order vs persistence).
- Implementation tasks N100–N115 mostly linear due to shared store changes; prefer single PR or tightly coordinated sequence.

## Exit Criteria
- All FRs (FR-001..FR-046) mapped to at least one passing test.
- New node types fully integrated with undo/redo, selection, persistence, rendering tiers, and rectangle resize.
- Rectangle resize: min constraint enforced; single undo entry per gesture; selection stable across undo/redo; size persists across reload.
- Distance rule validated (accept at 50, reject below) and unaffected by resizing (FR-046 behavior preserved).
- No regression in thought node creation or editing flows.
- A11y checks pass (toolbar + nodes + resize handles reachable & labeled if needed; no focus loss on resize undo).
- Performance targets met: creation & resize frame updates remain within animation frame budget (subjective <16ms noticeable threshold).

---
Ready for execution.
