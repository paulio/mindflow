# Whole-Graph PNG Export Design

## Goal

Export each mounted map as a complete PNG that preserves the editor's rendered React Flow nodes, SVG connectors, dark canvas, and dot grid without exporting application chrome or editor controls.

## Scope

- Include every rendered graph node and SVG edge within a padded off-screen capture surface.
- Preserve the editor's rendered node position, dimensions, fill, border, text, connector paths, dark canvas, and dot grid.
- Exclude application chrome, React Flow controls, handles, selection boxes, connection previews, and attribution from the cloned capture surface.
- Fit the cloned surface to complete graph bounds without changing the visible editor viewport.
- Keep the data-based canvas renderer only when no mounted editor DOM exists, including background thumbnail generation.

## Exclusions

- The PNG is not a screenshot of the current viewport; it is an off-screen, whole-graph DOM capture.
- Do not include app toolbars, React Flow controls, selection rings, resize handles, or connection handles.
- Do not alter graph persistence, visible editor viewport behavior, or the PNG download interaction.

## Architecture

The mounted editor DOM becomes the primary source for user-triggered PNG downloads. The existing `exportGraphAsPng` canvas renderer remains the fallback source for background thumbnail generation and no-DOM contexts.

1. `GraphCanvas` names the mounted React Flow root and provides the export action access to it.
2. A DOM-capture helper clones the root into an attached off-screen staging element, calculates a whole-graph viewport for the clone, and keeps the React Flow background grid.
3. The helper hides editor-only clone elements before calling `html-to-image` to generate a canvas.
4. The existing download and thumbnail-persistence path consumes that canvas, while the model renderer remains available when the React Flow root is absent.

## Error Handling

- DOM-capture failures return `null` and fall back to the existing data renderer when possible.
- Capture canvas dimensions and pixel ratio are bounded to avoid browser canvas allocation failures for very large maps.
- Cloned staging elements are always removed after success or failure.

## Verification

- Unit tests mock DOM capture and verify clone selection, hidden editor-only elements, whole-graph clone viewport, cleanup, and data-renderer fallback.
- Browser-level coverage verifies the emitted PNG contains the React Flow grid/nodes/edges and excludes controls.
- Existing export and thumbnail tests continue to cover serialization and thumbnail persistence.
- Run the full unit suite, type check, lint, and browser test after implementation.