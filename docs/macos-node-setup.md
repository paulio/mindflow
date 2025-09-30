# macOS Node.js Setup & Upgrade Guide

Running an npm (Node.js) based project on macOS can feel harder than it should—especially when the system ships with an outdated or protected Node version (or none at all). This guide gives practical, low-friction ways to install, upgrade, and manage Node.js reliably on macOS (Intel & Apple Silicon), plus troubleshooting tips when things go sideways.

---
## TL;DR (Pick One)
| Approach | Best For | Pros | Cons |
|----------|---------|------|------|
| `nvm` (Node Version Manager) | Flexible multi-version dev | Widely used, .nvmrc support | Slight shell init overhead |
| `fnm` (Fast Node Manager) | Speed + simplicity | Very fast & lightweight | Fewer legacy docs |
| `volta` | Pin per-project toolchain | Zero shell function hacks, fast | No “install from source” option |
| `asdf` + node plugin | Unified multi-runtime mgmt | One tool for Node, Python, Ruby, etc. | Slightly steeper learning |
| Homebrew direct (`brew install node`) | Single latest version | Easy, standard for many devs | Harder to juggle multiple versions |
| Official Installer (.pkg) | One-off quick install | Simple GUI | Hard to manage multiple versions |
| Docker / Dev Container | Avoid touching host | Clean isolation | More resource overhead |

---
## 1. Check Current Environment
```bash
which node
node -v || echo "Node not installed"
which npm
npm -v || echo "npm not installed"
which corepack || echo "corepack not found"
```
If `node -v` shows something like `v10.*` or `v12.*`, you almost certainly want to upgrade.

On Apple Silicon (M1/M2/M3):
```bash
uname -m   # should output arm64
```
If you're in a Rosetta shell (Intel emulation), `arch` may return `i386` or using a different Terminal app. Prefer native arm64 unless you have legacy native modules.

---
## 2. Recommended: Use a Version Manager
### Option A: nvm
```bash
# Install (uses curl)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload your shell profile (choose the one nvm appended to)
source ~/.zshrc  # or ~/.bashrc

# Install and use a modern LTS (e.g. 20.x)
nvm install --lts
nvm use --lts

# Persist default
nvm alias default 'lts/*'

node -v
npm -v
```
Add a project-specific version by creating a `.nvmrc` file at repo root:
```
20
```
Then in the project directory:
```bash
nvm install   # installs 20 if missing
nvm use       # switches to 20
```

### Option B: fnm (Fast Node Manager)
```bash
curl -fsSL https://fnm.vercel.app/install | bash
# Follow post-install instructions to add init lines; then restart shell.

fnm install --lts
fnm default  --lts
fnm use      --lts
node -v
```
`fnm` auto-detects `.node-version` or `.nvmrc`.

### Option C: Volta
Great when you want reproducible per-project toolchain without shell function wrappers.
```bash
curl https://get.volta.sh | bash
source ~/.zshrc  # or restart terminal
volta install node@20
volta install npm@latest  # optional; npm usually bundled
node -v
```
Per-project pinning (creates entries in `package.json` automatically):
```bash
volta pin node@20
volta pin npm@latest
```

### Option D: asdf
```bash
brew install asdf              # or: git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
# Add to shell in ~/.zshrc
# . "$HOME/.asdf/asdf.sh"

asdf plugin-add nodejs https://github.com/asdf-vm/asdf-nodejs.git
bash ~/.asdf/plugins/nodejs/bin/import-release-team-keyring
asdf install nodejs 20.11.1
asdf global nodejs 20.11.1
node -v
```
Create `.tool-versions` file:
```
nodejs 20.11.1
```

---
## 3. Alternative: Homebrew Direct Install
```bash
brew update
brew install node   # installs latest stable
node -v
```
Upgrade later:
```bash
brew upgrade node
```
Caveat: Harder to keep multiple major versions concurrently (you can use `brew extract` or `brew install node@18`, but linking can clash). If you need to test across Node 18 and 20, prefer a version manager.

---
## 4. Official macOS Installer (.pkg)
1. Download from: https://nodejs.org/en/download
2. Pick LTS .pkg (arm64 for Apple Silicon; x64 for Intel).
3. Run installer (may require admin rights).
4. Reopen terminal and verify:
```bash
node -v
```
Removal later is manual: delete `/usr/local/bin/node`, `/usr/local/lib/node_modules`, etc.—another reason to favor version managers.

---
## 5. Corepack & Package Managers
Recent Node (>=16.13) ships `corepack` to manage `pnpm` & `yarn`.
```bash
corepack enable
corepack prepare pnpm@latest --activate
```
For this project (which uses npm scripts) you can stay with npm; but if the repo ever adds a `packageManager` field (e.g. `"packageManager": "pnpm@9.0.0"`) run:
```bash
corepack use pnpm@9.0.0
```

