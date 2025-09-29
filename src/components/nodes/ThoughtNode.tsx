import React, { useState, useRef, useEffect } from 'react';
import { ariaNodeLabel, focusClass } from '../../lib/a11y';
import { useGraph } from '../../state/graph-store';

interface Props { id: string; text: string; selected?: boolean; }
export const ThoughtNode: React.FC<Props> = ({ id, text, selected }) => {
  const { updateNodeText, editingNodeId, startEditing, stopEditing } = useGraph();
  const editing = editingNodeId === id;
  const [draft, setDraft] = useState(text);
  const inputRef = useRef<HTMLInputElement|null>(null);

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.setSelectionRange(draft.length, draft.length); }}, [editing, draft.length]);
  useEffect(() => { if (!editing) setDraft(text); }, [text, editing]);

  function commit() {
    if (draft !== text) updateNodeText(id, draft);
    stopEditing();
  }
  function cancel() { setDraft(text); stopEditing(); }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
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
        padding: 8,
        background: selected ? '#22242a' : '#1b1b1f',
        border: selected ? '2px solid var(--color-accent)' : '1px solid #2a2a30',
        boxShadow: selected ? '0 0 0 3px rgba(79,157,255,0.35)' : 'none',
        transition: 'background .15s var(--ease-standard), border .15s var(--ease-standard), box-shadow .15s var(--ease-standard)',
        borderRadius: 6,
        minWidth: 120,
        cursor: 'text',
        userSelect: 'none'
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value.slice(0,255))}
          onBlur={commit}
          onKeyDown={onKey}
          aria-label="Edit thought text"
          style={{ width: '100%', background:'transparent', color:'#fff', border:'none', outline:'none' }}
        />
      ) : (
        <span>{text || 'New Thought'}</span>
      )}
    </div>
  );
};
