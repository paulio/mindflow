# Feature Specification: Home Library Map Thumbnails

**Feature Branch**: `009-the-home-library`  
**Created**: 2025-10-04  
**Status**: Draft  
**Input**: User description: "The home/library page should show thumbnails of the last known image of any map listed. The thumbnail can use the same image as created by the PNG export. If there isn't a known thumbnail then display a knocked back image representing 'unknown'."

## Execution Flow (main)
```
1. User opens the Home/Library page → system loads the catalog of saved maps with basic metadata.
2. For each map, system checks whether a stored preview image exists and when it was last refreshed.
3. If a preview exists, render it in the map card while keeping the layout responsive to different viewport widths.
4. If the preview is missing, invalid, or older than the latest map modification timestamp, display the "unknown" placeholder and queue a refresh using the PNG export pipeline.
5. When a PNG export completes (manual export or background refresh), capture the resulting image as the new thumbnail, update the catalog entry, and surface it without requiring a full page reload.
6. If thumbnail generation fails, retain the placeholder, surface a non-blocking message in activity/logging, and allow the user to retry by reloading or exporting again.
```

---

## ⚡ Quick Guidelines
- Thumbnails must reflect the most recently known visual state of the map without exposing editing controls.
- Preview images should reuse the PNG export appearance (background, zoom, canvas framing) for visual consistency.
- Preview images should be stored and rendered at a fixed 320×180 (16:9) resolution to balance clarity with storage footprint.
- Preserve the map card grid layout; thumbnails should scale uniformly and maintain aspect ratio without cropping key content.
- Provide descriptive alt text for accessibility (e.g., "Thumbnail of {map name}" or "Thumbnail unavailable").
- The "unknown" artwork should be visually subdued (muted palette, reduced opacity) so it is instantly distinguishable from real previews.
- Avoid introducing new manual steps; thumbnail updates should happen automatically after exports or background refresh events.

---

## Clarifications

### Session 2025-10-04
 - Q: Where should the system persist each map’s thumbnail image so it survives page reloads? → A: Store PNG blobs inside the existing IndexedDB.
 - Q: What target size should each stored thumbnail use so the grid stays crisp without ballooning storage? → A: Fixed 320×180 (16:9) PNG.
 - Q: When a map’s content changes without a manual PNG export, how should the system refresh the thumbnail? → A: Close or idle 10s refresh.

### Session 2025-10-05
- Q: What’s the maximum acceptable time for an existing cached thumbnail to appear on its map card after the Home/Library page loads? → A: ≤1 second.
- Q: What’s the total storage budget for cached thumbnail blobs in IndexedDB before the system should start evicting older entries? → A: 10 MB cap.
- Q: When the thumbnail cache reaches the 10 MB cap, which entries should be evicted first? → A: Oldest updated thumbnails (LRU by updatedAt).
- Q: When a thumbnail refresh succeeds or fails, where should the outcome be recorded for diagnostics? → A: Structured console logs only (dev tooling).
- Q: How many times should the system retry a failed thumbnail refresh before marking it failed? → A: Retry once (total 2 attempts).

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a map creator returning to the Home/Library page, I want to scan a grid of map thumbnails so I can quickly recognize the diagram I wish to open without remembering its title.

### Acceptance Scenarios
1. **Given** a map that has previously generated a PNG export, **When** I open the Home/Library page, **Then** the map card displays that exported image as its thumbnail.
2. **Given** a map that has never produced a PNG preview, **When** I open the Home/Library page, **Then** the card shows the subdued "unknown" placeholder with appropriate alt text.
3. **Given** I export an updated PNG for a map, **When** I return to the Home/Library page, **Then** the thumbnail reflects the new image without showing the old artwork.

### Edge Cases
- Map catalog includes dozens of entries → ensure thumbnails lazy-load or paginate so scrolling remains smooth.
- Stored thumbnail data becomes corrupted or cannot be decoded → fallback to the "unknown" placeholder and flag the entry for regeneration.
- User works offline → page should use the most recently cached thumbnail assets and placeholders without failing the view.
- Concurrent exports on multiple maps → ensure thumbnails update independently and one failure does not block others.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST display a visual thumbnail on every map card within the Home/Library page grid.
- **FR-002**: The system MUST associate each map with the most recent PNG preview produced through the export feature, persist the PNG blob inside the existing IndexedDB store, and reuse it on the Home/Library page.
- **FR-003**: The system MUST automatically refresh the stored thumbnail when a user exports a newer PNG, closes the map, or leaves the editor idle for 10 seconds after a change.
- **FR-004**: The system MUST present a brand-approved "unknown" placeholder whenever a thumbnail asset is missing, expired, or not yet generated.
- **FR-005**: The system MUST store rendered thumbnails at a fixed 320×180 (16:9) resolution and scale them responsively within the Home/Library grid without distortion.
- **FR-006**: The system MUST provide accessible text equivalents for both real thumbnails and the placeholder so screen-reader users can differentiate states.
- **FR-007**: The system MUST degrade gracefully when thumbnail retrieval fails (timeout, decoding error, offline) by retaining the placeholder and logging the failure for diagnostics.
- **FR-008**: The system SHOULD surface an unobtrusive progress or retry affordance when a thumbnail refresh is queued but not yet complete, so users understand that the view will update shortly.
- **FR-009**: The system MUST emit structured console logs for each thumbnail refresh success or failure, including map identifier, trigger, and outcome details to aid diagnostics.

### Reliability Requirements
- **RR-001**: The system MUST attempt one automatic retry after a failed thumbnail refresh (maximum two attempts total) before marking the asset as failed until a new trigger occurs.

### Performance Requirements
- **PR-001**: Cached thumbnails retrieved from IndexedDB MUST render on their map card within ≤1 second of the Home/Library page load completing.
- **PR-002**: The thumbnail cache MUST initiate eviction once stored PNG blobs reach a cumulative 10 MB, prioritizing removal of the stalest entries.

### Data Retention & Eviction
- **DR-001**: When eviction is required, remove cached thumbnails in least-recently-updated order (LRU by `updatedAt`) before deleting newer assets.

### Key Entities *(include if feature involves data)*
- **Map Library Entry**: Represents a saved map surfaced on the Home/Library page; includes map identifier, name, last modified timestamp, and a reference to the current thumbnail status (ready, pending refresh, unavailable).
- **Map Thumbnail Asset**: Captured PNG image metadata tied to a Map Library Entry; includes source export timestamp, fixed 320×180 dimensions, and an IndexedDB storage reference to the persisted PNG blob. Supports lifecycle states (current, stale, failed) and tracks retry attempts.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
