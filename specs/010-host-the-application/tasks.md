# Tasks: Host the application on Azure Static Site

**Input**: Design documents from `specs/010-host-the-application/`
**Branch**: `010-host-the-application`

## Phase 3.1 Setup
- [X] T001 Create Azure auth and telemetry fixtures in `tests/fixtures/azure/` for contract and integration tests (Entra profile, telemetry event samples).
- [X] T002 Add Entra ID and Azure Static Web Apps placeholders to `.env.local.example` for local development auth redirects.
- [X] T003 Draft `docs/deployment/azure-static-web-apps.md` skeleton capturing daily telemetry review outline and rollback checklist headings.

## Phase 3.2 Tests First (TDD)
- [X] T004 [P] Write failing Vitest contract test `tests/contract/azure-auth-profile.contract.test.ts` validating `contracts/auth-profile.contract.json` via ajv.
- [X] T005 [P] Write failing Vitest contract test `tests/contract/telemetry-event.contract.test.ts` validating `contracts/telemetry-event.contract.json` including event-type guards.
- [X] T006 [P] Write failing Vitest unit test `tests/unit/staticwebapp-config.test.ts` asserting `staticwebapp.config.json` enforces Entra ID auth and neutral fallback routes.
- [X] T007 [P] Write failing Playwright spec `tests/integration/entra-login.spec.ts` covering Entra ID sign-in flow and avatar fallback rendering.
- [X] T008 [P] Write failing Playwright spec `tests/integration/map-isolation.spec.ts` ensuring users only see their own maps post-login.
- [X] T009 [P] Write failing Playwright spec `tests/integration/session-revocation.spec.ts` asserting newer login revokes prior session tokens.
- [X] T010 [P] Write failing Playwright spec `tests/integration/disabled-account-fallback.spec.ts` validating hosted access denial and local IndexedDB recovery.
- [X] T011 [P] Write failing Playwright spec `tests/integration/deployment-failure-telemetry.spec.ts` simulating failed deployment while verifying prior build remains live and telemetry event recorded.
- [X] T012 [P] Write failing Vitest unit tests `tests/unit/identity-map-workspace.test.ts` covering `UserIdentity` parsing, isolation tag generation, and disabled flag invariants.
- [X] T013 [P] Write failing Vitest unit tests `tests/unit/telemetry-events.test.ts` covering `TelemetryEvent` validation and publisher throttling expectations.

## Phase 3.3 Core Implementation
- [X] T014 [P] Implement `UserIdentity` model and parser in `src/lib/auth/user-identity.ts` to map Static Web Apps profile responses.
- [X] T015 [P] Implement `MapWorkspace` isolation utilities in `src/lib/workspace/map-workspace.ts` including disabled-account export helpers.
- [X] T016 [P] Implement `DeploymentRecord` helpers in `src/lib/deployment/deployment-record.ts` for pipeline metadata capture.
- [X] T017 [P] Implement `TelemetryEvent` types and guards in `src/lib/telemetry/events.ts` aligned with contract schema.
- [X] T018 Update `src/lib/indexeddb.ts` to partition stores by `MapWorkspace` isolation tag and respect disabled flag restrictions.
- [X] T019 Update `src/state/graph-store.tsx` to load per-user workspaces, enforce session revocation, and expose identity-aware actions.
- [X] T020 Create `src/components/ui/UserAvatar.tsx` rendering avatar or neutral silhouette using design tokens.
- [X] T021 Update `src/pages/App.tsx` to bootstrap Entra ID auth, gate access on `UserIdentity`, and display `UserAvatar` with sign-out controls.
- [X] T022 Populate `staticwebapp.config.json` with route, response overrides, and auth configuration required by tests.

## Phase 3.4 Integration & Ops
- [ ] T023 [P] Implement telemetry publisher in `src/lib/telemetry/publisher.ts` batching request and deployment events to Azure Monitor.
- [ ] T024 Wire telemetry publisher into `src/index.tsx` and `src/lib/events.ts` so page loads, map activity, and deployment status emit events.
- [X] T025 Update `.github/workflows/azure-static-web-apps.yml` to build on `main`, publish artifacts, flag failures, and surface deployment metadata.
- [X] T026 Add `scripts/export-disabled-account.ts` CLI to pull IndexedDB snapshots for disabled users via local dev server.
- [X] T027 Complete `docs/deployment/azure-static-web-apps.md` with daily telemetry checklist, rollback procedure, and disabled-account recovery steps.
- [X] T028 Refresh `specs/010-host-the-application/quickstart.md` to align with implemented flows and include telemetry verification instructions.

## Phase 3.5 Polish & Validation
- [ ] T029 [P] Update `README.md` with Azure Static Web Apps hosting instructions, auth requirements, and telemetry expectations.
- [ ] T030 [P] Add Lighthouse performance script `tests/perf/lighthouse-static-site.cjs` targeting 3s FMP budget and document thresholds.
- [ ] T031 Execute quality gates (`npm run lint`; `npm test`; `npm run test:e2e`) and capture results in commit notes.
- [ ] T032 [P] Perform end-to-end quickstart walkthrough and append validation log to `docs/deployment/azure-static-web-apps.md` / quickstart troubleshooting.

## Dependencies
- T004–T013 must fail before starting T014–T028 (TDD gate).
- T014 → T019 → T021 (identity utilities before app integration).
- T017 → T023 → T024 (telemetry types precede publisher and wiring).
- T022 blocks T006 from passing; implement after tests.
- T025 depends on T016 and T017 to ensure metadata is available.
- Documentation tasks T027/T028 depend on completion of related implementation tasks (T023–T026).

## Parallel Execution Example
```
# After setup, execute T004–T013 in parallel:
Task: "Run T004 - Contract test for auth profile"
Task: "Run T005 - Contract test for telemetry event"
Task: "Run T006 - Static Web Apps config test"
Task: "Run T007 - Entra login + avatar integration spec"
Task: "Run T008 - Map isolation integration spec"
Task: "Run T009 - Session revocation integration spec"
Task: "Run T010 - Disabled account fallback integration spec"
Task: "Run T011 - Deployment failure telemetry integration spec"
Task: "Run T012 - UserIdentity & MapWorkspace unit tests"
Task: "Run T013 - Telemetry events unit tests"
```

## Notes
- [P] tasks target distinct files/directories and can be parallelized when dependencies satisfied.
- Ensure every test introduced in Phase 3.2 is executed and failing before work begins on Phase 3.3.
- Keep commits focused per task to simplify review against constitutional gates.
