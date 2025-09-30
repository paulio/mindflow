// Distance / placement utilities for toolbar node creation (Feature 003)
// Edge-to-edge distance rule: a new node's bounding box must be at least MIN_GAP px from existing nodes (inclusive)

export interface Box { x: number; y: number; w: number; h: number; } // x,y = top-left

export const MIN_GAP = 50; // FR-006/FR-007

// Returns true if candidate box is valid (>= MIN_GAP away edge-to-edge from every existing box)
export function isPlacementValid(candidate: Box, existing: Box[], gap: number = MIN_GAP): boolean {
  for (const b of existing) {
    const dx = horizontalEdgeDistance(candidate, b);
    const dy = verticalEdgeDistance(candidate, b);
    if (dx < gap && dy < gap) return false; // both axes overlap closer than required gap
  }
  return true;
}

// Horizontal edge distance between two boxes (0 if overlapping/intersecting)
export function horizontalEdgeDistance(a: Box, b: Box): number {
  if (a.x + a.w < b.x) return b.x - (a.x + a.w); // a left of b
  if (b.x + b.w < a.x) return a.x - (b.x + b.w); // b left of a
  return 0; // overlapping / touching horizontally
}

// Vertical edge distance between two boxes (0 if overlapping)
export function verticalEdgeDistance(a: Box, b: Box): number {
  if (a.y + a.h < b.y) return b.y - (a.y + a.h);
  if (b.y + b.h < a.y) return a.y - (b.y + b.h);
  return 0;
}
