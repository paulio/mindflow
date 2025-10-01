# Quickstart: Node Border Colour Overrides

## Goal
Verify depth-based initial border colours, user override, reset, and undo.

## Steps
1. Open an existing or new graph (root node present).
2. Create 5 sequential child nodes (depth increasing) → confirm colours follow palette order wrapping after 10.
3. Select a node → in Detail pane choose a different palette colour → border updates immediately.
4. Enter custom hex (valid) → border updates; invalid hex leaves colour unchanged.
5. Press Undo → border reverts to prior colour & flag state.
6. Press Redo → override re-applied.
7. Clear override (reset) → border returns to original creation colour.
8. Re-parent the node (if supported) → border colour remains unchanged.

## Expected Results
- Initial colours match mapping rule.
- Overrides apply instantly and survive re-parent.
- Undo/redo toggles colour and overrideFlag correctly.
- Reset restores original creation colour.

## Troubleshooting
- If colours show identical for all nodes: check palette constant export.
- If undo fails: ensure override action added to undo stack logic.
