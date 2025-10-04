# Contract: Import Summary Feedback

## Overview
- **Purpose**: Define the structure of the summary object displayed after an import attempt and logged for auditing.
- **Producers**: Import workflow after applying user decisions.
- **Consumers**: UI toast/modal, telemetry logger, regression tests.

## Type Definition (TypeScript)
```ts
interface ImportSummary {
  totalProcessed: number;
  succeeded: number;
  skipped: number;
  failed: number;
  messages: Array<{
    mapId: string;
    level: "info" | "warning" | "error";
    detail: string;
  }>;
}
```

## Validation Rules
- `totalProcessed === succeeded + skipped + failed`.
- `messages` may be empty but must not be null.
- `level === "error"` entries require a user-visible detail.
- When user selects **Cancel**, `failed` should equal remaining maps and include a message with level `warning`.

## Contract Tests (to be written)
- Failing test verifying totals alignment validation.
- Failing test confirming cancellation populates warning message with `action: "cancel"` context.
- Failing test ensuring `messages` entries appear for each failed map.
