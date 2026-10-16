# 08: Engine: player view (hidden information)

**What to build:** `getPlayerView(state, playerId) → PlayerView`, the single function allowed to turn full game state into what one player is allowed to see. This is the engine's last piece before anything touches a client or a socket.

**Blocked by:** 07 (engine combos)

**Status:** done

- [x] `src/engine/view.ts`: `getPlayerView`
- [x] Test: never includes another player's hand contents (only sizes)
- [x] Test: never includes deck order or contents, except positions the requesting player has legitimately seen (`known_deck`), and only until invalidated by shuffle/reorder
- [x] Test: never reveals where any player reinserted a kitten, except to that player
- [x] Test: public fields (discard pile, hand sizes, deck size, alive status, `turns_remaining`, play history) are present and accurate for every viewer
- [x] Test: a shuffle invalidates a previously-known deck position for every player who had tracked it (reinsertion knowledge and `STF`/`ATF` knowledge alike)

## Comments

Implementing "play history" required adding `playHistory: PlayHistoryEntry[]` to `GameState` (new field, populated in `handlePassNopeWindow` in `src/engine/actions.ts`) since no play log existed anywhere in the engine before this ticket — reuses the existing `NopeableEffect` union rather than inventing a parallel card/target encoding.
