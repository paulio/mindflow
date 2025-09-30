import React from 'react';
import { NodeResizer, useUpdateNodeInternals } from 'reactflow';
import { useGraph } from '../../state/graph-store';

const MIN_SIZE = 40;

export const RectNode: React.FC<{ id: string; selected?: boolean }> = ({ selected, id }) => {
	const { deleteNode, nodes, resizeRectangle, resizeRectangleEphemeral } = useGraph() as any;
	const updateNodeInternals = useUpdateNodeInternals();
	const current = nodes.find((n: any) => n.id === id) || {};
	const width = current.width || 120;
	const height = current.height || 60;
	const showHandles = !!selected;
	const gestureStartRef = React.useRef<{ w: number; h: number; x: number; y: number } | null>(null);
	const onResizeStart = () => { gestureStartRef.current = { w: width, h: height, x: current.x, y: current.y }; };
	const onResize = (_: any, params: { width: number; height: number; x?: number; y?: number }) => {
		const start = gestureStartRef.current || { w: width, h: height, x: current.x, y: current.y };
		const liveW = Math.max(MIN_SIZE, Math.round(params.width));
		const liveH = Math.max(MIN_SIZE, Math.round(params.height));
		const liveX = params.x !== undefined ? Math.round(params.x) : current.x;
		const liveY = params.y !== undefined ? Math.round(params.y) : current.y;
		if (liveW === start.w && liveH === start.h && liveX === start.x && liveY === start.y) return;
		resizeRectangleEphemeral(id, liveW, liveH, liveX, liveY);
	};
	const onResizeEnd = (_: any, params: { width: number; height: number; x?: number; y?: number }) => {
		const start = gestureStartRef.current || { w: width, h: height, x: current.x, y: current.y };
		const nextW = Math.max(MIN_SIZE, Math.round(params.width));
		const nextH = Math.max(MIN_SIZE, Math.round(params.height));
		const nextX = params.x !== undefined ? Math.round(params.x) : current.x;
		const nextY = params.y !== undefined ? Math.round(params.y) : current.y;
		if (nextW === start.w && nextH === start.h && nextX === start.x && nextY === start.y) return;
		resizeRectangle(id, nextW, nextH, { prevWidth: start.w, prevHeight: start.h, prevX: start.x, prevY: start.y, newX: nextX, newY: nextY });
		gestureStartRef.current = null;
		requestAnimationFrame(() => updateNodeInternals(id));
	};
	return (
		<div
			tabIndex={0}
			aria-label="rectangle"
			style={{
				width,
				height,
				background: current.bgColor || 'var(--mf-rect-bg, #1e222b)',
				border: selected ? '2px solid var(--mf-node-border-selected)' : '2px solid #353b47',
				boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
				borderRadius: 6,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 12,
				color: 'var(--mf-rect-fg, #aaa)',
				userSelect: 'none',
				position: 'relative'
			}}
		>
			{selected && (
				<button
					type="button"
					aria-label="Delete rectangle"
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
						background: 'var(--mf-rect-bg, #1e222b)',
						color: 'var(--mf-rect-fg, #aaa)',
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
			{showHandles && (
				<NodeResizer
					isVisible
					minWidth={MIN_SIZE}
					minHeight={MIN_SIZE}
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
