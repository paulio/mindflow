import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ariaNodeLabel, focusClass } from '../../lib/a11y';
import { useGraph } from '../../state/graph-store';
// @ts-ignore temporary resolution quirk: module exists at runtime
import { resolveNodeBackground, resolveAccentColour } from '../../lib/background-precedence';

interface Props { id: string; text: string; selected?: boolean; }
export const ThoughtNode: React.FC<Props> = ({ id, text, selected }) => {
  const { updateNodeText, editingNodeId, startEditing, stopEditing, deleteNode, nodes } = useGraph() as any;
  // Root detection: earliest created node id among all nodes
  const rootId = React.useMemo(() => {
    if (!nodes?.length) return null;
    let earliest = nodes[0];
    for (const n of nodes) { if (n.created < earliest.created) earliest = n; }
    return earliest.id;
  }, [nodes]);
  const isRoot = id === rootId;
  const editing = editingNodeId === id;
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement|null>(null);

  // When entering edit mode focus and place caret at end.
  useEffect(() => {
    if (editing) {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        const len = draft.length;
        ta.setSelectionRange(len, len);
        autoResize();
      }
    }
  }, [editing]);
  // Sync incoming text when not editing
  useEffect(() => { if (!editing) setDraft(text); }, [text, editing]);

  const commit = useCallback(() => {
    if (draft !== text) updateNodeText(id, draft.slice(0,255));
    stopEditing();
  }, [draft, text, id, updateNodeText, stopEditing]);
  const cancel = useCallback(() => { setDraft(text); stopEditing(); }, [text, stopEditing]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 300) + 'px'; // soft max height 300px
  }
  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
    // Shift+Enter: allow newline default (handled by browser) then resize next frame
    requestAnimationFrame(autoResize);
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value.slice(0,255); // enforce limit including newlines
    setDraft(next);
    requestAnimationFrame(autoResize);
  }

  const record = React.useMemo(() => nodes.find((n: any) => n.id === id), [nodes, id]);
  const borderColour = React.useMemo(() => resolveAccentColour(record), [record]);
  const background = React.useMemo(() => resolveNodeBackground(record), [record]);
  return (
    <div
      className={focusClass()}
      tabIndex={0}
      aria-label={ariaNodeLabel(text, id)}
      role="button"
      onDoubleClickCapture={(e) => { // capture to run before ReactFlow zoom / selection logic
        e.stopPropagation();
        if (!editing) startEditing(id);
      }}
      style={{
        // Outer frame: shows override/default border colour (the "green" border in screenshot)
        padding: 0,
        background: 'transparent',
  border: `${selected ? 'var(--mf-node-border-width-selected)' : 'var(--mf-node-border-width)'} solid var(--mf-node-border)`,
        // Keep existing selection box-shadow for visual consistency (can be removed if outline alone is desired)
        boxShadow: selected ? 'var(--mf-selection-outline)' : 'none',
        transition: 'background .15s var(--ease-standard), border .15s var(--ease-standard), box-shadow .15s var(--ease-standard)',
        borderRadius: 6,
        minWidth: 100,
        cursor: 'text',
        userSelect: 'none',
        maxWidth: 240,
        whiteSpace: 'pre-wrap',
        fontSize: 'var(--font-size-node)',
        lineHeight: 'var(--line-height-node)',
        fontWeight: 400,
        color: 'var(--mf-node-text)',
        position: 'relative', // needed so floating delete button positions correctly
        overflow: 'visible',
        // Dynamic focus ring colour (picked up by .focus-ring outline style)
        // Type assertion to satisfy TS for custom CSS variable property.
        '--color-focus-ring': borderColour
  // Delete button will float fully outside; no need to adjust paddingTop
      } as React.CSSProperties}
    >
      {/* Inner body now shows hierarchical/override colour as its background unless user-specified */}
      <div
        style={{
          background,
          padding: 4,
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.15)', // subtle inner stroke (the previous border - "red" in screenshot)
          boxSizing: 'border-box'
        }}
        onDoubleClick={(e) => { e.stopPropagation(); if (!editing) startEditing(id); }}
      >
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={onChange}
          onBlur={commit}
          onKeyDown={onKey}
          aria-label="Edit thought text"
          rows={1}
          style={{ width: '100%', resize: 'none', overflow: 'hidden', background:'var(--mf-editor-bg)', color:'var(--mf-editor-text)', border:'none', outline:'none', fontFamily:'inherit', fontSize:'var(--font-size-node)', lineHeight:'var(--line-height-node)', textAlign:'center' }}
        />
      ) : (
        <span style={{ whiteSpace:'pre-wrap', display:'block', textAlign:'center' }}>{text || 'New Thought'}</span>
      )}
      </div>
      {selected && !editing && (
        <button
          type="button"
          aria-label={isRoot ? 'Root node cannot be deleted' : 'Delete node'}
          disabled={isRoot}
          onClick={(e) => { e.stopPropagation(); if (!isRoot) deleteNode(id); }}
          style={{
            position: 'absolute',
            top: -28, // float above node, outside content flow
            left: 'calc(75% - 11px)', // center of button at 75% width
            transform: 'none',
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '1px solid ' + borderColour,
            background: isRoot ? 'rgba(255,255,255,0.15)' : 'var(--mf-node-bg)',
            color: 'var(--mf-node-text)',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1,
            cursor: isRoot ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px #000',
            zIndex: 999, // ensure above edges & other overlays
            opacity: isRoot ? 0.6 : 1
          }}
        >×</button>
      )}
    </div>
  );
};
