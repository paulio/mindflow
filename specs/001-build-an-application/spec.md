# Feature Specification: Interactive Mind-Map Thought Organizer

**Feature Branch**: `001-build-an-application`  
**Created**: 2025-09-29  
**Status**: Draft  
**Input**: User description: "Build an application that can help me organize my thoughts in a mind-map. Each thought (or thought-node) in the mind-map is a node where extended the thought is made by dragging from NSEW handles on a select thought-node to create a new though-node - and so on. The Thought-Node allows the user to enter text that lives in the node. As changes are made the node graph is persisted to a local store that allows the whole graph to be reloaded at a later date. This means there should be a UI to allow for the loading of existing mind-graphs, creating new one, deleting existing ones, etc."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a user brainstorming or structuring ideas, I want to visually create and connect thought nodes on a canvas so I can organize, expand, and revisit my mental model later.

### Acceptance Scenarios
1. **Given** I create a new mind-map, **Then** a default root thought-node (with placeholder text "New Thought") is created automatically at the origin and focused for immediate editing.
2. **Given** a selected node with visible NSEW handles, **When** I drag a handle outward and release, **Then** exactly one new node is created positioned in that direction AND simultaneously an edge linking it to the origin node is created (no moment exists where the node is present without its connecting edge); the new node is focused for text entry and the connection is persisted.
3. **Given** a node not currently being edited, **When** I double‑click its body (not a handle), **Then** it enters text edit mode and the caret appears at the end of its existing text.
4. **Given** a node in text edit mode, **When** I press Enter/Return (without modifiers) OR click anywhere outside the node, **Then** the edit is committed (no newline added), edit mode ends, and the change is scheduled for debounced persistence.
5. **Given** a node in text edit mode, **When** I press Shift+Enter, **Then** a newline character is inserted at the caret position, the node height expands to fit (multi-line), and edit mode continues (no premature commit).
5. **Given** a populated mind-map, **When** I edit the text in an existing node (add/remove characters), **Then** the change is auto‑saved within <500ms (debounced) to local storage.
6. **Given** multiple saved mind-maps stored locally, **When** I open the "Load" dialog and select one, **Then** the full graph (nodes, text, positions, edges, last opened timestamp) loads onto the canvas.
7. **Given** one or more existing mind-maps, **When** I delete one via the management UI and confirm, **Then** it is removed from the list and not available on subsequent reload.
8. **Given** a graph with many nodes, **When** I pan or zoom the canvas, **Then** node positions and edge routes remain visually consistent and no data loss occurs.
9. **Given** a saved map, **When** I refresh the browser/app, **Then** the last opened graph auto-loads automatically without prompting.
10. **Given** a node displayed on the canvas, **When** I single‑click to select it and then drag its body (mouse/touch drag), **Then** the node follows the pointer continuously, all connected edges update their geometry in real time, and on release the new position is persisted.
11. **Given** I am in the Details pane (theme manager visible), **When** I switch the active theme from "Classic" to "Subtle", **Then** all currently rendered nodes (borders, background, handles, text styling, editing textarea) visually update within 1 animation frame (<100ms target) without a page reload.
12. **Given** a selected theme, **When** I reload the application, **Then** the previously selected theme is applied automatically before the canvas first paint (no flash of wrong theme) (global persistence assumption).
13. **Given** I open the Details pane while editing a map, **Then** the Theme Manager appears in a clearly separated section labeled "Global Theme" (or equivalent) visually distinct from graph-specific metadata (name, counts) so users do not assume theme is a per‑graph attribute.
11. **Given** I am viewing the Map Library (map list view) showing previously saved mind-maps, **When** I click a map entry, **Then** I transition to the dedicated Editing Canvas view and that map loads (nodes + edges) with focus state cleared (no node auto-selected unless first-load root edit rules apply).
12. **Given** I am on the Editing Canvas with unsaved (debounced, not yet flushed) changes, **When** I attempt to navigate back to the Map Library, **Then** I am warned about pending unsaved changes and may choose to (a) stay and wait, or (b) discard navigation (future enhancement: force save) before the view actually changes.
13. **Given** I am on the Editing Canvas, **When** I invoke a "Back to Library" control, **Then** the canvas UI is replaced by the Map Library list; no residual nodes or edges remain visible and performance state (pan/zoom) is reset upon returning to the same map later.
14. **Given** I create a new map from the Map Library via a "New Map" action, **Then** the library immediately transitions to the Editing Canvas with the freshly created root node focused (Scenario 1), and the new map appears in the library list only after initial auto-save completes.
15. **Given** a node with visible directional handles (N/S/E/W), **When** I drag the SAME handle outward multiple times sequentially (release each time on empty canvas past threshold), **Then** each drag creates a new distinct child node connected by its own edge to the origin node (fan‑out allowed) with no duplicate edges and with each new node positioned so it does not overlap previously created siblings.
16. **Given** I have just created a new mind-map, **Then** the automatically created first node is designated as the "Root" node (level = 0) and this designation is shown in the Details pane when it is selected.
17. **Given** I create a node from the Root node via a directional handle, **Then** that new node is a level 1 ("Child 1") node and its level is shown in the Details pane when selected.
18. **Given** I create a node from any level N node (N ≥ 1) via a directional handle, **Then** the new node is level N+1 and displays that level in the Details pane (e.g., Child 2, Child 3, etc.).
19. **Given** I select any node, **Then** the Details pane displays a read‑only field or label indicating its hierarchical level (Root, Child 1, Child 2, ...). If the node has no recorded parent (only the Root), it shows Root.
20. **Given** a non-Root node is selected, **Then** a trash‑can delete control appears adjacent to (but not overlapping) the node; **When** I activate (click/tap/press Enter on) the control and confirm (if a confirmation affordance is required), **Then** the node is deleted and each of its direct children (former level N+1) is re‑parented to the deleted node’s parent (now connected directly to level N‑1) without losing their own subtrees.
21. **Given** the Root node is selected, **Then** the trash‑can delete control is shown in a visibly disabled state (ARIA disabled, no pointer activation) and any attempt to activate it is ignored (no deletion occurs).
22. **Given** I delete a node that has multiple children, **Then** all children become siblings under the deleted node’s parent and no duplicate edges are created (existing edges that would become duplicates are not re-added).
23. **Given** I am viewing the Details pane while a map is open on the Editing Canvas, **Then** I see a clearly labeled "Map Actions" (or equivalent) section that includes a "Delete Map" action distinct from per‑node controls.
24. **Given** I activate the "Delete Map" action in the Details pane and confirm, **Then** the current map is removed from persistence, the Editing Canvas closes, and I am returned to the Map Library list with that map no longer present (unless a persistence error occurs, in which case an error message is surfaced and the map remains).
25. **Given** a map is open and the Details pane is visible, **When** I choose "Export Map" → "Export as PNG", **Then** a PNG file download begins containing a rasterized image of the entire current graph (all nodes & edges) using the currently applied theme (visual fidelity). **And** when I choose "Export as Markdown", **Then** a `.md` file download begins containing a hierarchical bullet list representation of the graph rooted at the Root node (level indentation reflects computed levels) including each node’s text exactly once.
26. **Given** I am viewing the Map Actions section in the Details pane for an existing map, **When** I activate the "Clone" action, **Then** a new map is created with identical nodes (text, positions), edges, and viewport as the source (no references shared), assigned a unique name of the form `<OriginalName>Clone<N>` where `N` is the lowest positive integer that yields a unique name (if no conflict, `N` = 1), and the application immediately switches to the cloned map in the Editing Canvas with the same Root node selected (or focused for edit only if original root was being edited at the moment of cloning).

