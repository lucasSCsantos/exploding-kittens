# 08: Engine: player view (hidden information)

**What to build:** `getPlayerView(state, playerId) → PlayerView`, the single function allowed to turn full game state into what one player is allowed to see. This is the engine's last piece before anything touches a client or a socket.

**Blocked by:** 07 (engine combos)

**Status:** ready-for-agent

- [ ] `src/engine/view.ts`: `getPlayerView`
- [ ] Test: never includes another player's hand contents (only sizes)
- [ ] Test: never includes deck order or contents, except positions the requesting player has legitimately seen (`known_deck`), and only until invalidated by shuffle/reorder
- [ ] Test: never reveals where any player reinserted a kitten, except to that player
- [ ] Test: public fields (discard pile, hand sizes, deck size, alive status, `turns_remaining`, play history) are present and accurate for every viewer
- [ ] Test: a shuffle invalidates a previously-known deck position for every player who had tracked it (reinsertion knowledge and `STF`/`ATF` knowledge alike)
