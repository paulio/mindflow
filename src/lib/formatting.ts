// Rich Note Formatting Defaults & Helpers (Feature 004)
import { NodeRecord } from './types';

export interface NoteFormatting {
  fontFamily: string;
  fontSize: number; // px
  fontWeight: number | 'normal' | 'bold';
  italic: boolean;
  underline: boolean;
  highlight: boolean;
  backgroundOpacity: number; // 0-100
  overflowMode: 'truncate' | 'auto-resize' | 'scroll';
  hideShapeWhenUnselected: boolean;
  maxHeight: number; // vertical auto-resize ceiling
}

export const DEFAULT_NOTE_FORMATTING: NoteFormatting = {
  fontFamily: 'Inter',
  fontSize: 14,
  fontWeight: 'normal',
  italic: false,
  underline: false,
  highlight: false,
  backgroundOpacity: 100,
  overflowMode: 'auto-resize',
  hideShapeWhenUnselected: false,
  maxHeight: 280
};

export function applyNoteFormattingDefaults(n: NodeRecord): NodeRecord {
  if (n.nodeKind !== 'note') return n;
  return {
    ...n,
    fontFamily: n.fontFamily ?? DEFAULT_NOTE_FORMATTING.fontFamily,
    fontSize: n.fontSize ?? DEFAULT_NOTE_FORMATTING.fontSize,
    fontWeight: n.fontWeight ?? DEFAULT_NOTE_FORMATTING.fontWeight,
    italic: n.italic ?? DEFAULT_NOTE_FORMATTING.italic,
    underline: n.underline ?? DEFAULT_NOTE_FORMATTING.underline,
    highlight: n.highlight ?? DEFAULT_NOTE_FORMATTING.highlight,
    backgroundOpacity: n.backgroundOpacity ?? DEFAULT_NOTE_FORMATTING.backgroundOpacity,
    overflowMode: n.overflowMode ?? DEFAULT_NOTE_FORMATTING.overflowMode,
    hideShapeWhenUnselected: n.hideShapeWhenUnselected ?? DEFAULT_NOTE_FORMATTING.hideShapeWhenUnselected,
    maxHeight: n.maxHeight ?? DEFAULT_NOTE_FORMATTING.maxHeight
  };
}

export function resetNoteFormatting(n: NodeRecord): NodeRecord {
  if (n.nodeKind !== 'note') return n;
  return { ...n, ...DEFAULT_NOTE_FORMATTING };
}