### Edge Cases
- Creating many nodes rapidly (drag spamming) should not produce orphan edges or duplicate node IDs.
- Handle-drag node creation MUST NEVER yield an orphan (unconnected) node; failure to create the connecting edge MUST cancel the node creation (atomic invariant of FR-004).
- Empty node text after creation is replaced by a default placeholder text ("New Thought") until user edits.
- Pressing Enter with no text changes still exits edit mode without altering timestamps beyond existing debounce rules (no-op write avoided if possible).
- Double‑click while already in edit mode is ignored (idempotent).
- Multi-tab editing is out of scope; last-writer-wins conflicts are not handled.
- Large graph performance (>500 nodes) must remain usable; pan/zoom + node drag still responsive (provisional target: avg frame <40ms, p95 <80ms) – refine during performance planning.
- Deleting a mind-map currently open should require confirmation and result in closed canvas state.
 - Navigating away from the Editing Canvas to the Map Library while an edit is in progress should respect unsaved-change warnings (FR-030) same as browser navigation.
 - Rapidly opening and closing maps (Library -> Canvas -> Library) should not retain stale pan/zoom transforms across different maps (each map view starts at its own stored or default viewport).
 - Theme switching should not alter persisted graph structural data (pure presentation concern); only a user setting is updated.
 - Subtle theme MUST still meet minimum accessibility contrast (WCAG AA for node text vs background >= 4.5:1 for normal text) despite reduced prominence.
 - The Theme Manager placement inside the Details pane MUST visually separate global controls (theme) from per‑graph fields using a divider, heading, or grouping label.
 - Repeated creation from the same handle (fan-out) MUST be supported; each drag/release beyond threshold spawns a new node+edge pair (no upper hard limit defined in MVP other than performance). Duplicate edges (same source+target) remain disallowed.
 - Node hierarchy levels: The initial auto-created node is level 0 (Root). Nodes created directly from Root are level 1 (Child 1). Recursively, a node created from level N is level N+1. Display only (does not currently restrict editing or layout). Cycles are not explicitly prevented in MVP; if a cycle is introduced in a future enhancement the lowest discovered path determines display level.
 - Node deletion re-parenting: Deleting a non-Root node promotes all its direct children to connect to that node's parent (maintaining breadth). No child (subtree) data is lost. Root deletion is disallowed.
 - Re-parent operation MUST be atomic: either all new parent-child edges are established and the original node + its original edges are removed, or nothing changes (failure roll-back).
 - Duplicate edge prevention: If a re-parent edge already exists (parent already connected to child), do not create a second edge.
 - Visual affordance: Delete control should not obscure node text or directional handles and should remain within a predictable offset (implementation-defined) so users can reliably target it.
 - Accessibility: Disabled Root delete control MUST expose appropriate disabled semantics (e.g., aria-disabled="true").
 - Large fan-out delete: Re-parenting of a node with many children (e.g., >50) should still operate within acceptable performance (target <100ms) and not degrade autosave behavior.
 - Delete Map (Details pane) should confirm before destruction and must return user to Library view on success.
 - Export PNG should not alter or persist any additional state (read-only render pass) and should include all nodes even if partially off current viewport (graph fit logic applied for export only).
 - Export Markdown must escape Markdown control characters in node text (assumption) to avoid unintended formatting beyond bullet structure.
 - Export actions must not emit structural graph events (no node/edge created/updated/deleted) – optional dedicated export:* events deferred.
 - Clone action creates a deep copy of graph structure (graph metadata + nodes + edges + viewport) with entirely new graph ID and regenerated node & edge IDs (implementation detail) so subsequent edits do not affect the source.
 - Clone naming: Base pattern `<OriginalName>Clone<N>` starting at N=1; increment N until no existing graph has exactly that name (case-sensitive match). Original name unchanged.
 - Cloning a very large map should complete within performance envelope similar to loading that map (<500ms target for 500 nodes) and MUST NOT block the UI thread excessively (future optimization with chunked cloning if needed).

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST allow creation of a new mind-map (graph) with a generated unique graph ID.
- **FR-001a**: Upon new mind-map creation, the system MUST automatically create exactly one initial (root) thought-node at a default position (origin 0,0 or implementation-defined central coordinate) with default placeholder text "New Thought" and focus it for editing.
- **FR-002**: System MUST allow creation of a thought-node at a user-selected position (click or via handle drag from existing node) with auto-generated unique node ID and initial default text "New Thought" until edited.
- **FR-003**: System MUST display directional (N,S,E,W) handles when a node is selected.
- **FR-004**: System MUST allow dragging a directional handle to spawn a new node connected by an edge to the origin node. Node and edge creation MUST be atomic—if the edge cannot be created the node MUST NOT persist (no orphan nodes from handle drags).
- **FR-005**: System MUST allow editing node text inline with immediate visual update.
- **FR-005a**: System MUST enter single-line text edit mode for a node when the user double‑clicks the node body (excluding its handles). Caret SHOULD be placed at end of text.
- **FR-005b**: While in text edit mode, pressing Enter/Return (without Shift/Alt/Ctrl) OR blurring focus MUST commit the edit (no newline inserted) and exit edit mode. Escape SHOULD cancel changes since last commit (optional enhancement—if omitted treat as out of scope).
- **FR-005c**: While in text edit mode, pressing Shift+Enter MUST insert a newline at the caret position and keep the editor active (multi-line support). The node MUST auto-resize vertically to fit its content up to a reasonable max height (implementation-defined; truncation/scrolling approach deferred). Character limit (FR-019) applies across all lines (total length ≤255).
- **FR-006**: System MUST auto-save node and edge changes (create/update/delete) to a local persistence layer within 500ms of stable change (debounced) and guarantee durability after 2s of inactivity; in-progress text composition MUST NOT flush partial states mid-stroke.
- **FR-007**: System MUST persist: graph metadata (id, name, created, lastModified), nodes (id, text, position x,y), edges (source, target), and lastOpened timestamp.
- **FR-008**: System MUST provide UI to list existing saved mind-maps sorted by lastModified descending.
- **FR-009**: System MUST allow loading a selected saved mind-map into the canvas restoring all nodes and edges at prior positions.
- **FR-010**: System MUST allow deleting a selected mind-map after explicit confirmation (2-step: select → confirm delete).
- **FR-011**: System MUST prevent deletion of a mind-map while an in-progress node text edit (unflushed debounce) exists; user MUST either wait for auto-save or cancel edit (force delete not supported in MVP).
- **FR-012**: System MUST visually indicate unsaved changes (e.g., status badge) clearing once persisted.
- **FR-013**: System MUST support panning (click-drag empty canvas) and zooming (wheel / pinch) without altering stored node coordinates (canvas transform only).
- **FR-014**: System MUST ensure node creation via handle places node with non-overlapping minimal offset (configurable spacing constant) relative to origin node.
- **FR-015**: System MUST allow renaming a mind-map (graph title) and persist the new name.
- **FR-016**: System MUST debounce text updates so rapid typing does not trigger more than 2 persistence writes per second per node.
- **FR-017**: System MUST assign deterministic ordering for nodes in serialization to avoid spurious diffs.
- **FR-018**: System MUST handle window refresh by reloading currently open graph state from persistence.
- **FR-019**: System MUST validate node text length (max 255 characters across all lines); reject additional input beyond limit (visual feedback required). Newlines count toward total length (e.g., '\n').
- **FR-020**: System SHOULD prevent creation of a new node if drag distance < 80px from origin node center (treat as cancelled handle drag).
- **FR-021**: (Reserved) Keyboard shortcuts are explicitly out of scope for initial release.
- **FR-022**: System MUST store data locally (e.g., IndexedDB/local file) without requiring authentication; multi-device sync is out of scope.
- **FR-023**: System MUST allow clearing (reset) of current graph (soft delete all nodes) with confirmation.
- **FR-024**: System MUST ensure no orphan edges exist after node deletion (cascade removal of related edges).
- **FR-025**: System MUST allow repositioning a node by single-selecting (one click/tap) and dragging its body; edges MUST update in real time during movement and the final position MUST persist on drag end.
- **FR-026**: System MUST update lastModified timestamp on any structural or textual change.
- **FR-027**: System MUST provide an undo/redo stack (depth 10) covering create, text edit commit, move, delete operations.
- **FR-028**: System MUST provide visual focus / selection state for exactly one node (or none) at a time.
- **FR-029**: System MUST ensure persisted graphs are versioned with schemaVersion starting at 1.
- **FR-030**: System SHOULD warn user before navigating away if unsaved changes pending (if auto-save delay still active).
- **FR-031**: System MUST provide a distinct Map Library view ("map file UI") separate from the Editing Canvas. The Map Library lists existing mind-maps and offers create, select (load), delete, and rename actions; it MUST NOT display the active graph's interactive nodes/edges.
- **FR-032**: System MUST ensure that loading (opening) a map transitions the user from the Map Library view to the Editing Canvas view dedicated to that single map. While in the Editing Canvas, library list elements (except a single navigation control) MUST be hidden to reduce distraction.
- **FR-033**: System MUST allow returning from the Editing Canvas to the Map Library via an explicit navigation control. Attempting this while unsaved debounced edits exist MUST trigger the unsaved changes warning (FR-030) prior to leaving.
- **FR-034**: Map management actions (create, delete, rename) initiated in the Map Library MUST NOT mutate the currently open canvas state unless the user explicitly loads the affected map (e.g., deleting a different map leaves current canvas unchanged).
- **FR-035**: Each time a map is (re)opened into the Editing Canvas, the viewport (pan/zoom) SHOULD restore to the last persisted viewport for that map (if stored) or default to a centered origin; switching between maps MUST NOT leak viewport state between them.
- **FR-036**: System MUST provide a Theme Manager control accessible from the existing Details pane allowing the user to choose among available UI themes.
- **FR-037**: System MUST define a themes configuration with at least two built-in themes: "classic" (current default styling) and "subtle". Each theme defines: node background color, node border color & width, node text color, handle colors (source/target), selection outline style, and editor (textarea) background/text styles.
- **FR-038**: The "subtle" theme MUST use thinner visual chrome (e.g., 1px borders vs thicker/outlined accents) and subdued, lower-saturation colors while maintaining required accessibility contrast (node text contrast >=4.5:1). Handle colors MAY be less saturated but must remain distinct for source vs target.
- **FR-039**: Theme selection MUST persist globally (applies to all maps) across sessions; the active theme MUST load prior to initial canvas render to avoid a flash of incorrect theme (FOIT/FOUT equivalent). Persistence stored in user settings (not per graph) to avoid duplication.
- **FR-040**: Switching the active theme MUST immediately re-render all nodes and the edit textarea without requiring reload; existing graph data MUST remain unchanged (presentation only). Theme change MUST emit a `theme:changed` event including previousTheme and newTheme.
- **FR-040a**: The Theme Manager UI MUST visually denote its scope as global (e.g., heading "Global Theme" or badge) and MUST NOT appear intermingled inline with graph metadata fields without a separator.
- **FR-041**: System MUST allow repeated directional handle drags from the same origin node handle to create multiple distinct connected nodes (fan-out). Each invocation MUST produce exactly one new node+edge pair (subject to distance threshold FR-020). Node placement algorithm MUST avoid direct overlap with existing nodes (nudge or offset strategy). Duplicate edge prevention rules (no two identical source-target pairs) still apply.
- **FR-042**: System MUST assign and display a hierarchical level for each node in the Details pane: Root (level 0) for the initial node, Child 1 for any node created from Root, and Child N for any node created from a Child (N-1) node. Level computation MAY be derived at runtime using the creation lineage (parent reference captured implicitly by creation edge). Persistence of level is optional (may be recomputed on load). Display is read-only.
- **FR-043**: System MUST allow deletion of any non-Root node via a contextual trash‑can control shown only when that node is selected. Upon deletion, all direct children of the deleted node MUST be re‑parented to the deleted node’s parent (their new source) preserving their own children (transitive subtree unchanged) and preventing data loss.
- **FR-043a**: Root node deletion MUST be disallowed. The UI MUST display a disabled trash‑can control when Root is selected to communicate the action is not permitted.
- **FR-043b**: Re-parenting during deletion MUST avoid creating duplicate edges (same source + target). If an edge would duplicate one already existing, it is skipped. Operation MUST be atomic: if any new required edge cannot be created, the deletion aborts and original structure remains.
- **FR-043c**: Re-parent delete operation MUST emit node:deleted events for the removed node followed by edge:created events (only for newly added edges) in a deterministic order (stable sort by child node id ascending) to support predictable undo/redo ordering.
- **FR-044**: System MUST provide a "Map Actions" section within the Details pane (visible on the Editing Canvas) containing a Delete Map control that, upon confirmed activation, deletes the currently open map and returns the user to the Map Library view (cannot leave user on an empty canvas).
- **FR-045**: System MUST provide an Export Map control within the Details pane offering at least two sub-options: Export as PNG and Export as Markdown.
- **FR-045a**: Export as PNG MUST generate a downloadable PNG image representing the full current graph (all nodes & edges) using the active theme styling; export MUST NOT mutate graph data or change viewport.
- **FR-045b**: Export as Markdown MUST generate a `.md` file containing a hierarchical bullet list: Root as top-level line, each subsequent level indented by two spaces per level (implementation-defined but consistent). Each node appears exactly once; multi-line node text MAY be flattened (newlines replaced with spaces) for bullet output. Special Markdown characters in node text (e.g., `* _ #`) SHOULD be escaped to preserve literal text.
- **FR-046**: System MUST provide a Clone Map action in the Details pane Map Actions section that creates a new map duplicating the current map's nodes (text, position), edges, and viewport without modifying the source.
- **FR-046a**: The cloned map MUST receive a unique graph name following `<OriginalName>Clone<N>` where N is the smallest positive integer producing a unique name among existing maps (e.g., first clone: `IdeasClone1`; if `IdeasClone1` exists, next is `IdeasClone2`).
- **FR-046b**: After cloning, the system MUST automatically load the cloned map into the Editing Canvas (replacing the previous view) and update the Map Library list to include it (ordered per existing sorting rules). Undo/redo history does NOT transfer (starts empty) but node hierarchy semantics remain identical due to structural duplication.

