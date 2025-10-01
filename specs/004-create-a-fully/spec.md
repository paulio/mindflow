# Feature Specification: Rich Note Formatting & Adaptive Note Presentation

**Feature Branch**: `004-create-a-fully`  
**Created**: 2025-10-01  
**Status**: Draft  
**Input**: User description: "Create a fully fledged Note from the existing Note node. The user should be able to have more formatting options for the text (eg. choice if font, size, colour, etc). There should be a choice of how it responds to running out of room, eg. truncate, autoresize, etc. The Note node itself should be able to become much small. The user should be able to turn off the shape, i.e. when not selected only the text is shown. Also the existing background colour should have an opacity option."

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A user working on a mind map wants to use Notes as richer annotation blocks. They can format the note's text (font family, size, color, emphasis) and control how the note behaves when text exceeds its current bounds. They can optionally make the note visually minimal so that only text is shown when it is not selected, reducing visual clutter. They can also adjust the note background color including opacity to improve layering and legibility.

### Acceptance Scenarios
1. **Given** an existing note, **When** the user opens formatting controls, **Then** they can change font family, size, weight/style (bold/italic), text color, and inline emphasis (e.g., highlight) and the changes apply immediately.
2. **Given** a note with more text than fits its defined size and overflow behavior set to Truncate, **When** additional text is entered, **Then** visible content is truncated with a clear affordance (e.g., fade or ellipsis) without resizing the note.
3. **Given** a note with overflow behavior set to Auto-Resize, **When** additional text is entered beyond current size, **Then** the note expands up to a configured max (height and/or width) and then applies overflow handling (scroll or truncate) if still exceeded.
4. **Given** a note configured for "Text Only When Unselected", **When** the note loses selection focus, **Then** its shape (background rectangle/chrome) disappears while formatted text remains positioned unchanged; selecting it again restores the shape.
5. **Given** a note background color chosen with partial opacity, **When** the note is rendered over overlapping elements, **Then** underlying content subtly shows through according to selected opacity level.
6. **Given** a note configured with overflow behavior = Scroll, **When** text exceeds bounds, **Then** a minimal scroll affordance appears allowing the user to scroll through hidden text.
7. **Given** a very small note minimum size requirement, **When** the user resizes it to the minimum, **Then** formatting still applies and overflow handling triggers as defined without layout breakage.
8. **Given** a note with custom formatting, **When** the graph is reloaded, **Then** all formatting choices and behavior settings persist.

### Edge Cases
- What happens when the user selects a font size larger than the note width? → Should trigger overflow handling rules consistently.
- How does the system behave if opacity is set extremely low (near invisible)? → Ensure still selectable (maybe outline on hover/selection). [NEEDS CLARIFICATION: minimum opacity for usability?]
- What if user switches from Auto-Resize (expanded) to Truncate? → Should lock current size and apply truncation without losing text.
- What if user reduces note to extremely small dimensions (approaching icon size)? → Maintain minimum readable/interactive area. [NEEDS CLARIFICATION: minimum width/height constraints] 
- Multiple format changes in rapid succession (performance). Ensure no noticeable lag.
- Switching display mode (shape hidden) while selected/unselected transitions gracefully.

