# Implementation Plan: Multi-Select Bounding Box (Feature 006)

Feature Spec Reference: `specs/006-description-the-user/spec.md`
Status: Draft
Owner: TBD

## 1. Goals & Scope
Enable users to select multiple nodes via a drag (marquee) selection rectangle, modify the selection additively, and move selected nodes as a group while preserving relative layout. Provide robust, performant behavior for up to a mid-sized graph (target baseline: 200 nodes) and lay groundwork for later enhancements (keyboard, touch, alignment tools).

In-Scope (this increment):
- Pointer-based marquee selection (mouse / trackpad)
- Overlap-based inclusion rule (ANY intersection selects a node)
- Single active marquee gesture at a time
- Additive selection (Shift + marquee adds intersecting nodes)
- Toggle selection via Ctrl/Cmd + click on a node
- Group drag behavior
- Escape clears selection
- Click on empty canvas clears selection
- 8px drag threshold disambiguation
- Internal event publishing when selection set changes

Deferred (explicitly not in this increment unless requested):
- Touch marquee gesture
- Keyboard-driven multi-select extension
- Persisted selection between sessions
- Alignment / bulk formatting tools
- Lasso (freeform) selection
- Rubber-band preview during panning/zooming animations

## 2. High-Level Architecture Changes
| Aspect | Change |
|--------|--------|
| State Layer | Introduce `selectedNodeIds: Set<string>` (or array) + `selectionMode: 'none' | 'single' | 'multi'` + ephemeral `marquee` state (`startX,startY,currentX,currentY,active`). |
| Events | Emit `selection:changed` with `{ added: string[], removed: string[], current: string[] }`. |
| Rendering | Add overlay component in `GraphCanvas` (or sibling) to draw marquee rectangle (absolute SVG / div). |
| Interaction | Pointer listeners on canvas root (not on nodes) to manage gesture lifecycles respecting threshold & start constraints. |
| Movement | Modify drag logic: when a selected node begins a drag, compute offsets for all selected nodes and apply delta during pointer move; commit at end. |
| Undo/Redo | Node reposition via group drag funnels through existing per-node position persistence & undo stacking (batch strategy). |

## 3. Detailed Work Breakdown

### 3.1 State Additions (FR-001, FR-003, FR-004, FR-005)
- Extend graph store:
  - `selectedNodeIds: string[]` (ordered insertion) or `Set<string>` (convert to array for React Flow).
  - Helper selectors: `isSelected(id)`, `multiSelectedCount`.
  - Mutators: `replaceSelection(ids)`, `addToSelection(ids)`, `toggleSelection(id)`, `clearSelection()`.
  - Ephemeral `marquee` object: `{ active: boolean; start: {x:number,y:number}; current:{x:number,y:number}; additive:boolean }`.
- Ensure existing single-node selection APIs (`selectNode`) are harmonized with new multi-select semantics (single selection becomes `selectedNodeIds=[id]`).

### 3.2 Gesture Handling (FR-001, FR-010, FR-014)
- PointerDown on canvas background only: record start coordinates & set `marquee.active=false (pending)`.
- During PointerMove: if distance > 8px AND still over canvas (no node initial target) → activate marquee.
- If pointer down started on node → skip marquee logic (preserve existing drag semantics).
- Support Shift key flag at gesture start to set `additive=true`.

### 3.3 Marquee Rectangle Rendering (FR-002)
- On `marquee.active`, render overlay:
  - Style: semi-transparent fill (e.g., rgba(255,255,0,0.08)) + dashed border (tokenizable) or according to design.
  - Coordinates transformed using screen → flow position captured at start & current.
- Z-index above edges but below transient UI panels.

### 3.4 Selection Resolution (FR-003, FR-004)
- On PointerUp (marquee active):
  - Compute normalized bounds.
  - Iterate visible nodes (positions & dimensions) → check overlap (bounding-box intersection).
  - Build `hitIds`.
  - If additive: NewSet = old ∪ hitIds.
  - Else: NewSet = hitIds.
  - Emit selection change event diffing old vs new.
  - Deactivate marquee.

### 3.5 Additive & Toggle Mechanics (FR-004)
- Additive marquee: Shift key during marquee start.
- Toggle: Ctrl/Cmd + click on node:
  - If node in set → remove, else add.
  - Prevent node drag on pure toggle click (threshold check). If movement threshold exceeded, treat as drag (no toggle).

### 3.6 Group Movement (FR-005, FR-006, FR-007)
- When drag begins on a node and multiple nodes are selected:
  - Capture initial positions map for selected nodes.
  - Use the dragged node’s delta each move to apply to all others (not incremental stacking—use origin + delta for stability).
  - Visual updates ephemeral; commit final positions on drag end (batch persistence):
    - Option A: call existing `moveNode` for each (push multiple undo entries) → simple but noisy.
    - Option B: introduce `moveNodesBatch([{id,x,y}...])` that creates a single undo entry (Recommended). [If out-of-scope, fallback to Option A].

