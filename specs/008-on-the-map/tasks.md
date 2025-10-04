# Task Plan: Map Library Export & Import

## Overview
- **Branch**: `008-on-the-map`
- **Spec**: `specs/008-on-the-map/spec.md`
- **Plan**: `specs/008-on-the-map/plan.md`
- **Goal**: Implement export/import tooling for Map Library with ZIP packaging, conflict prompts, migration, and progress feedback.

## Task List

### Setup & Dependency Preparation
1. **T001 [X]** – *Install ZIP tooling dependency*
    - Add `jszip` and ensure type definitions are available (library includes TS types without extra package).
    - Run `npm install` and commit lockfile changes.
    - Location: `package.json`, `package-lock.json`.

2. **T002 [X]** – *Seed data exports for tests*
    - Create representative fixture helper for maps used across export/import tests.
    - Location: `tests/setup/` new fixture module.

### Contract Tests (TDD First) – Parallelizable
3. **T003 [P][X]** – *Write failing contract tests for manifest integrity*
    - Add tests under `tests/contract/export-manifest.contract.test.ts` covering missing fields, wrong totals, duplicate IDs.

4. **T004 [P][X]** – *Write failing contract tests for import summary*
    - Add tests under `tests/contract/import-summary.contract.test.ts` verifying totals alignment and cancel warnings.

### Integration Tests (User Scenarios) – Parallelizable
5. **T005 [P][X]** – *Export happy-path integration test*
    - Playwright test `tests/integration/export-multi-map.spec.ts` per quickstart export flow with progress modal assertion.

6. **T006 [P][X]** – *Import restore integration test*
    - Playwright test `tests/integration/import-restore.spec.ts` validating reappearance of deleted map and logs.

7. **T007 [P][X]** – *Conflict prompt integration test*
    - Playwright test `tests/integration/import-conflict-prompt.spec.ts` covering Add/Overwrite/Cancel branches.

8. **T008 [P][X]** – *Malformed ZIP failure integration test*
    - Playwright test `tests/integration/import-malformed.spec.ts` ensuring validation failure handling.

9. **T009 [P][X]** – *Migration success integration test*
    - Playwright test `tests/integration/import-migration.spec.ts` covering schema downgrade + migration messaging.

### Domain & Persistence Logic
10. **T010 [X]** – *Implement ExportManifest & MapSnapshot serializers*
    - Update `src/lib/export.ts` to build manifest + map payload entries using JSZip.
    - Ensure manifest validation helper exported for tests.

11. **T011 [X]** – *Implement export ZIP generator*
    - Integrate JSZip bundling pipeline, return Blob for download.
    - Pause autosave during export and log duration.

12. **T012 [X]** – *Implement import ZIP validator & parser*
    - Add helper in `src/lib/export.ts` (or new module) to inspect ZIP, parse manifest, stage `ImportSession` data structures.

13. **T013 [X]** – *Implement schema migration helper*
    - Provide function to upgrade older manifest/map payloads before applying.
    - Update tests to cover migration success/failure.

14. **T014 [X]** – *Persist ImportSession outcomes*
    - Extend `src/state/graph-store.tsx` (or dedicated store) to track sessions, apply resolutions, and update IndexedDB.

### UI & Interaction Layer
15. **T015** – *Map Library selection UX*
    - Update Map Library panel to support multi-select with accessible controls (shift-click, checkboxes).

16. **T016** – *Export confirmation dialog*
    - Create modal listing selected maps, confirm/cancel actions, hooking into export logic.

17. **T017** – *Import summary preview dialog*
    - Display manifest contents pre-commit, including conflict detection notes.

18. **T018** – *Conflict resolution prompt*
    - Implement per-map dialog with Overwrite/Add/Cancel options, ensure keyboard navigation.

19. **T019** – *Progress indicator component*
    - Build reusable progress modal with aria-live status, cancel button hooking into session cancel flow.

20. **T020** – *Post-import summary UI*
    - Render success/warning/error breakdown using ImportSummary contract; integrate with toast/log.

### Wiring & Observability
21. **T021** – *Wire logs and telemetry*
    - Ensure export/import paths emit structured console logs with duration, outcomes.

22. **T022** – *Hook quickstart fixtures into tests*
    - Ensure new fixtures/utilities used across integration suites and cleaned up.

### Polish & Documentation (Parallelizable)
23. **T023 [P]** – *Update quickstart instructions if drift*
    - Verify quickstart steps match final UI; adjust text/screenshots if needed.

24. **T024 [P]** – *Performance smoke & accessibility audit*
    - Run Lighthouse/axe checks for dialogs; ensure progress UI meets guidelines.

25. **T025 [P]** – *Update README/Map Library docs*
    - Document export/import feature usage and limitations.

26. **T026 [P]** – *Final test & lint sweep*
    - Run `npm run lint`, `npm run typecheck`, and full test suite; resolve any issues.

## Parallel Execution Guidance
- Tasks marked **[P]** can run concurrently once prerequisites satisfied.
- Recommended agents:
  - `T003`/`T004`: Contract test authoring agents.
  - `T005`–`T009`: Playwright-focused agents (ensure environment ready).
  - `T023`–`T026`: Docs/QA polish agents post-implementation.

## Dependency Notes
- T001 must complete before export/import implementation (T010–T013).
- Contract & integration tests (T003–T009) should fail before corresponding implementation tasks start.
- UI tasks (T015–T020) depend on domain logic availability (T010–T014).
- Progress indicator (T019) needed before integration tests requiring UI assertions can pass.
- Final polish tasks depend on all prior features being functional.
