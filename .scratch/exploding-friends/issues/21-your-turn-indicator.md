# 21: Your-turn indicator

**What to build:** A clear visual indicator that it's your turn, matching the existing opponent active-turn treatment. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] When it's your turn, the hand area shows a ring/glow highlight matching the amber ring/glow already used for opponents in `Opponent.tsx`
- [ ] A short text label ("Your turn") is also shown while it's your turn
- [ ] Indicator is driven by the existing `isYourTurn` computation already in `Table.tsx`
- [ ] Full test suite and typecheck still pass
