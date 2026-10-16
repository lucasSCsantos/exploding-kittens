# 13: Server: reconnection & timers

**What to build:** Robustness for real game nights — a dropped connection or a slow player shouldn't stall or corrupt a game.

**Blocked by:** 12 (server rooms & real-time multiplayer)

**Status:** ready-for-agent

- [ ] `playerToken` generated on join, stored in `localStorage`; rejoining with the same token re-seats the player to their existing hand/state
- [ ] ~60s grace period before a disconnected seat is dropped
- [ ] Turn timer (e.g. 45s) auto-draws for an inactive player
- [ ] Nope window becomes a server-side timer (3–5s, restarts per Nope) replacing any client-only stub timing
- [ ] Manual test: refreshing mid-Nope-window, mid-Favor-request, and mid-Defuse-reinsert all recover cleanly without corrupting state or leaking new information to the reconnecting player
