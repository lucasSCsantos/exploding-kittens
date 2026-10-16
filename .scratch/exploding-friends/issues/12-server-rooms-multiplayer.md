# 12: Server: rooms & real-time multiplayer

**What to build:** The same UI, now driven by a real server over the network, so 2–10 real browsers can play together instead of one device switching seats.

**Blocked by:** 11 (client overlays & combos)

**Status:** ready-for-agent

- [ ] `src/server/rooms.ts`: `RoomManager` — create/join by 4-letter code, max 10 players, first joiner is host, holds one `GameState` + engine instance per room
- [ ] `src/server/index.ts` expanded: Express serves `dist/client`; Socket.IO handles `join`, `startGame`, `action`, `nope`, `favorResponse`, etc.
- [ ] Every state-changing event re-emits `getPlayerView(state, playerId)` to each socket individually — never a broadcast of raw state
- [ ] Replace the Phase-2 local Zustand harness with real socket-driven state updates on the client
- [ ] Verified through the deployed URL from ticket 02: Socket.IO connects same-origin (no hard-coded URLs), server honors `process.env.PORT` under the real host
- [ ] Manual test: 2+ separate browser sessions (including one real phone) create a room, join by code, and play a full game with hidden information correctly enforced for each viewer
