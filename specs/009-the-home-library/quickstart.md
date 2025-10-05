# Quickstart: Verify Home Library Map Thumbnails

**Feature Branch**: `009-the-home-library`

> Use this guide to validate the feature end-to-end once implementation is complete. Steps assume Playwright test harness configured via `npm run test:e2e` (adjust when wiring actual command).

## Prerequisites
- Run `npm install` (once) to ensure dependencies are available.
- Start development server: `npm run dev`.
- Launch Playwright UI runner or CLI in a separate terminal.

## Scenario 1: Happy Path Thumbnail Refresh
1. Create a new map from the editor.
2. Draw simple content so the export pipeline has pixels to capture.
3. Trigger a PNG export manually (or close the editor to rely on idle trigger).
4. Navigate to Home/Library page.
5. Verify placeholder appears initially, then swaps to rendered thumbnail within ≤1 s.
6. Confirm thumbnail alt text reads `"Thumbnail of {map name}"` and card remains keyboard navigable.
7. Inspect browser console for structured `thumbnail-refresh` log containing mapId, trigger, outcome `success`, duration, retryCount.

## Scenario 2: Idle Refresh with Retry
1. Open an existing map, modify content, and wait for 10 s idle timer.
2. After auto-refresh completes, return to Home/Library.
3. Confirm new thumbnail replaces placeholder within ≤1 s.
4. Verify retryCount remains 0 and log outcome `success` for idle trigger.

## Scenario 3: Failure Handling & Retry Limit
1. Simulate corrupt export (e.g., force mock to throw or intercept PNG generation).
2. Ensure Home/Library card shows placeholder with status indicator (pending/failed) and alt text `"Thumbnail unavailable"`.
3. Observe automatic retry attempt (one additional refresh).
4. After second failure, confirm status remains `failed`, retryCount stops at 1, and console logs include failure reason.

## Scenario 4: Cache Eviction at 10 MB
1. Seed library with ≥40 maps (script or test helper) each generating thumbnails.
2. Continue adding until total thumbnail bytes exceed 10 MB.
3. Verify eviction removes stalest thumbnails first (check console/debug logs).
4. Confirm removed entries regenerate on next trigger and grid remains responsive.

## Cleanup
- Reset IndexedDB stores via application reset tooling or devtools when finished.

> Document deviations or additional validation steps here as implementation clarifies behaviour.
