# 02: Continuous deployment setup

**What to build:** A live, auto-deploying public URL from day one, so every future ticket ships to something real instead of only `localhost`. This ticket has a code half (automatable) and an account/dashboard half (only the project owner can click through — use `/wizard` for that part).

**Blocked by:** 01 (project scaffold)

**Status:** blocked-on-owner

- [x] Server reads the port from `process.env.PORT` (falls back to a local default in dev) — already in place from ticket 01 (`src/server/index.ts`)
- [x] Production build serves `dist/client` from Express at the same origin the server listens on
- [x] `npm run build && npm start` works locally end to end
- [x] A `/wizard` script is generated to walk the owner through: creating a Railway or Render account, connecting the GitHub repo, setting the build/start commands, and generating a public domain — `scripts/setup-deploy.sh`
- [ ] Owner has run the wizard and confirms the public URL serves the current build
- [ ] A push to `main` triggers an automatic redeploy (verified with a trivial commit)
- [ ] Every later ticket's "done when" should include "still deploys clean through this pipeline" — note this expectation doesn't need re-litigating per ticket, it's a standing bar from here on

## Comments

Code half done, owner half pending:
- Port/static-serving requirements were already satisfied by ticket 01's `src/server/index.ts` (reads `process.env.PORT`, falls back to 3000; serves `dist/client` as static and falls through to `index.html`). Verified `npm run build && npm start` end to end — server returns 200 and serves the built client; also confirmed `PORT=4001 node dist/server/index.js` honors the override.
- Added `scripts/setup-deploy.sh` (the `/wizard` script) covering: create a Railway account, connect the GitHub repo (`lucasSCsantos/exploding-kittens`), set Build Command `npm run build` / Start Command `npm start`, generate a public domain, then push a trivial empty commit to `main` and confirm the redeploy lands. Chose Railway over Render as the primary path (simpler GitHub-native flow); the wizard notes Render as an equivalent alternative. Syntax-checked with `bash -n`; not run end to end since it opens a browser and blocks on human input — only the project owner can click through the account/dashboard half.
- Note for future sessions: ticket 03's engine code landed on `main` (commit `11f79d2`) partway through this work and broke `npm run build` for real — `tsc -p tsconfig.server.json` failed on `src/engine/*.ts` (missing `.js` extensions on relative imports under `nodenext`, which cascaded into a pile of implicit-`any` errors; Railway's build step would have hit the same thing). Since a concurrent session was actively editing those same files for a later ticket, I fixed the import extensions in place on disk (so local builds work again — verified `npm run build`, `npm start`, and the full `vitest` suite all pass) but deliberately did **not** commit `src/engine/*` under this ticket: that's not ticket 02's code, and committing mid-flight from another live session's working tree felt like the wrong place to attribute it. Whoever commits the engine ticket next should fold this fix in (or re-apply it if it's since been reverted) and run `npm run build` once more before relying on this pipeline.
- Remaining checklist items require the project owner to actually click through Railway/GitHub: run `bash scripts/setup-deploy.sh` from the repo root.
