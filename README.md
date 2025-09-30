# Mindflow

Mindflow is an experimental graph-based thinking and note spatialization tool. It lets you create and connect "thought" nodes, plus lightweight annotations (rectangles and sticky notes) with resizing, alignment, layering, autosave, and undo/redo.

> Status: Early prototype (work-in-progress). APIs, data model, and UI are subject to change.

## Features (Current)
- Thought nodes with automatic root + child structure
- Annotation tools: Rectangle + Note (sticky note) with resize handles (all directions)
- Note text horizontal & vertical alignment controls
- Z-order controls (Front / Behind) for annotations
- Undo / Redo stack with ephemeral vs committed resize operations
- Autosave to IndexedDB with recovery on reload
- Export as PNG or Markdown (graph snapshot / outline)
- Accessible icon-based toolbar and undo bar
- Basic theming support

## Tech Stack
- React 19 + TypeScript
- Vite 5 for dev/build
- React Flow for graph canvas + node resizing
- IndexedDB (via `idb` + polyfill in tests)
- Vitest + Testing Library + Playwright for unit, contract, integration, and accessibility tests
- ESLint / Prettier for code quality

## Quick Start
### 1. Prerequisites
- Node.js 18.x or later (LTS recommended) installed.
  - Windows/macOS: https://nodejs.org
- A package manager: npm (bundled with Node). Yarn or pnpm should work but only npm is tested.

Check versions:
```bash
node -v
npm -v
```
You should see Node >= 18 and npm >= 9.

### 2. Clone the Repository
#### Windows (PowerShell)
```powershell
git clone https://github.com/paulio/mindflow.git
cd mindflow
```
#### macOS / Linux (bash/zsh)
```bash
git clone https://github.com/paulio/mindflow.git
cd mindflow
```

### 3. Install Dependencies
Use npm (ensures lock resolution consistent with scripts):
#### Windows (PowerShell)
```powershell
npm install
```
#### macOS / Linux
```bash
npm install
```

### 4. Run the Dev Server
This starts Vite with hot module reload.
#### Windows (PowerShell)
```powershell
npm run dev
```
#### macOS / Linux
```bash
npm run dev
```
Then open the printed local URL (typically http://localhost:5173/).

### 5. Build for Production
Creates a production bundle in `dist/`.
```bash
npm run build
```
Preview the built output:
```bash
npm run preview
```

### 6. Run Tests
- Full interactive (watch) unit + integration tests:
```bash
npm test
```
- CI (non-watch) mode:
```bash
npm run test:ci
```
- Playwright (UI / a11y) tests (ensure deps installed first):
```bash
npx playwright install  # first time only
npm run test:ui
```

### 7. Lint & Type Check
```bash
npm run lint
npm run typecheck
```

## Platform Notes
### Windows
- Use PowerShell or Git Bash. (PowerShell examples provided.)
- If you encounter ENOSPC or file watcher limits, enable polling via setting the env var: `$env:CHOKIDAR_USEPOLLING=1` before running dev.

### macOS
- If using macOS with Apple Silicon (M1/M2+), native Node builds are fine; no Rosetta needed.
- Grant your terminal Full Disk Access if you see file watcher permission issues.

### Linux (Not explicitly requested but supported)
- Ensure inotify watch limits are sufficient: `sudo sysctl fs.inotify.max_user_watches=524288` (optional).

## Data Persistence
Mindflow stores graph data in your browser's IndexedDB. Clearing site data in dev tools will reset local graphs. Export regularly if you want backups.

## Project Structure (Highlights)
```
src/
  components/        React components (graph canvas, nodes, UI panels)
  state/             Zustand-like store (graph-store)
  hooks/             Custom hooks (autosave, undo/redo)
  lib/               Domain + persistence + metrics utilities
  pages/             Top-level app entry (App.tsx)
  styles/            Global CSS + design tokens
specs/               Product / feature specs & contracts
tests/               Vitest + Playwright tests (unit, integration, contract)
```

## Common Tasks
| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Run all tests | `npm test` |
| Run UI (Playwright) tests | `npm run test:ui` |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` |
| Build production | `npm run build` |
| Preview build | `npm run preview` |

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Port already in use | Set a different port: `npm run dev -- --port 5174` |
| Node version errors | Upgrade Node to >= 18 LTS |
| Playwright browser missing | Run `npx playwright install` |
| Type errors after dep change | Clear cache: delete `node_modules` + `package-lock.json`, reinstall |
| Missing styles | Ensure `src/styles/globals.css` is imported in `index.tsx` |

## Contributing (Early Stage)
1. Fork & branch from `main` (feature branches like `feat/...`).
2. Run lint + tests before PR.
3. Keep PRs small & focused (<= ~300 loc diff ideal).

## Roadmap (Short-Term Ideas)
- Keyboard shortcuts for alignment & deletion
- Improved test coverage for annotation resizing & alignment
- Performance tuning (resize throttling)
- Multi-select & group operations
- Export to JSON schema versioned format

## License
Released under the MIT License. See [`LICENSE`](./LICENSE) for full text.

---
Feel free to file issues or suggestions once public. Enjoy mapping your thoughts!
