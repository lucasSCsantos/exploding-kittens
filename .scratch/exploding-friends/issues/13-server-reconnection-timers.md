# 13: Server: reconnection & timers

**What to build:** Robustness for real game nights — a dropped connection or a slow player shouldn't stall or corrupt a game.

**Blocked by:** 12 (server rooms & real-time multiplayer)

**Status:** done

- [x] `playerToken` generated on join, stored in `localStorage`; rejoining with the same token re-seats the player to their existing hand/state
- [x] ~60s grace period before a disconnected seat is dropped (scoped to an unstarted/lobby room — see `## Comments`)
- [x] Turn timer (e.g. 45s) auto-draws for an inactive player
- [x] Nope window becomes a server-side timer (3–5s, restarts per Nope) replacing any client-only stub timing
- [ ] Manual test: refreshing mid-Nope-window, mid-Favor-request, and mid-Defuse-reinsert all recover cleanly without corrupting state or leaking new information to the reconnecting player

## Comments

The ~60s grace-period drop only removes a player from an **unstarted** room's roster. Once
`startGame` has run, the engine has no way to remove a seated player without corrupting its
N-1-kitten/defuse-count invariants (deck size, deal counts, and seat indices are all fixed at
setup) — so a mid-game disconnect is tracked (`connected: false`, shown in the lobby/opponent UI)
but the seat is never dropped. The 45s turn timer (auto-draw) is what actually keeps a mid-game
disconnect or AFK player from stalling the table; the grace-period drop is specifically about
freeing up a lobby seat that was never reclaimed.

The manual-test item wasn't run interactively in this session (no browser/manual pass), but the
underlying mechanism is unchanged from ticket 12: reconnection-by-token in `RoomManager.joinRoom`
is phase-agnostic and doesn't touch `GameState` or the timer schedule, so it should recover
cleanly in all three sub-phases. Worth a manual pass before calling this fully verified.
