# Rich Notes Feature Changelog (Feature 004-create-a-fully)

## 2025-10-01
- Initialized feature planning
- Clarifications resolved & documented (fonts, sizes, overflow, opacity, performance targets)
- Added implementation plan assumptions

## Scope Summary
Enhances Note nodes with formatting (font, size, style, color), background opacity, overflow behaviors (Truncate / Auto-Resize / Scroll), hide-on-unselected shape option, contrast warnings, undo integration, and performance instrumentation.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Font detection variability | Fallback curated font list |
| Performance regression (auto-resize) | Instrumentation + batching updates |
| Invisible notes (opacity + hide shape) | Confirmation dialog + minimum effective opacity guidance |
| Undo spam | Coalescing continuous adjustments |

## Deferred / Out-of-Scope Initially
- Horizontal auto-resize (width) adaptive logic
- Additional formatting (underline highlight UI beyond initial emphasis baseline)
- Shared style presets / theming inheritance

---
File tracked separately for focused feature history.
