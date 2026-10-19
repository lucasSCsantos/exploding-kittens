# 25: Loss clarity: elimination overlays

**What to build:** Clear, distinct feedback when a player is eliminated — a full-screen moment for your own loss, a smaller effect for anyone else's. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** 19 (needs `explodedKittens` + `detectKittenEvent`)

**Status:** done

- [ ] When `detectKittenEvent` reports the viewer's own seat was eliminated, a full-screen overlay appears showing the kitten card (from the newly-exposed `explodedKittens`) and auto-dismisses after a short, fixed delay back into spectating the rest of the game
- [ ] When `detectKittenEvent` reports a different seat was eliminated, a smaller, seat-local effect plays at that opponent's position (kitten card briefly appears and fades) rather than a full-screen takeover
- [ ] Existing sound/haptic feedback for eliminations (ticket 15) is unchanged in behaviour, now sourced from the same shared `detectKittenEvent` result
- [ ] Full test suite and typecheck still pass
