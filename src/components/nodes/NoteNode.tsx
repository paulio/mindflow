import React from 'react';
import { NodeResizer, useUpdateNodeInternals } from 'reactflow';
import { useGraph } from '../../state/graph-store';

interface Props { id: string; text: string; selected?: boolean; }

const MIN_W = 100;
const MIN_H = 70;

export const NoteNode: React.FC<Props> = ({ id, text, selected }) => {
	const { deleteNode, nodes, resizeRectangle, resizeRectangleEphemeral, editingNodeId, startEditing, stopEditing, updateNodeText } = useGraph() as any;
	const updateNodeInternals = useUpdateNodeInternals();
	const current = nodes.find((n: any) => n.id === id) || {};
	const width = current.width || 140;
	const height = current.height || 90;
		const hAlign: 'left'|'center'|'right' = current.textAlign || 'center';
		const vAlign: 'top'|'middle'|'bottom' = current.textVAlign || 'middle';
	const editing = editingNodeId === id;
	const [draft, setDraft] = React.useState(text);
	React.useEffect(() => { if (!editing) setDraft(text); }, [text, editing]);
	const showHandles = !!selected && !editing;
	const gestureStartRef = React.useRef<{ w: number; h: number; x: number; y: number } | null>(null);
	const onResizeStart = () => { gestureStartRef.current = { w: width, h: height, x: current.x, y: current.y }; };
	const onResize = (_: any, params: { width: number; height: number; x?: number; y?: number }) => {
		const start = gestureStartRef.current || { w: width, h: height, x: current.x, y: current.y };
		const liveW = Math.max(MIN_W, Math.round(params.width));
		const liveH = Math.max(MIN_H, Math.round(params.height));
		const liveX = params.x !== undefined ? Math.round(params.x) : current.x;
		const liveY = params.y !== undefined ? Math.round(params.y) : current.y;
		if (liveW === start.w && liveH === start.h && liveX === start.x && liveY === start.y) return;
		resizeRectangleEphemeral(id, liveW, liveH, liveX, liveY);
	};
	const onResizeEnd = (_: any, params: { width: number; height: number; x?: number; y?: number }) => {
		const start = gestureStartRef.current || { w: width, h: height, x: current.x, y: current.y };
		const nextW = Math.max(MIN_W, Math.round(params.width));
		const nextH = Math.max(MIN_H, Math.round(params.height));
		const nextX = params.x !== undefined ? Math.round(params.x) : current.x;
		const nextY = params.y !== undefined ? Math.round(params.y) : current.y;
		if (nextW === start.w && nextH === start.h && nextX === start.x && nextY === start.y) return;
		resizeRectangle(id, nextW, nextH, { prevWidth: start.w, prevHeight: start.h, prevX: start.x, prevY: start.y, newX: nextX, newY: nextY });
		gestureStartRef.current = null;
		requestAnimationFrame(() => updateNodeInternals(id));
	};
	const commit = () => { if (draft !== text) updateNodeText(id, draft.slice(0,255)); stopEditing(); };
	const cancel = () => { setDraft(text); stopEditing(); };
	function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); commit(); }
		else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
	}
	return (
		<div
			tabIndex={0}
			aria-label={text ? `note: ${text.split('\n')[0].slice(0,40)}` : 'note'}
			onDoubleClick={(e) => { e.stopPropagation(); if (!editing) startEditing(id); }}
							style={{
						width,
						height,
						background: current.bgColor || 'var(--mf-note-bg, #2d323f)',
						color: current.textColor || 'var(--mf-note-fg, #fff)',
						border: selected ? '2px solid var(--mf-node-border-selected)' : '2px solid #3b4252',
						boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
						borderRadius: 6, // match rectangle corner radius
						minWidth: MIN_W,
						minHeight: MIN_H,
						padding: 8,
						fontSize: 13,
						lineHeight: '18px',
						fontFamily: 'var(--font-stack, system-ui, sans-serif)',
						cursor: 'text',
						position: 'relative',
						userSelect: editing ? 'text' : 'none',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center',
								alignItems: 'stretch',
						overflow: 'visible' // allow delete button to protrude like rectangle
					}}
		>
			{editing ? (
				<textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value.slice(0,255))}
					onKeyDown={onKey}
					onBlur={commit}
					style={{
						background: 'transparent',
						color: 'inherit',
						border: 'none',
						outline: 'none',
						width: '100%',
						height: '100%',
						resize: 'none',
						overflow: 'auto',
						fontFamily: 'inherit',
						fontSize: 'inherit',
						lineHeight: 'inherit'
					}}
				/>
			) : (
						<span style={{ whiteSpace: 'pre-wrap', width: '100%', textAlign: hAlign }}>{text || 'Note'}</span>
			)}
									{selected && !editing && (
				<button
					type="button"
					aria-label="Delete note"
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
						background: 'var(--mf-note-bg, #2d323f)',
						color: 'var(--mf-note-fg, #fff)',
						fontSize: 14,
						fontWeight: 600,
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
								boxShadow: '0 0 0 1px #000',
										zIndex: 20 // consistent with rectangle
					}}
				>×</button>
			)}
			{showHandles && (
				<NodeResizer
					isVisible
					minWidth={MIN_W}
					minHeight={MIN_H}
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