### 3.7 Escape & Clear (FR-008, FR-013)
- Escape key: calls `clearSelection()` if multi/single selection active.
- Click on canvas with no drag: clear selection (if not additive marquee start).

### 3.8 Eventing (FR-019)
- Implement `emitSelectionChanged(oldIds, newIds)` with diff calculation.
- Consumers (future features) can subscribe without coupling to store internals.

### 3.9 Performance (FR-016)
- Node overlap check O(N). For N ≤ 200 typical, fine.
- Micro-optimizations prepared (but not implemented unless needed):
  - Precompute node bounding boxes into a flat array of structs.
  - Early reject using marquee min/max bounds.
- Frame budget: Ensure resolution + render under ~8ms on mid hardware.
- Add light instrumentation (optional console.time in dev build) behind a debug flag.

### 3.10 Accessibility (Deferred / Partial)
- Announce selection count change via optional ARIA live region (deferred unless prioritized).

### 3.11 Testing Strategy
| Area | Test Type | Cases |
|------|-----------|-------|
| Threshold | Unit | <8px drag does not select; ≥8px activates marquee |
| Overlap Rule | Unit | Partial overlap includes node; boundary inclusion works |
| Additive | Integration | Shift+second marquee adds to first selection |
| Toggle | Integration | Ctrl+Click toggles membership; no drag triggered |
| Group Move | Integration | All selected nodes move; relative offsets preserved |
| Clear | Integration | Click empty canvas clears; Escape clears |
| Event Diff | Unit | Added/removed arrays accurate |
| Replace vs Add | Integration | Plain marquee replaces; Shift marquee adds |

### 3.12 Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Drag threshold too small | Accidental selections | Adjustable constant; add test |
| Performance degrade >200 nodes | Jank | Optional spatial index later |
| Conflicts with existing node drag handlers | Broken UX | Strict start-on-empty rule |
| Toggle misinterprets as drag | Node unintended move | Apply movement threshold before node drag starts |
| Undo flood on group move | History pollution | Batch operation (if feasible) |

### 3.13 Metrics / Success Criteria
- Selecting 150 nodes via marquee completes in <1 frame drop (no perceptible lag).
- Group move with 150 nodes keeps < 16ms average frame during drag (subjective dev profiling).
- Zero unexpected selection when user clicks and moves <8px.

### 3.14 Rollout & Fallback
- Feature flag (optional) `enableMultiSelect` (default ON once stable).
- If severe issues, fallback to single-selection by disabling gesture binding.

### 3.15 Follow-Up Enhancements (Not in Scope Now)
- Touch multi-finger drag marquee.
- Keyboard shift + arrows extension.
- Lasso/freeform selection.
- Bulk alignment toolbar integration.
- Persist selection across reload when auto-load map is enabled.

## 4. Data Model Impact
No persistence changes; selection + marquee states remain transient. No schema migrations.

## 5. Estimated Sequence
1. State layer additions (store) + events.
2. Canvas pointer gesture + threshold + marquee rendering.
3. Overlap selection resolution + additive logic.
4. Toggle node selection (Ctrl/Cmd-click).
5. Group movement batching.
6. Escape / clear integration.
7. Tests (unit + integration) & performance spot-check.
8. Polish (visual style tokens, docs comment).

## 6. Open Items Still Pending Clarification
(Remaining from spec; not blocked for initial implementation unless prioritized)
- Visual differentiation for multi vs single (FR-011 nuance) – default: same highlight.
- Performance explicit numeric target (FR-016) – using heuristic goals above.
- Editing precedence interplay (multi-select vs in-node edit) – propose: editing cancels marquee start if active.
- Keyboard multi-select & touch – deferred.

## 7. Acceptance Checklist Mapping
| FR | Plan Section | Notes |
|----|--------------|-------|
| FR-001 | 3.2 | Start conditions |
| FR-002 | 3.3 | Rendering |
| FR-003 | 3.4 | Overlap rule |
| FR-004 | 3.5 | Additive & replace |
| FR-005 | 3.6 | Group drag |
| FR-006 | 3.6 | Relative preservation |
| FR-007 | 3.6 | Commit logic |
| FR-008 | 3.7 | Clear on click |
| FR-009 | 3.2 | Start constraint |
| FR-010 | 3.2 | 8px threshold |
| FR-011 | 3.3 / 6 | Visual style optional |
| FR-012 | 3.2/3.6 | State unaffected by pan/zoom |
| FR-013 | 3.7 | Escape |
| FR-014 | 3.2 | No start on node |
| FR-015 | 3.4/3.6 | Heterogeneous types |
| FR-016 | 3.9 | Performance approach |
| FR-017 | 3.6 / 6 | Editing interplay (pending) |
| FR-018 | 1 / store init | Clear on graph change |
| FR-019 | 3.8 | Event |
| FR-020 | Deferred | Not included this pass |

## 8. Go / No-Go Criteria
- All FRs except deferred FR-020 implemented & test-covered.
- No regression in single-node selection or node editing.
- Performance heuristic satisfied during manual test.

---
Prepared for implementation. Provide approval or request adjustments, and we can proceed to task ticket creation or direct coding.
