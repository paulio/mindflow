# Quickstart: Interactive Mind-Map Thought Organizer

## 1. Install Dependencies
(After repository root setup; package.json will be added in implementation phase.)
```
npm install
```

## 2. Run Dev Server
```
npm run dev
```
Open http://localhost:5173 (default Vite port).

## 3. Create First Mind-Map
1. Landing screen auto-loads last graph if exists; otherwise click "New Map".
2. Click canvas to create first node or select existing node to reveal NSEW handles.
3. Drag a handle outward >40px and release to spawn a connected node. (Updated from 80px on 2025-10-02.)
4. Type to edit node text (autosave badge shows pending then saved).

## 4. Pan & Zoom
- Drag empty canvas to pan.
- Mouse wheel / trackpad pinch to zoom.

## 5. Undo / Redo
- Use on-screen buttons (planned) next to toolbar. Maintains last 10 actions.

## 6. View Saved Maps
- Open "Maps" panel to list graphs sorted by lastModified.
- Select a map to load; deletion requires confirm dialog.

## 7. Performance Overlay (Dev Only)
- Toggle with ? key (future) to show frame timing + autosave stats (backlog if not MVP).

## 8. Testing Commands
```
npm test            # unit + component (Vitest)
npm run test:ci     # full suite
npm run test:ui     # Playwright integration
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## 9. Data Persistence
- Local IndexedDB stores; no cloud sync.
- Deleting a graph removes nodes/edges associated.

## 10. Accessibility Expectations
- Tab cycles through nodes in spatial order.
- Handles exposed as buttons with aria-label describing direction.

## 11. Known Limitations
- No multi-tab real-time merge.
- No export/import UI in MVP.
- No virtualization for graphs >1000 nodes.

## 12. Validation Checklist
- Create >5 nodes rapidly: no orphan edges.
- Reload page: last map auto-loaded.
- Exceed 255 chars attempt: input blocked gracefully.
- Drag handle <40px: node not created.
- Delete graph: disappears from list.

## 13. Troubleshooting
| Issue | Action |
|-------|--------|
| Autosave banner shows failure | Check browser storage quota; free space or delete older maps |
| Slow pan/zoom with large graph | Disable dev overlay; profile Performance tab |
| Missing nodes after load | Check console for skippedNodes warning |
