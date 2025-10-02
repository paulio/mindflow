/**
 * Background colour resolution precedence helper.
 *
 * Precedence (highest → lowest):
 * 1. If borderOverrideFlag true: currentBorderColour (fallback originalBorderColour)
 * 2. Explicit bgColor
 * 3. currentBorderColour
 * 4. originalBorderColour
 * 5. fallback token / colour
 */
export function resolveNodeBackground(record: any, fallback: string = 'var(--mf-node-bg, #1e222b)'): string {
  if (!record) return fallback;
  // Explicit user background always wins regardless of override
  if (record.bgColor) return record.bgColor;
  // If an override is active we intentionally DO NOT use the override colour for background;
  // we fall back to the original depth-mapped colour to keep override affecting only the border.
  if (record.borderOverrideFlag) return record.originalBorderColour || fallback;
  // No explicit bg and no override: currentBorderColour (which equals original) is fine.
  return record.currentBorderColour || record.originalBorderColour || fallback;
}

/** Accent colour used for focus ring / outline. */
export function resolveAccentColour(record: any, fallback: string = 'var(--mf-node-border)'): string {
  if (!record) return fallback;
  return record.currentBorderColour || record.originalBorderColour || fallback;
}
