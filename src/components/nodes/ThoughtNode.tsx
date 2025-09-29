import React, { useState, useRef, useEffect } from 'react';
import { ariaNodeLabel, focusClass } from '../../lib/a11y';
import { useGraph } from '../../state/graph-store';

interface Props { id: string; text: string; }
export const ThoughtNode: React.FC<Props> = ({ id, text }) => {
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
      style={{ padding: 8, background: '#1b1b1f', border: '1px solid #2a2a30', borderRadius: 6, minWidth: 120, cursor: 'text', userSelect: 'none' }}
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