Assumptions incorporated from clarifications; remaining open items limited to performance metric formalization and future shortcut design.

Technology Decision (Pre-Planning): Use React + ReactFlow for node graph rendering & interactions (provides built-in pan/zoom, edge
management, node selection). Vite remains build tool. Keep additional libraries minimal (state via React hooks, optional lightweight
zustand/backlog; no global state lib in MVP unless complexity demands). This decision informs data model (node/edge structures will
mirror ReactFlow schema for easier serialization).

### Key Entities *(include if feature involves data)*
- **Graph**: Represents a single mind-map. Attributes: id (string/uuid), name (string), created (timestamp), lastModified (timestamp), lastOpened (timestamp), schemaVersion (int), settings (e.g., autoLoadLast:boolean?). Relationships: has many Nodes, has many Edges (derivable from node pairs).
- **Node**: Represents a thought. Attributes: id, graphId, text, positionX, positionY, created, lastModified. Relationships: edges (indirect), may have parent conceptually (origin of creation) but stored implicitly through edges.
- **Edge**: Connection between two nodes. Attributes: id (optional or derived), graphId, sourceNodeId, targetNodeId, created. Direction: UNDIRECTED in MVP (see Edge Direction Decision).
- **UndoEntry** (logical, not persisted): actionType, payload, timestamp. History depth enforced at 10; FIFO discard beyond depth.

