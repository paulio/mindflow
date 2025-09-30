# Feature Specification: Graph Editor Undo & Redo System

**Feature Branch**: `002-the-graph-editor`  
**Created**: 2025-09-30  
**Status**: Draft  
**Input**: User description: "The graph editor should have an undo system. It currently should have Undo and Redo buttons. These should record changes to the nodes. Changes include creating and deleting nodes, changing node text, changing the position of a node."

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a user exploring and refining ideas in a graph, I want to safely experiment (add, remove, edit, move nodes) and quickly revert mistakes or reapply reverted changes so I can iterate without fear of losing a prior state I preferred.

### Acceptance Scenarios
1. Node Creation Revert: **Given** a graph with N nodes, **When** I create a new node and then activate Undo, **Then** the newly created node is removed and the graph returns to exactly its prior visible state (node count N, no orphaned edges) and Redo becomes available.
2. Redo After Creation Undo: **Given** I have just undone a node creation, **When** I activate Redo, **Then** the node reappears with the same text (if any), position, and relationships it originally had.
3. Node Deletion Reversal (with children re-parented earlier): **Given** I deleted a non-root node that caused its children to be re-parented, **When** I activate Undo, **Then** the deleted node returns with its original text, position, and original child relationships are restored; the interim re-parenting edges introduced by the deletion are removed.
4. Text Edit Undo: **Given** a node had text "Alpha", **When** I change its text to "Beta" and commit the change, then activate Undo, **Then** the node text returns to "Alpha" without altering unrelated state.
5. Position Move Undo: **Given** a node at position P1, **When** I drag it to position P2 and release (commit), then activate Undo, **Then** it returns to P1.
6. Sequential Mixed Changes: **Given** I perform a sequence (create node A → edit text of node B → move node C → delete node D), **When** I press Undo 4 times, **Then** each change reverses in strict reverse chronological order restoring the pre-sequence state.
7. Redo Stack Clearing: **Given** I undo two changes (Redo has two steps), **When** I perform a new change, **Then** Redo history clears and Redo becomes disabled.
8. Initial State Boundary: **Given** I have undone all available changes back to the loaded baseline, **When** I attempt another Undo, **Then** nothing changes and Undo is disabled while Redo reflects available forward steps.
9. Multiple Committed Text Edits: **Given** I change a node's text three times (A→B→C→D) committing each, **When** I press Undo twice, **Then** the text shows state "B" (one step per commit; no merge).
10. Single Drag Granularity: **Given** I drag a node from P1 to P2 in one continuous gesture, **When** I release, **Then** exactly one undoable step is recorded for the move.
11. Disabled Controls on Fresh Load: **Given** I load a graph and perform no changes, **Then** both Undo and Redo controls are disabled.
12. Session Reset on Reload: **Given** I perform several changes then reload the application, **When** the graph loads, **Then** the visual graph reflects all persisted changes but Undo and Redo histories are empty.
13. Delete Then Immediate Undo Selection: **Given** I delete a selected node, **When** I undo, **Then** the node reappears but selection/focus is not forcibly reassigned (no automatic focus restore).

### Edge Cases
- Undo / Redo invoked with no history (controls disabled; invocation is a no-op if somehow triggered).
- Attempting to undo creation of the initial root node: not possible (root creation predates session; never recorded).
- Rapid alternating Undo/Redo must maintain consistency (no partial intermediate rendering states).
- Out-of-order dependency conflicts cannot occur because only strict LIFO stack walking is permitted; a parent required for restoration cannot have been removed without that removal being a more recent step.
- One user action at a time; multi-node batch fan-out is not treated as multiple simultaneous writes (future multi-select would be one step).
- History depth fixed at 100; adding the 101st change discards the oldest (base) entry.
- Exports and map cloning are excluded (produce no history entries and do not clear history).
- Text edit abandoned with no change produces no history entry.
- Session reload clears history (graph state persists, history does not).
- Future multi-select (if added) should record one combined history step covering all selected nodes.

