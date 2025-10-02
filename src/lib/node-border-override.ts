/**
 * Pure helper utilities for applying & clearing node border colour overrides.
 * These operate on a minimal duck-typed subset of the NodeRecord so they can
 * be unit tested without importing the full store.
 */

export interface BorderNodeLike {
  originalBorderColour?: string;
  currentBorderColour?: string;
  borderPaletteIndex?: number; // stored index from initial mapping or -1
  borderOverrideFlag?: boolean;
  borderOverrideColour?: string; // valid when overrideFlag true
}

// Accept 6-digit (#RRGGBB) or 8-digit (#RRGGBBAA) hex strings. User custom input UI still restricts to 6.
const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export function applyBorderOverride<T extends BorderNodeLike>(node: T, hex: string): T & { borderOverrideFlag: true; borderOverrideColour: string; currentBorderColour: string } {
  if (!HEX_RE.test(hex)) throw new Error('Invalid hex colour');
  // Return a shallow copy with override applied (pure function style)
  return {
    ...node,
    borderOverrideFlag: true,
    borderOverrideColour: hex,
    currentBorderColour: hex
  } as T & { borderOverrideFlag: true; borderOverrideColour: string; currentBorderColour: string };
}

export function clearBorderOverride<T extends BorderNodeLike>(node: T): T {
  if (!node.borderOverrideFlag) return node; // idempotent
  const original = node.originalBorderColour || node.currentBorderColour;
  return {
    ...node,
    borderOverrideFlag: false,
    borderOverrideColour: undefined,
    currentBorderColour: original
  };
}
