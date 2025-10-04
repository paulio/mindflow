# Feature Specification: Map Library Export & Import

**Feature Branch**: `[008-on-the-map]`  
**Created**: 2025-10-04  
**Status**: Draft  
**Input**: User description: "On the map selection screen, add the ability to export one or more maps. The export should take all the data for the map(s) and package them into a zip file. Similarly add an import mechanism that allows the user to import an exported zip file."

## Execution Flow (main)
1. User opens the Map Library (map selection screen) and can multi-select the desired maps for export.
2. User triggers an export action, confirms the selection, and receives a downloaded ZIP that bundles every selected map's stored data and metadata.
3. User can later return to the Map Library, choose "Import", and provide a previously exported ZIP.
4. System validates the ZIP contents, previews the maps found, and allows the user to confirm import.
5. Upon confirmation, the system ingests each map, resolves any naming or identifier conflicts, and surfaces a success/failure summary.

---

## ⚡ Quick Guidelines
- Export & import must be approachable from the Map Library without opening a map first.
- Preserve user confidence by showing exactly which maps are being exported or imported before committing.
- Prevent data loss: never overwrite existing maps silently and provide clear outcomes for every map in a batch.
- Keep wording non-technical ("Download ZIP", "Upload ZIP") so users understand the action.

---

## Clarifications

### Session 2025-10-04
- Q: When an imported map has the same name as an existing map in the library, how should the system resolve the conflict? → A: Prompt per conflict with options Overwrite, Add (duplicate with suffix), or Cancel entire import.
- Q: When importing maps from another device/account, should the system allow it outright, block it, or require confirmation? → A: Allow imports from any source without extra checks.
- Q: How should the system behave if the ZIP was produced by an older app version whose schema no longer matches current expectations? → A: Attempt automatic migration and continue if it succeeds.
- Q: Do we enforce any limits or prompts when exporting a very large set of maps (e.g., entire library)? → A: Allow any size export but show a progress indicator during the operation.

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a map owner, I want to download a ZIP archive of one or more saved maps from the Map Library and later import that archive (on the same or another device) so I can back up or share my work without opening each map individually.

### Acceptance Scenarios
1. **Given** the user is viewing the Map Library with multiple maps saved, **When** they select two maps and choose "Export", **Then** the system should prepare a ZIP containing complete data for both maps and prompt the user to save it.
2. **Given** the user has a valid ZIP previously exported from the app, **When** they choose "Import" in the Map Library and confirm the maps inside the ZIP, **Then** those maps should appear in the library with their original content and metadata intact.
3. **Given** a ZIP includes a map whose name already exists in the library, **When** the user confirms import, **Then** the system must prompt for each conflict with Overwrite, Add (duplicate with numeric suffix), or Cancel (stop the entire import) before proceeding.
4. **Given** the user attempts to import a malformed or tampered ZIP, **When** validation fails, **Then** the system must stop the import, explain the error, and leave existing maps unchanged.

### Edge Cases
- What happens when the user selects a very large number of maps (e.g., entire library) for export? The system allows the export regardless of size and displays a progress indicator while the ZIP is generated.
- How does the system handle importing a ZIP created with an older version of the app if schemas changed? The system attempts automatic migration to the current schema and proceeds only if the migration succeeds; otherwise the affected maps are reported as failed.
- What feedback is provided if some maps in a batch import succeed while others fail (e.g., due to corruption or conflicts)?
- How is progress or status communicated if export/import takes more than a few seconds?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST provide an export entry point on the Map Library that allows selecting one or more maps in a single action.
- **FR-002**: System MUST generate a ZIP archive that contains every piece of persisted data required to fully recreate each exported map (metadata, nodes, edges, references, themes, viewport, timestamps, etc.).
- **FR-003**: System MUST clearly display which maps are included in the export before the user confirms the download.
- **FR-004**: System MUST provide an import entry point on the Map Library that accepts a ZIP produced by the export feature.
- **FR-005**: System MUST validate the ZIP structure and report any issues before altering the library, including attempting schema migration when the archive was created by an older app version and only proceeding if migration succeeds.
- **FR-006**: System MUST summarize the maps detected in the ZIP and allow the user to confirm or cancel the import before changes are applied.
- **FR-007**: System MUST add imported maps to the library with all original content restored upon successful validation.
- **FR-008**: System MUST prevent silent overwrites of existing maps by prompting the user for each conflict with options to Overwrite (replace existing map), Add (create duplicate with numeric suffix), or Cancel (abort the entire import).
- **FR-009**: System MUST provide user-facing feedback (success, partial success, failure) after export and import operations, including reasons for any skipped maps.
- **FR-010**: System SHOULD log import/export events for later auditing or troubleshooting.
- **FR-011**: System SHOULD support importing archives that contain multiple maps created on another device/account without additional permission checks, assuming the user initiating the import has access to the ZIP.
- **FR-012**: System MUST display a progress indicator during export or import operations when processing may take noticeable time (e.g., large selections or complex migrations).

### Key Entities *(include if feature involves data)*
- **Map Export Bundle**: The ZIP artifact containing one or more serialized maps, associated metadata (creation date, schema version), and any manifest needed to list contents.
- **Map Snapshot**: Represents an individual map within an export/import flow, including its metadata, node/edge/reference data, viewport, and theme selections.
- **Import Session**: Tracks the validation status, conflicts, and outcomes (success/failed/skipped) for each map processed during a single import attempt.

---

## Review & Acceptance Checklist
*GATE: Product review prior to implementation*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous (except where clarification noted)
- [ ] Success criteria are measurable
- [x] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated during spec drafting*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
