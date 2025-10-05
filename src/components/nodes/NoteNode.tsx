import React from 'react';
import { NodeResizer, useUpdateNodeInternals } from 'reactflow';
import { useGraph } from '../../state/graph-store';
import { resolveNodeBackground, resolveAccentColour } from '../../lib/background-precedence';

interface Props { id: string; text: string; selected?: boolean; }

const MIN_W = 48;
const MIN_H = 28;

function applyOpacity(hex: string, alpha: number): string {
	if (hex.startsWith('rgba') || hex.startsWith('hsla')) return hex; // assume already has alpha
	const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
	if (!m) return hex;
	const int = parseInt(m[1], 16);
	const r = (int >> 16) & 255;
	const g = (int >> 8) & 255;
	const b = int & 255;
	return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha))})`;
}

export const NoteNode: React.FC<Props> = ({ id, text, selected }) => {
	const { deleteNode, nodes, resizeRectangle, resizeRectangleEphemeral, editingNodeId, startEditing, stopEditing, updateNodeText } = useGraph() as any;
	const updateNodeInternals = useUpdateNodeInternals();
	const current = nodes.find((n: any) => n.id === id) || {};
	const width = current.width || 140;
	const height = current.height || 90;
	const fontFamily = current.fontFamily || 'Inter';
	const fontSize = current.fontSize || 14;
	const fontWeight = current.fontWeight || 'normal';
	const italic = !!current.italic;
	const highlight = !!current.highlight;
	const backgroundOpacity = typeof current.backgroundOpacity === 'number' ? current.backgroundOpacity : 100;
	const overflowMode: 'truncate'|'auto-resize'|'scroll' = current.overflowMode || 'auto-resize';
	const hideShapeWhenUnselected = !!current.hideShapeWhenUnselected;
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
	// Derived colors / styles
	const mappedColour = React.useMemo(() => resolveAccentColour(current, '#3b4252'), [current]);
	const baseBg = resolveNodeBackground(current, mappedColour || 'var(--mf-note-bg, #2d323f)');
	const textColor = current.textColor || 'var(--mf-note-fg, #fff)';
	const effectiveBg = hideShapeWhenUnselected && !selected ? 'transparent' : applyOpacity(baseBg, backgroundOpacity / 100);
	const borderVisible = !hideShapeWhenUnselected || selected;
	const contentRef = React.useRef<HTMLSpanElement|null>(null);
	const containerRef = React.useRef<HTMLDivElement|null>(null);
	const [isOverflowing, setIsOverflowing] = React.useState(false);

	// Text auto-fit (shrink/grow font within bounds) instead of container growth when overflowMode='auto-resize'
	const MIN_FONT = 8;
	React.useLayoutEffect(() => {
		const container = containerRef.current;
		const content = contentRef.current;
		if (!container || !content) return;
		// Reset content font size to base before measuring
		content.style.fontSize = fontSize + 'px';
		const availableH = container.clientHeight; // fixed container height
		let currentSize = fontSize;
		if (overflowMode === 'auto-resize') {
			// Shrink phase
			let safety = 100; // guard against infinite loop
			while (safety-- > 0 && currentSize > MIN_FONT && content.scrollHeight > availableH + 1) {
				currentSize -= 1;
				content.style.fontSize = currentSize + 'px';
			}
			// Grow phase (if there is room and user deleted text) up to original font size
			while (safety-- > 0 && currentSize < fontSize && content.scrollHeight <= availableH - 4) {
				currentSize += 1;
				content.style.fontSize = currentSize + 'px';
				if (content.scrollHeight > availableH + 1) { // overshoot, step back
					currentSize -= 1;
					content.style.fontSize = currentSize + 'px';
					break;
				}
			}
		}
		// Overflow detection (true if still overflowing even at min font or non-auto modes)
		const overflow = content.scrollHeight > availableH + 1;
		if (overflow !== isOverflowing) setIsOverflowing(overflow);
	}, [text, draft, overflowMode, width, height, fontSize, italic, fontWeight, isOverflowing]);

	const overflowStyle: React.CSSProperties = (() => {
		if (overflowMode === 'scroll') return { overflow: 'auto' };
		if (overflowMode === 'truncate') return { overflow: 'hidden', position: 'relative' };
		return { overflow: 'hidden' }; // auto-resize attempts to grow, else hidden
	})();

	const truncated = overflowMode === 'truncate' && isOverflowing;
// mappedColour resolved above

	return (
		<div
			ref={containerRef}
			tabIndex={0}
			aria-label={text ? `note: ${text.split('\n')[0].slice(0,40)}` : 'note'}
			onDoubleClick={(e) => { e.stopPropagation(); if (!editing) startEditing(id); }}
			style={{
				width,
				height,
				background: effectiveBg || mappedColour,
				color: textColor,
				// Use override/default border colour consistently; selection emphasis can come from boxShadow.
				border: borderVisible ? (selected ? `2px solid ${mappedColour}` : `1px solid ${mappedColour}`) : '1px solid transparent',
				boxShadow: selected ? '0 0 0 1px var(--mf-node-border-selected)' : '0 1px 2px rgba(0,0,0,0.45)',
				borderRadius: 6,
				minWidth: MIN_W,
				minHeight: MIN_H,
				padding: 6,
				fontSize,
				lineHeight: '1.35',
				fontFamily,
				fontWeight: fontWeight as any,
				fontStyle: italic ? 'italic' : 'normal',
				cursor: 'text',
				position: 'relative',
				userSelect: editing ? 'text' : 'none',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center',
				alignItems: 'stretch',
				...overflowStyle
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
						boxSizing: 'border-box',
						padding: 0,
						margin: 0,
						resize: 'none',
						overflow: overflowMode === 'scroll' ? 'auto' : 'hidden',
						fontFamily: 'inherit',
						fontSize: 'inherit',
						lineHeight: 'inherit'
					}}
				/>
			) : (
					<>
						<span
							ref={contentRef}
							title={truncated ? text : undefined}
							style={{
								whiteSpace: 'pre-wrap',
								width: '100%',
								textAlign: hAlign,
								background: highlight ? 'rgba(255,235,59,0.35)' : 'transparent',
								position:'relative',
								boxShadow: highlight ? '0 0 0 1px rgba(255,235,59,0.6) inset' : 'none',
								borderRadius: 2
							}}
						>
							{text || 'Note'}
						</span>
							{truncated && (
								<div aria-hidden="true" style={{ position:'absolute', left:0, right:0, bottom:0, height:20, pointerEvents:'none', display:'flex', alignItems:'flex-end', justifyContent:'flex-end', paddingRight:2 }}>
									<div style={{ position:'absolute', inset:0, background:`linear-gradient(to bottom, rgba(0,0,0,0) 0%, ${effectiveBg === 'transparent' ? 'rgba(0,0,0,0.72)' : effectiveBg} 100%)` }} />
									<span style={{
										background: 'linear-gradient(135deg, rgba(0,0,0,0.75), rgba(0,0,0,0.55))',
										color: '#fff',
										padding: '1px 8px 3px',
										fontWeight: 700,
										fontSize: Math.min(fontSize + 2, 24),
										lineHeight: '1',
										borderRadius: 6,
										boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.45)',
										letterSpacing: 1,
										textShadow: '0 1px 2px rgba(0,0,0,0.8)'
									}}>…</span>
								</div>
							)}
					</>
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
