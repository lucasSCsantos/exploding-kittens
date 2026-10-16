# 02: Continuous deployment setup

**What to build:** A live, auto-deploying public URL from day one, so every future ticket ships to something real instead of only `localhost`. This ticket has a code half (automatable) and an account/dashboard half (only the project owner can click through — use `/wizard` for that part).

**Blocked by:** 01 (project scaffold)

**Status:** ready-for-agent

- [ ] Server reads the port from `process.env.PORT` (falls back to a local default in dev)
- [ ] Production build serves `dist/client` from Express at the same origin the server listens on
- [ ] `npm run build && npm start` works locally end to end
- [ ] A `/wizard` script is generated to walk the owner through: creating a Railway or Render account, connecting the GitHub repo, setting the build/start commands, and generating a public domain
- [ ] Owner has run the wizard and confirms the public URL serves the current build
- [ ] A push to `main` triggers an automatic redeploy (verified with a trivial commit)
- [ ] Every later ticket's "done when" should include "still deploys clean through this pipeline" — note this expectation doesn't need re-litigating per ticket, it's a standing bar from here on
