# 10: Client: table & hand, hot-seat play

**What to build:** A full game playable on one device, switching the active player's view with a dev control — the "real card table" feel, built before network latency is in the mix.

**Blocked by:** 09 (client card asset mapping)

**Status:** ready-for-agent

- [ ] Local "fake multiplayer" harness: `GameState` held client-side in a Zustand store (temporary, for this ticket only), each seat's view derived via the engine directly, dev-only "switch active seat" control
- [ ] `src/client/table/Table.tsx`: felt background, seat layout around the edge, draw pile, discard pile
- [ ] `src/client/table/Hand.tsx`: fanned arc layout, hover/touch lift, drag-to-play onto discard, tap-to-select + "Play" button fallback, sideways reorder
- [ ] `src/client/table/DrawPile.tsx`: stacked/thick-to-thin visual by remaining count, tap/drag-to-draw, flip animation
- [ ] `src/client/table/DiscardPile.tsx`: messy pile (random rotation/offset per card), tap-to-view history
- [ ] `src/client/table/Opponent.tsx`: avatar, nickname, face-down fan sized to hand count, active-player highlight
- [ ] One person can play a full game end to end on one device (switching seats via the dev control) using simple cards (draw, Skip, Attack, Shuffle, etc.) with fan, drag, flip, and shrinking/thickening deck all visible
