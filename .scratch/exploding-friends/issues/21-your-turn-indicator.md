# 21: Your-turn indicator

**What to build:** A clear visual indicator that it's your turn, matching the existing opponent active-turn treatment. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] When it's your turn, the hand area shows a ring/glow highlight matching the amber ring/glow already used for opponents in `Opponent.tsx`
- [x] A short text label ("Your turn") is also shown while it's your turn
- [x] Indicator is driven by the existing `isYourTurn` computation already in `Table.tsx`
- [x] Full test suite and typecheck still pass
