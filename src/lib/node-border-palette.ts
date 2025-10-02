/**
 * Node Border Colour Palette & Mapping Utilities
 *
 * Provides a deterministic mapping from a node's depth (0-based) to an initial
 * border colour. Mapping is depth % palette.length. If the palette is empty or
 * the computed index is invalid, a root fallback colour is used.
 *
 * The mapping result captures both the colour and the palette index used so it
 * can be persisted on the node for later reference (e.g., showing the original
 * colour after overrides are cleared). Subsequent structural changes (like
 * re-parenting) MUST NOT remap a node automatically.
 */

export const ROOT_FALLBACK = '#1e222b'; // Unified fallback (root colour)

// The ordered palette used for depth-based assignment. Keep length > 0; if
// changed, previously stored indices may fall outside the new range, in which
// case hydration logic should treat them as fallback.
// Fixed 10-colour sequence from specification (some entries use 8-digit hex with full alpha 'ff').
// NOTE: Custom user overrides still require 6-digit #rrggbb; internal palette may include #rrggbbaa.
export const BORDER_COLOUR_PALETTE: string[] = [
  '#0e4ee6ff',
  '#225a0cff',
  '#c2961fff',
  '#556070',
  '#6b7687',
  '#8892a0',
  '#b48ead',
  '#a3be8c',
  '#d08770',
  '#bf616a',
  // Added legacy focus ring / selected border accent colour as 11th palette entry
  // (was previously themed via --color-focus-ring / --color-accent before palette overrides feature).
  '#99c7ffff'
];

/** Result shape for initial mapping */
export interface InitialBorderMapping {
  colour: string; // the colour chosen for initial border
  index: number;  // palette index (0-based) or -1 if fallback was used
}

/**
 * Compute the initial border colour for a node being created at a specified depth.
 *
 * @param depth 0-based depth of the node in the hierarchy (root = 0)
 * @param palette palette to use (defaults to BORDER_COLOUR_PALETTE)
 * @returns {InitialBorderMapping}
 */
export function computeInitialBorderColour(depth: number, palette: string[] = BORDER_COLOUR_PALETTE): InitialBorderMapping {
  if (!Number.isFinite(depth) || depth < 0) depth = 0;
  if (!palette || palette.length === 0) {
    return { colour: ROOT_FALLBACK, index: -1 };
  }
  const idx = depth % palette.length;
  const colour = palette[idx] || ROOT_FALLBACK;
  return { colour, index: colour === ROOT_FALLBACK ? -1 : idx };
}
