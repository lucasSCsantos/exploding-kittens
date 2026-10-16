# 01: Project scaffold

**What to build:** A buildable, empty TypeScript project with the agreed single-package structure (`src/engine`, `src/server`, `src/client`), ready for the engine and UI work to land on top of it. No game logic yet.

**Blocked by:** None (can start immediately)

**Status:** done (commit c94ba3e)

- [x] `npm init` done; dependencies installed: `typescript`, `vite`, `react`, `react-dom`, `express`, `socket.io`, `socket.io-client`, `zustand`, `motion`, `howler`, `tailwindcss`, `vitest`, `tsx`, `concurrently`, and dev types
- [x] Folder structure created: `src/engine/`, `src/server/`, `src/client/{table,overlays,assets}`
- [x] `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, Tailwind config in place
- [x] `package.json` scripts match the dev guide: `dev`, `build`, `start`, `test`
- [x] Placeholder `index.html`, `src/client/main.tsx`, `src/server/index.ts` (server serves a minimal static page)
- [x] `.gitignore` covers `node_modules`, `dist`, `.env` (also added `.claude/`, a local harness artifact)
- [x] `npm run dev` starts both Vite and the Node server without errors
- [x] `npm run build && npm start` serves the placeholder page from the single Node process

## Comments

Code review (Standards + Spec) caught three issues before commit, all fixed:
- `dist/server/server/index.js` double-nesting (confusing output path) → flattened `tsconfig.server.json`'s `outDir` to `dist`, so the server now builds to `dist/server/index.js` matching the dev guide exactly.
- Premature `/socket.io` dev-proxy in `vite.config.ts` (scope creep — no Socket.IO code exists yet) → removed; will be added in ticket 12 when the server actually uses Socket.IO.
- No explicit Tailwind config file (Tailwind v4 doesn't strictly need one, but the ticket asked for it) → added `tailwind.config.ts` with explicit `content` globs.