#### Edge Direction Decision
Edges are UNDIRECTED for MVP to minimize cognitive load and visual clutter. Value proposition centers on associative brainstorming rather
than hierarchical flow ordering. Future enhancement path: add a direction flag + arrow rendering; existing undirected edges migrate by
interpreting them as bidirectional. Avoids early complexity (arrowheads, reversal UI, export semantics) and keeps initial mental model simple.

#### Remaining Clarifications (Deferred to Planning)
- Formal performance benchmarks (frame timing instrumentation methodology) to be codified before implementation tasks.
- Potential future enhancements: keyboard shortcuts, directed edges toggle, multi-device sync.
 - Theme scoping rationale: Chosen as global (user-level) for MVP (FR-039). Per-graph theme override deferred; would require additional field on Graph entity and conflicts with consistent mental model across maps.
   - Details pane integration rationale: Consolidates secondary controls; visual separation (FR-040a) mitigates ambiguity about scope.
      - Fan-out rationale (FR-041): Brainstorming often needs multiple parallel child thoughts from a single idea; requiring re-selection or alternative gestures would add friction. Sequential handle drags provide a consistent mental model and leverage existing gesture.
         - Hierarchy display rationale (FR-042): Communicates structural depth during ideation without enforcing a strict tree model; enhances orientation in large maps while keeping underlying edge model undirected for MVP.
         - Node re-parent deletion rationale (FR-043…): Enables iterative refinement without structural data loss—users can collapse intermediate nodes while preserving downstream thought branches, reducing the need for manual reconnecting.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs) (Minor implementation hints present only for clarity - confirm acceptable)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (will remain until product decisions made)
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