---

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST allow users to modify note text font family from a dynamically built list derived via best‑effort OS font detection (privacy-safe probe using canvas/text metrics) filtered to a curated safe subset; if detection fails/unavailable, fallback list is presented: Inter, Segoe UI (Windows), -apple-system (SF Pro), Roboto, Georgia, JetBrains Mono, Courier New, monospace. Only fonts verified present are selectable; previously chosen but now missing fonts render under an “Unavailable” grouping and remain applied. (Clarification Resolved 2025-10-01)
- **FR-002**: System MUST allow users to set note text font size within a bounded range (e.g., min, max). [NEEDS CLARIFICATION: size range]
- **FR-003**: System MUST allow users to toggle text style attributes (bold, italic, underline, highlight/emphasis).
- **FR-004**: System MUST allow users to change text color using a controlled palette or picker. [NEEDS CLARIFICATION: free color picker vs palette]
- **FR-005**: System MUST allow users to set background fill color and an independent opacity value (e.g., 0–100%). [NEEDS CLARIFICATION: opacity granularity/steps]
- **FR-006**: System MUST provide selectable overflow behaviors: Truncate, Auto-Resize, Scroll.
- **FR-007**: System MUST apply Truncate behavior by visually indicating hidden content (e.g., fade-out gradient or ellipsis) without altering stored text.
- **FR-008**: System MUST apply Auto-Resize behavior by expanding note dimensions until reaching a configured maximum width/height. [NEEDS CLARIFICATION: max dimensions defaults]
- **FR-009**: System MUST apply Scroll behavior by maintaining fixed dimensions and enabling internal vertical scrolling.
- **FR-010**: System MUST allow users to toggle a "Hide shape when unselected" mode; when enabled, unselected notes render only text (no border/background) while preserving layout position.
- **FR-011**: System MUST restore full note visual (shape/background) on selection if hidden mode is enabled.
- **FR-012**: System MUST persist all formatting and behavior settings (font, size, color, opacity, overflow mode, hide-shape mode) with the note.
- **FR-013**: System MUST enforce a minimum note size that maintains selection & interaction usability. [NEEDS CLARIFICATION: numeric min width/height]
- **FR-014**: System MUST allow reducing note size below current content requirements, triggering overflow handling per chosen mode.
- **FR-015**: System MUST preserve original text content regardless of current overflow representation (no data loss on truncate or scroll).
- **FR-016**: System MUST provide immediate visual feedback for formatting changes (no explicit save step required).
- **FR-017**: System SHOULD ensure formatted text remains legible against chosen background & opacity (e.g., warn or auto-adjust contrast). [NEEDS CLARIFICATION: enforce or just warn?]
- **FR-018**: System SHOULD allow resetting formatting to default note style.
- **FR-019**: System SHOULD support keyboard shortcuts for basic formatting (bold, italic). [NEEDS CLARIFICATION: required vs future]
- **FR-020**: System MUST ensure hidden-shape mode still allows note selection via text hit area.
- **FR-021**: System MUST maintain performance so formatting actions apply within an acceptable latency threshold. [NEEDS CLARIFICATION: target latency]
- **FR-022**: System SHOULD prevent incompatible combinations (e.g., background opacity 0% + hide shape might make note invisible). Provide user warning.
- **FR-023**: System MUST handle undo/redo for all formatting and layout changes.
- **FR-024**: System MUST maintain existing note creation/edit flows; new formatting options augment rather than replace current editing.
- **FR-025**: System SHOULD allow optional horizontal auto-resize (adaptive width) setting. [NEEDS CLARIFICATION: whether width auto-resize is in-scope]

### Key Entities
- **Note Formatting Profile**: Encapsulates fontFamily, fontSize, fontWeight/style, textColor, highlight/emphasis flags, backgroundColor, backgroundOpacity, overflowMode, hideShapeWhenUnselected, (optional) maxWidth, maxHeight.
- **Note**: Extends existing note concept with a reference or embedded formatting profile and persisted content text.
- **Overflow Behavior Modes**: Enumerated values with associated rules (truncate indicator style, resize thresholds, scroll container settings).

---

## Clarification Resolutions (Rolling)

| Item | Resolution | Date |
|------|------------|------|
| FR-001 Fonts | Hybrid OS detection + curated fallback list (Inter, Segoe UI, -apple-system, Roboto, Georgia, JetBrains Mono, Courier New, monospace). Show only verified fonts; preserve missing as Unavailable. | 2025-10-01 |
| FR-002 Font Size Range | 10–48px inclusive, step=1; UI presets: 12,14,16,18,20,24,32,40,48. | 2025-10-01 |
| FR-004 Text Color Model | Palette of ~12 semantic swatches + optional advanced picker modal; palette first. | 2025-10-01 |
| FR-005 Opacity Steps | 0,5,10,20..100 (%); effective min 5% when hide-shape active; warn <15%. | 2025-10-01 |
| FR-007 Truncate Indicator | 16px vertical fade gradient + ellipsis only if last line clipped. | 2025-10-01 |
| FR-008 Auto-Resize Max | maxWidth 380px (manual width only), maxHeight 280px (vertical auto-resize ceiling). | 2025-10-01 |
| FR-009 Scroll Affordance | Thin (4-6px) custom scrollbar visible on hover/scroll only; wheel & keys always work. | 2025-10-01 |
| FR-012 Persistence Model | Inline per-note formatting fields (no shared profiles v1). | 2025-10-01 |
| FR-013 Min Size | 48px width × 28px height enforced UI-level (hit target). | 2025-10-01 |
| FR-017 Contrast Policy | Warn-only if ratio <3:1 (approx WCAG) factoring blended bg; no auto adjust. | 2025-10-01 |
| FR-018 Reset Baseline | Inter 14 regular; textColor neutral-900; bg existing default; opacity 100%; overflow=Auto-Resize; hideShape=false. | 2025-10-01 |
| FR-019 Shortcuts Scope | Implement Bold (Ctrl/Cmd+B) & Italic (Ctrl/Cmd+I) only; others deferred. | 2025-10-01 |
| FR-021 Performance Target | <50ms P95 per formatting apply across 50 notes; typing added latency <10ms. | 2025-10-01 |
| FR-022 Invisible Safeguard | Confirmation when (opacity <=5% && hideShape=true); block unless confirmed. | 2025-10-01 |
| FR-023 Undo Granularity | One step per discrete control interaction; continuous slider spin coalesced; manual resize coalesced on mouseup. | 2025-10-01 |
| FR-025 Horizontal Auto-Resize | Deferred (phase 1 vertical only); manual width honored. | 2025-10-01 |

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

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarification resolution)

---
