# 01: Project scaffold

**What to build:** A buildable, empty TypeScript project with the agreed single-package structure (`src/engine`, `src/server`, `src/client`), ready for the engine and UI work to land on top of it. No game logic yet.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `npm init` done; dependencies installed: `typescript`, `vite`, `react`, `react-dom`, `express`, `socket.io`, `socket.io-client`, `zustand`, `motion`, `howler`, `tailwindcss`, `vitest`, `tsx`, `concurrently`, and dev types
- [ ] Folder structure created: `src/engine/`, `src/server/`, `src/client/{table,overlays,assets}`
- [ ] `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, Tailwind config in place
- [ ] `package.json` scripts match the dev guide: `dev`, `build`, `start`, `test`
- [ ] Placeholder `index.html`, `src/client/main.tsx`, `src/server/index.ts` (server serves a minimal static page)
- [ ] `.gitignore` covers `node_modules`, `dist`, `.env`
- [ ] `npm run dev` starts both Vite and the Node server without errors
- [ ] `npm run build && npm start` serves the placeholder page from the single Node process
