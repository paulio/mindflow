import React from 'react';
import { NodeResizer, useUpdateNodeInternals } from 'reactflow';
import { useGraph } from '../../state/graph-store';

// Unified annotation node: rectangle (no text) and note (with text) share identical sizing + resize + delete behaviors.
// Differentiation: nodeKind === 'note' => text editing/presentation; nodeKind === 'rect' => empty container.

const RECT_MIN = 40; // min for rectangles
const NOTE_MIN_W = 100; // min for notes width
const NOTE_MIN_H = 70;  // min for notes height

export const AnnotationNode: React.FC<{ id: string; selected?: boolean }> = ({ id, selected }) => {
  const { nodes, deleteNode, activeTool, editingNodeId, startEditing, stopEditing, updateNodeText, resizeRectangle, resizeRectangleEphemeral } = useGraph() as any;
  const updateNodeInternals = useUpdateNodeInternals();
  const current = nodes.find((n: any) => n.id === id) || {};
  const kind: 'note' | 'rect' = current.nodeKind === 'note' ? 'note' : 'rect';
  const isNote = kind === 'note';
  const editing = editingNodeId === id;

  const width = current.width || (isNote ? 140 : 120);
  const height = current.height || (isNote ? 90 : 60);

  // Resizer visibility: show when selected and not in text edit mode.
  const showHandles = !!selected && !editing;

  // Text state (notes only)
  const [draft, setDraft] = React.useState<string>(current.text || '');
  React.useEffect(() => { if (!editing) setDraft(current.text || ''); }, [editing, current.text]);

  const gestureStartRef = React.useRef<{ w: number; h: number; x: number; y: number } | null>(null);
  const onResizeStart = () => { gestureStartRef.current = { w: width, h: height, x: current.x, y: current.y }; };
  const onResize = (_: any, params: { width: number; height: number; x?: number; y?: number }) => {
    const start = gestureStartRef.current || { w: width, h: height, x: current.x, y: current.y };
    const minW = isNote ? NOTE_MIN_W : RECT_MIN;
    const minH = isNote ? NOTE_MIN_H : RECT_MIN;
    const liveW = Math.max(minW, Math.round(params.width));
    const liveH = Math.max(minH, Math.round(params.height));
    const liveX = params.x !== undefined ? Math.round(params.x) : current.x;
    const liveY = params.y !== undefined ? Math.round(params.y) : current.y;
    if (liveW === start.w && liveH === start.h && liveX === start.x && liveY === start.y) return;
    resizeRectangleEphemeral(id, liveW, liveH, liveX, liveY);
  };
  const onResizeEnd = (_: any, params: { width: number; height: number; x?: number; y?: number }) => {
    const start = gestureStartRef.current || { w: width, h: height, x: current.x, y: current.y };
    const minW = isNote ? NOTE_MIN_W : RECT_MIN;
    const minH = isNote ? NOTE_MIN_H : RECT_MIN;
    const nextW = Math.max(minW, Math.round(params.width));
    const nextH = Math.max(minH, Math.round(params.height));
    const nextX = params.x !== undefined ? Math.round(params.x) : current.x;
    const nextY = params.y !== undefined ? Math.round(params.y) : current.y;
    if (nextW === start.w && nextH === start.h && nextX === start.x && nextY === start.y) return;
    resizeRectangle(id, nextW, nextH, { prevWidth: start.w, prevHeight: start.h, prevX: start.x, prevY: start.y, newX: nextX, newY: nextY });
    gestureStartRef.current = null;
    requestAnimationFrame(() => updateNodeInternals(id));
  };

  const commitText = React.useCallback(() => {
    if (!isNote) return;
    if (draft !== current.text) updateNodeText(id, draft.slice(0,255));
    stopEditing();
  }, [draft, current.text, updateNodeText, id, isNote, stopEditing]);

  const cancelText = React.useCallback(() => {
    if (!isNote) return;
    setDraft(current.text || '');
    stopEditing();
  }, [current.text, isNote, stopEditing]);

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); commitText(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelText(); }
  }

  const ariaLabel = isNote ? (current.text ? `note: ${current.text.split('\n')[0].slice(0,40)}` : 'note') : 'rectangle';

  return (
    <div
      tabIndex={0}
      aria-label={ariaLabel}
      onDoubleClick={(e) => { if (isNote) { e.stopPropagation(); if (!editing) startEditing(id); } }}
      style={{
        width,
        height,
        background: current.bgColor || (isNote ? 'var(--mf-note-bg, #2d323f)' : 'var(--mf-rect-bg, #1e222b)'),
        border: selected ? '2px solid var(--mf-node-border-selected)' : '2px solid #353b47',
        boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: isNote ? (current.textColor || 'var(--mf-note-fg, #fff)') : 'var(--mf-rect-fg, #aaa)',
        userSelect: isNote ? (editing ? 'text' : 'none') : 'none',
        position: 'relative',
        padding: isNote ? 8 : 0,
        overflow: 'hidden'
      }}
    >
      {selected && !editing && (
        <button
          type="button"
          aria-label={isNote ? 'Delete note' : 'Delete rectangle'}
          onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
          style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '1px solid var(--mf-node-border, #444)',
            background: current.bgColor || (isNote ? 'var(--mf-note-bg, #2d323f)' : 'var(--mf-rect-bg, #1e222b)'),
            color: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px #000',
            zIndex: 20
          }}
        >×</button>
      )}
      {isNote && (
        editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0,255))}
            onKeyDown={onKey}
            onBlur={commitText}
            style={{
              background: 'transparent',
              color: 'inherit',
              border: 'none',
              outline: 'none',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              padding: 0,
              margin: 0,
              resize: 'none',
              overflow: 'auto',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: '16px'
            }}
          />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', width: '100%' }}>{current.text || 'Note'}</span>
        )
      )}
      {showHandles && (
        <NodeResizer
          isVisible
          minWidth={isNote ? NOTE_MIN_W : RECT_MIN}
          minHeight={isNote ? NOTE_MIN_H : RECT_MIN}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
          handleStyle={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: 'var(--mf-handle-source)',
            border: '1px solid #000'
          }}
          lineStyle={{ borderColor: 'var(--mf-node-border-selected)', borderWidth: 1, opacity: 0.4 }}
        />
      )}
    </div>
  );
};
