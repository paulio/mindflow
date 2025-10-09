# mindflow Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-04

## Active Technologies
- TypeScript 5.x with React 18 + React Flow, Vite toolchain, JSZip (new dependency for ZIP creation), IndexedDB helpers (idb) (008-on-the-map)
- TypeScript 5.x with React 18 + React Flow 11, Vite 7, Zustand graph store, JSZip, `idb` (009-the-home-library)
- Browser IndexedDB (graphs, references, thumbnail blobs) (009-the-home-library)
- TypeScript 5.x with React 18 + React Flow 11, Zustand graph store, Vite 7 toolchain, JSZip, `idb`, Azure Static Web Apps auth (010-host-the-application)
- Browser IndexedDB (existing client database) with per-user map partitions (010-host-the-application)

## Project Structure
```
src/
├── components/
├── hooks/
├── lib/
├── pages/
└── state/

tests/
├── contract/
├── integration/
└── unit/
```

## Commands
npm test; npm run lint

## Code Style
TypeScript 5.x with React 18: Follow standard conventions

## Recent Changes
- 010-host-the-application: Added TypeScript 5.x with React 18 + React Flow 11, Zustand graph store, Vite 7 toolchain, JSZip, `idb`, Azure Static Web Apps auth
- 009-the-home-library: Added TypeScript 5.x with React 18 + React Flow 11, Vite 7, Zustand graph store, JSZip, `idb`
- 008-on-the-map: Added TypeScript 5.x with React 18 + React Flow, Vite toolchain, JSZip (new dependency for ZIP creation), IndexedDB helpers (idb)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
