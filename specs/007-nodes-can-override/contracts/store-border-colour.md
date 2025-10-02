# Store Contract: Border Colour Override Actions

## Actions
### overrideNodeBorder(id: string, colour: string)
- Input: node id, hex colour (#rrggbb)
- Preconditions: Node exists; regex valid.
- Effects: Sets override flag true; stores colour in `borderOverrideColour`; updates `currentBorderColour`.
- Emits: undo entry (type: BORDER_OVERRIDE_SET).

### clearNodeBorderOverride(id: string)
- Preconditions: Node exists; override flag is true.
- Effects: Sets flag false; sets `currentBorderColour = originalBorderColour`; removes stored override colour.
- Emits: undo entry (type: BORDER_OVERRIDE_CLEAR).

## Error Modes
- Invalid colour format → ignore (no state mutation) or optional validation feedback (TBD – current iteration silent).
- Missing node id → no-op.

## State Shape (Excerpt)
```
node: {
  id: string,
  originalBorderColour: string,
  currentBorderColour: string,
  borderPaletteIndex: number,
  borderOverrideFlag: boolean,
  borderOverrideColour?: string
}
```

## Undo Entry Example
```
{
  t: 'BORDER_OVERRIDE_SET',
  nodeId: 'n1',
  prev: { flag:false, current:'#556070', override:undefined },
  next: { flag:true, current:'#d08770', override:'#d08770' }
}
```
