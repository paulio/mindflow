# Data Model: Node Border Colour Overrides

## Node Extensions
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| originalBorderColour | string (hex) | Yes (new nodes) | Captured at creation from palette mapping |
| currentBorderColour | string (hex) | Yes | Displayed border colour (override or original) |
| borderPaletteIndex | number | Yes (>=0) | depth % palette.length at creation |
| borderOverrideFlag | boolean | Yes | True if user override active |
| borderOverrideColour | string (hex) | Optional | Explicit override colour when `borderOverrideFlag` true |

## Invariants
- `borderOverrideFlag === false` → `currentBorderColour === originalBorderColour`.
- `borderOverrideFlag === true` → `currentBorderColour === borderOverrideColour`.
- `borderPaletteIndex` within `[0, palette.length-1]` unless palette length changed; if OOB, treat as fallback root colour.

## Functions (Pure)
### computeInitialBorderColour(depth: number, palette: string[]): { colour: string; index: number }
Rules:
- If `palette.length === 0` return `{ colour: ROOT_COLOUR, index: 0 }`.
- Else `{ colour: palette[depth % palette.length], index: depth % palette.length }`.

### applyBorderOverride(node, hex)
- Preconditions: `^#[0-9a-fA-F]{6}$` matches.
- Effects: set `borderOverrideFlag=true`, `borderOverrideColour=hex`, `currentBorderColour=hex`.

### clearBorderOverride(node)
- Effects: set `borderOverrideFlag=false`, remove/ignore `borderOverrideColour`, set `currentBorderColour=originalBorderColour`.

## Undo Semantics
Each override apply or clear operation captures prior structural snapshot:
```
{
  nodeId,
  prev: { flag, currentBorderColour, borderOverrideColour },
  next: { flag, currentBorderColour, borderOverrideColour }
}
```
Restoring uses `prev`. No cascading recomputation.

## Serialization
Persist all new fields; legacy nodes (missing fields) hydrated by computing initial mapping using stored depth at load-time.
