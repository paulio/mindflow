import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ariaNodeLabel, focusClass } from '../../lib/a11y';
import { useGraph } from '../../state/graph-store';

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
        padding: 4,
        background: selected ? 'var(--mf-node-bg-selected)' : 'var(--mf-node-bg)',
        border: `${selected ? 'var(--mf-node-border-width-selected)' : 'var(--mf-node-border-width)'} solid ${selected ? 'var(--mf-node-border-selected)' : 'var(--mf-node-border)'}`,
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
        color: 'var(--mf-node-text)'
      }}
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
      {selected && !editing && (
        <button
          type="button"
          aria-label={isRoot ? 'Root node cannot be deleted' : 'Delete node'}
          disabled={isRoot}
          onClick={(e) => { e.stopPropagation(); if (!isRoot) deleteNode(id); }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '1px solid var(--mf-node-border)',
            background: isRoot ? 'rgba(255,255,255,0.1)' : 'var(--mf-node-bg)',
            color: 'var(--mf-node-text)',
            fontSize: 12,
            cursor: isRoot ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px #000',
            zIndex: 10
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};
