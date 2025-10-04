# Contract: Export Manifest (manifest.json)

## Overview
- **Purpose**: Describe the structure of `manifest.json` stored at the root of every export ZIP.
- **Consumers**: Export pipeline (writer) and import validator (reader).
- **Versioning**: `manifestVersion` integer; current plan starts at `1`.

## JSON Schema (pseudo)
```json
{
  "manifestVersion": 1,
  "generatedAt": "2025-10-04T18:15:00.000Z",
  "appVersion": "1.4.0",
  "totalMaps": 2,
  "maps": [
    {
      "id": "graph-123",
      "name": "Marketing Plan",
      "schemaVersion": 3,
      "payloadPath": "maps/graph-123.json",
      "lastModified": "2025-09-30T12:00:00.000Z"
    }
  ]
}
```

## Validation Rules
- `manifestVersion` must be present and supported; unknown versions trigger migration attempt.
- `generatedAt` and `lastModified` must be parseable ISO strings.
- `totalMaps` must equal `maps.length`.
- Each `payloadPath` must exist in the ZIP at import time.
- `maps[].id` values must be unique.

## Error Codes (planned)
- `MANIFEST_MISSING_FIELD`
- `MANIFEST_UNSUPPORTED_VERSION`
- `PAYLOAD_NOT_FOUND`
- `MANIFEST_INTEGRITY_MISMATCH`

## Contract Tests (to be written)
- Failing test to assert missing `manifestVersion` rejects import.
- Failing test to assert wrong `totalMaps` value triggers integrity error.
- Failing test to assert duplicate `id` values are rejected.