---
## 6. Running the Project (After Node Installed)
From project root:
```bash
npm install    # or: pnpm install / yarn install if repo switches
npm run dev    # starts Vite dev server
```
Open the logged URL (default: http://localhost:5173/)

Production build:
```bash
npm run build
npm run preview
```

Tests:
```bash
npm test       # vitest watch
npm run test:ci
npm run test:ui  # Playwright (first time: npx playwright install)
```

Lint & types:
```bash
npm run lint
npm run typecheck
```

---
## 7. Apple Silicon (arm64) vs Rosetta
Some native Node modules (older versions) may expect x86_64. If you must run under Rosetta:
1. Duplicate Terminal app, rename it (e.g. "Terminal Rosetta").
2. Get Info → "Open using Rosetta".
3. Install a separate x86 Node inside that shell (e.g. `arch -x86_64 nvm install 18`).
4. Keep arm64 as your default dev environment; only use Rosetta when required.

Check architecture of installed Node:
```bash
file "$(which node)"
```
Should show `arm64` for native Apple Silicon.

---
## 8. Fixing Common Problems
| Symptom | Cause | Fix |
|---------|-------|-----|
| `command not found: nvm` | Shell not sourcing profile | Add `export NVM_DIR="$HOME/.nvm"` + source snippet to `~/.zshrc`; restart |
| `node -v` still old | PATH ordering | Echo `$PATH`; ensure manager's bin path appears before `/usr/bin` or old Homebrew path |
| Permissions errors in `npm install` | Using `sudo`, global module confusion | Never use `sudo npm install`; reinstall Node via manager |
| `gyp ERR!` build failures | Missing Xcode tools | `xcode-select --install` |
| Slow installs | Old npm cache | `npm cache verify` or `npm cache clean --force` |
| Segfault on Apple Silicon | Mixed arch modules | Reinstall all deps in clean arm64 shell; ensure no Rosetta-run `node_modules` lingering |
| Playwright browsers missing | First run | `npx playwright install` |
| SSL cert issues | Corporate proxy | Configure `npm config set proxy` / `https-proxy`; possibly `NODE_TLS_REJECT_UNAUTHORIZED=0` (NOT recommended long-term) |

---
## 9. Clean Reset
When environment is corrupted:
```bash
# Inside project
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force
npm install
```
If still broken, try switching Node versions:
```bash
nvm install 20
nvm use 20
npm install
```

---
## 10. Docker (Escape Hatch)
If you *cannot* modify host Node safely, use a container:
```bash
# Create Dockerfile.dev (example)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm","run","dev","--","--host"]
```
Run:
```bash
docker build -t mindflow-dev -f Dockerfile.dev .
docker run -it --rm -p 5173:5173 -v "$PWD":/app mindflow-dev
```
Then open http://localhost:5173/

---
## 11. Keeping Up To Date
- Every quarter: `nvm install --lts --reinstall-packages-from=$(nvm current)` or `volta install node@lts`.
- Remove stale Node versions (nvm): `nvm ls` then `nvm uninstall <version>`.
- Watch Node.js security releases: https://nodejs.org/en/security

---
## 12. Project-Friendly Conventions
Add `.nvmrc` to help contributors:
```
20
```
Add `engines` to `package.json` (example):
```jsonc
{
  // ...
  "engines": {
    "node": ">=20 <21"
  }
}
```
(You can add this later to enforce via CI.)

---
## 13. Quick Decision Flow
1. Need multiple versions? → `nvm` or `fnm`.
2. Want pins + zero shell overhead? → `volta`.
3. Managing many languages? → `asdf`.
4. Just need latest fast? → `brew install node`.
5. Company locked-down Mac? → Docker dev container.

---
## 14. Verification Script (Copy/Paste)
```bash
set -e
printf "\n== Node Info ==\n"
which node || true
node -v || true
printf "\n== npm Info ==\n"
which npm || true
npm -v || true
printf "\n== Corepack ==\n"
which corepack || true
corepack enable || true
printf "\n== Done ==\n"
```
If any version lines are missing or outdated, revisit steps above.

---
## 15. FAQ
**Q: After installing nvm, I still get the old system Node.**  
A: Your login shell might be non-interactive or not sourcing `~/.zshrc`. Add `export NVM_DIR="$HOME/.nvm"` and the official init snippet. Open a new terminal (not a tab) or run `exec $SHELL`.

**Q: Can I keep both Homebrew and nvm Node versions?**  
A: Yes, but make sure nvm's shim directory precedes `/opt/homebrew/bin` (Apple Silicon) or `/usr/local/bin` (Intel) in `PATH`.

**Q: Do I need Rosetta?**  
A: Only if a legacy native module doesn't build under arm64. Try native first.

**Q: Is global `npm install -g` bad?**  
A: Not inherently, but prefer project-local dev dependencies. Version managers keep globals isolated per Node version; Volta pins them per project.

---
## 16. Still Stuck?
Capture diagnostics:
```bash
echo $SHELL
uname -a
which node
node -v
printenv PATH
```
Share these when asking for help.

---
**Happy building!** This document aims to de-risk macOS Node setup so you can focus on shipping features.
