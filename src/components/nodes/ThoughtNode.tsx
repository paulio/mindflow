import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ariaNodeLabel, focusClass } from '../../lib/a11y';
import { useGraph } from '../../state/graph-store';

interface Props { id: string; text: string; selected?: boolean; }
export const ThoughtNode: React.FC<Props> = ({ id, text, selected }) => {
  const { updateNodeText, editingNodeId, startEditing, stopEditing } = useGraph();
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
        padding: 6,
        background: selected ? '#22242a' : '#1b1b1f',
        border: selected ? '2px solid var(--color-accent)' : '1px solid #2a2a30',
        boxShadow: selected ? '0 0 0 3px rgba(79,157,255,0.35)' : 'none',
        transition: 'background .15s var(--ease-standard), border .15s var(--ease-standard), box-shadow .15s var(--ease-standard)',
        borderRadius: 6,
        minWidth: 120,
        cursor: 'text',
        userSelect: 'none',
        maxWidth: 260,
        whiteSpace: 'pre-wrap',
        fontSize: 'var(--font-size-node)',
        lineHeight: 'var(--line-height-node)',
        fontWeight: 400,
        color: 'var(--color-text)'
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
          style={{ width: '100%', resize: 'none', overflow: 'hidden', background:'transparent', color:'var(--color-text)', border:'none', outline:'none', fontFamily:'inherit', fontSize:'var(--font-size-node)', lineHeight:'var(--line-height-node)', textAlign:'center' }}
        />
      ) : (
        <span style={{ whiteSpace:'pre-wrap', display:'block', textAlign:'center' }}>{text || 'New Thought'}</span>
      )}
    </div>
  );
};