---

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST provide an Undo control enabling reversal of the most recent eligible node-related change.
- **FR-002**: The system MUST provide a Redo control enabling reapplication of the most recently undone change when applicable.
- **FR-003**: The system MUST track these change types as discrete undoable steps: node creation, node deletion, committed node text change, committed node position change.
- **FR-004**: The system MUST exclude non-mutating operations (viewing, exporting, cloning, theme switching) from history.
- **FR-005**: Each Undo invocation MUST revert exactly one previously recorded change and expose it to Redo unless a new change occurs.
- **FR-006**: Performing a new eligible change after at least one Undo MUST clear all pending Redo steps.
- **FR-007**: The Undo control MUST be disabled when no undoable changes exist.
- **FR-008**: The Redo control MUST be disabled when no redoable changes exist.
- **FR-009**: Undoing a node creation MUST remove the node and any edges created with it.
- **FR-010**: Redoing a reverted node creation MUST restore the node with original text, position, and relationships.
- **FR-011**: Undoing a node deletion MUST restore the node (text, position) and original parent/child relationships, removing interim re-parenting edges without duplication.
- **FR-012**: Redoing a node deletion MUST remove the node again and reapply child re-parenting with deterministic handle assignment per existing deletion spec.
- **FR-013**: Undoing a text change MUST restore the immediately previous committed text (one step per commit, no merge window).
- **FR-014**: Undoing a position change MUST restore the immediately previous committed position (one step per completed drag gesture).
- **FR-015**: A continuous drag (press→move→release) MUST yield exactly one undo history entry.
- **FR-016**: Sequential committed text edits MUST yield one history entry per commit; abandoned edits with no change yield none.
- **FR-017**: Undo/Redo MUST not alter unrelated nodes or edges.
- **FR-018**: Undo history MUST exclude invalid or rejected operations (e.g., prohibited root deletion, no-op text commit).
- **FR-019**: The undo mechanism MUST operate strictly LIFO; out-of-order restoration and dependency conflicts cannot occur by design.
- **FR-020**: Reverse chronological order MUST be used when multiple undos are invoked consecutively.
- **FR-021**: History MUST begin empty on graph load and MUST NOT persist across page reloads or application restarts.
- **FR-022**: Undoing to the baseline state MUST disable Undo while keeping Redo enabled if forward steps exist.
- **FR-023**: Loading or creating a different graph MUST reset the current history (session scope per graph context only).
- **FR-024**: Controls MUST provide accessible labels and reflect disabled/enabled state for assistive technologies.
- **FR-025**: Each undoable step MUST appear atomic to the user (no partial intermediate visual states).
- **FR-026**: Maximum history depth MUST be 100 entries; pushing a 101st MUST drop the oldest entry silently.
- **FR-027**: Clone operations MUST NOT copy or mutate the originating graph's undo history; cloned graph starts with empty history.
- **FR-028**: Export operations MUST NOT create, modify, or clear history.
- **FR-029**: No keyboard shortcuts for Undo/Redo MUST be active initially (buttons only) to avoid conflicts.
- **FR-030**: Future multi-select (if introduced) MUST record a single combined history step for that multi-node action.

### Key Entities
- **Change (History Entry)**: A record of a single reversible user-intent action on nodes: type (creation, deletion, text change, position change), target node identifier(s), prior observable state summary, resulting observable state summary, timestamp/order index. (Representation details intentionally abstracted.)
- **History**: An ordered stack (conceptually) of Changes representing all applied reversible actions since load or last reset. Contains a pointer defining the current active boundary between performed and redoable changes. (Storage mechanism not specified here.)

### Dependencies & Assumptions
- Existing graph behaviors (creation, deletion with re-parenting, text commit, move commit) are deterministic.
- Export, theme switching, and cloning produce no history entries.
- No keyboard shortcuts initially (future enhancement may introduce standard combos).
- Undo/Redo operations for single-node changes should feel instantaneous (qualitative expectation; no hard latency SLA defined).
- Session-only history: page reload or application restart resets history without altering persisted graph state.
- Graph persistence always reflects the latest applied change set; absence of history on reload does not imply data loss.
- Multi-select not currently implemented; future support will treat a batch as one step.

---

## Review & Acceptance Checklist

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
- [ ] Ambiguities marked
