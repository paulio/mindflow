# Quickstart: Map Library Export & Import

## Prerequisites
- Install dependencies:
  ```powershell
  npm install
  ```
- Launch dev server:
  ```powershell
  npm run dev
  ```
- Open http://localhost:5173 and ensure you can create maps in the Map Library.

## Export Validation
1. Populate the library with at least three distinct maps (ensure different names).
2. On the Map Library screen, multi-select two maps using the new selection controls.
3. Click **Export**. A confirmation dialog should list the chosen maps.
4. Confirm export. A progress modal should appear immediately with live status text.
5. When export completes, the browser should download a ZIP (verify file name includes timestamp).
6. Open the ZIP locally and confirm it contains `manifest.json` plus one JSON file per exported map.

## Import Validation
1. Delete one of the maps locally to simulate restoration.
2. Click **Import** in the Map Library and choose the ZIP from the previous section.
3. Review the manifest summary; confirm the list matches expectations.
4. Proceed with import. The progress modal should update status until completion.
5. Confirm the deleted map re-appears with original metadata and viewport.

## Conflict Prompt Flow
1. Rename an existing map so its name matches another map inside the ZIP.
2. Run the import again. When prompted, choose **Add** to keep both maps.
3. Verify the duplicate name is suffixed automatically (e.g., `Map (1)`).
4. Re-run import, choose **Overwrite**, and confirm the existing map is replaced.
5. Re-run import, choose **Cancel**, and confirm no additional maps are imported and the session reports cancellation.

## Malformed ZIP Handling
1. Edit the previously exported ZIP: remove one of the map JSON files or corrupt `manifest.json`.
2. Attempt import. Expect validation to fail with an explanatory message, leaving existing maps unchanged.

## Migration Scenario
1. Modify `manifest.json` inside the ZIP to lower the `manifestVersion` (simulate older export) but keep structure valid.
2. Import the modified ZIP. Confirm the migration path triggers (status message), and the import completes successfully.

## Logging & Telemetry Spot Check
- Open the browser console during export/import to ensure structured log statements include duration and outcome codes.
- Verify no warnings from lint/type checks by running:
  ```powershell
  npm run lint
  npm run typecheck
  ```
