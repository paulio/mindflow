# Data Model: Azure Static Hosting for Mindflow

## Overview
Defines runtime and operational entities required to host Mindflow on Azure Static Web Apps with Entra ID authentication, per-user isolation, and telemetry-driven operations.

## Entities
### UserIdentity
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| subjectId | string | required, unique | Entra ID `sub` claim; primary partition key for IndexedDB isolation. |
| tenantId | string | required | Entra ID tenant guiding authorization. |
| displayName | string | required, 1-120 chars | Sourced from `name` claim. |
| email | string | optional | Used for support contact. |
| avatarUrl | string | optional | Provided by Entra ID profile; may be empty. |
| lastLogin | timestamp | required | Updated on successful hosted login. |
| sessionState | enum(`active`,`signedOut`,`revoked`) | required | Tracks current hosted session.

### MapWorkspace
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| workspaceId | string | required | Mirrors subjectId for 1:1 mapping. |
| mapsStore | string | required | IndexedDB store name containing map documents. |
| lastSynced | timestamp | required | Last time workspace loaded in hosted app. |
| isolationTag | string | required | Derived from `subjectId`; appended to object store keys to prevent leakage. |
| disabledAccessFlag | boolean | default false | Set when Entra ID disables account; allows local support retrieval only. |

### DeploymentRecord
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| deploymentId | string | required | GitHub Actions run ID + commit SHA. |
| commitSha | string | required, length 40 | Source commit. |
| branch | string | required | Should be `main` for production. |
| status | enum(`succeeded`,`failed`,`rolledBack`) | required | Matches pipeline outcome. |
| deployedAt | timestamp | required | Publication time. |
| reviewer | string | optional | GitHub site owner who approved/rolled back. |
| notes | string | optional | Manual remediation notes for ops.

### TelemetryEvent
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| eventId | string | required, uuid | Unique event identifier. |
| eventType | enum(`http_request`,`deployment_status`) | required | Scope limited per NFR-003. |
| timestamp | timestamp | required | ISO8601. |
| requestPath | string | required if eventType=`http_request` | Normalized path (no query params). |
| statusCode | number | required if eventType=`http_request` | HTTP status class for aggregated metrics. |
| method | string | required if eventType=`http_request` | GET/POST/etc. |
| deploymentStatus | enum(`succeeded`,`failed`) | required if eventType=`deployment_status` | Snapshot from pipeline. |
| deploymentId | string | optional | Links to DeploymentRecord when available. |
| metadata | object | optional | Additional structured properties (client hints, cache status).

## Relationships
- `UserIdentity` 1 — 1 `MapWorkspace` (subjectId == workspaceId).
- `DeploymentRecord` 1 — n `TelemetryEvent` (deployment status events attach by deploymentId).
- `MapWorkspace` utilizes existing IndexedDB stores `graphs`, `graphNodes`, `graphEdges`, namespaced by `isolationTag`.

## Invariants
1. `UserIdentity.subjectId` uniquely identifies storage buckets; no two users share the same isolation tag.
2. `MapWorkspace.disabledAccessFlag` MUST mirror Entra ID account status; only true when account disabled.
3. All `DeploymentRecord` rows for `status=failed` MUST have a corresponding telemetry event within 5 minutes to surface in dashboards.
4. `TelemetryEvent` entries outside the two allowed `eventType` values are rejected; prevents telemetry sprawl.
5. On session refresh, previous `sessionState` transitions to `revoked` before a new `active` record is written.

## State Transitions
- **Session lifecycle**: `revoked` → `active` on login, `active` → `signedOut` on explicit logout, `active` → `revoked` when a newer session takes precedence.
- **Deployment lifecycle**: `succeeded` may transition to `rolledBack` if prior version restored; `failed` requires manual remediation note.
- **Disabled account**: Setting `disabledAccessFlag=true` blocks hosted sessions but keeps local exports accessible until re-enabled.

## Validation Rules
- Enforce HTTPS-only avatar URLs; fallback to neutral silhouette when empty or invalid.
- Telemetry ingestion validates timestamps within ±5 minutes of server time to avoid skew.
- Deployment records require `branch === "main"` before promoting to production environment.
- Local support export job must confirm `disabledAccessFlag=true` before retrieving maps on behalf of user.

## Persistence Mapping
| Store | Key | Value | Notes |
|-------|-----|-------|-------|
| IndexedDB `userProfiles` | `subjectId` | `UserIdentity` | Lives client-side per user. |
| IndexedDB `mapWorkspaces` | `workspaceId` | `MapWorkspace` metadata | Houses isolation tag + sync metadata. |
| Azure Monitor Logs | n/a | `TelemetryEvent` | Structured logging pipeline via Static Web Apps diagnostics. |
| Ops Runbook (YAML/Markdown) | `deploymentId` | `DeploymentRecord` entry | Maintained alongside CI artifacts.

## Quality & Test Notes
- Contract tests assert `/._auth/me` provides `sub`, `name`, and optional avatar; ensures fallback path tested.
- Integration tests simulate concurrent sign-ins to verify session revocation behavior.
- Telemetry tests ensure only `http_request` and `deployment_status` event types are emitted.
- Quickstart exercise guides ops through failed deployment review and manual rollback.
