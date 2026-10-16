# 04: Engine: turn loop + Exploding Kitten/Defuse + elimination/win

**What to build:** The core playable loop with only the "do nothing, just draw" path and the Exploding Kitten/Defuse mechanic — enough that a full bare-bones game (no action cards yet) can be played programmatically from setup to a single winner.

**Blocked by:** 03 (engine deck composition & game setup)

**Status:** ready-for-agent

- [ ] `src/engine/actions.ts`: `applyAction(state, action)` implementing the turn loop (spec §5) and Exploding Kitten resolution (spec §6)
- [ ] Test: player may play zero cards and still end turn by drawing
- [ ] Test: drawing a non-`EK` card adds it to hand and ends the turn
- [ ] Test: `turns_remaining` decrements correctly and re-grants the same player another turn when still >0
- [ ] Test: turn advances to the next **alive** player, skipping eliminated seats, once `turns_remaining` hits 0
- [ ] Test: no hand-size cap enforced anywhere
- [ ] Test: drawing `EK` with a `DEF` in hand — `DEF` discarded, player chooses reinsertion position `k` (cover k=0, k=mid, k=len(deck)), card placed exactly there, turn ends
- [ ] Test: drawing `EK` without `DEF` — player eliminated, hand discarded, kitten placed face-up out of play, turn passes to next alive player with `turns_remaining=1`
- [ ] Test: `EK`/`DEF` cannot be Noped (not relevant to combos yet, just confirm the engine rejects/ignores an attempted Nope on them)
- [ ] Test: player eliminated while owing extra turns from an attack — remaining owed turns vanish, not passed on (attack mechanics land in ticket 05, but the elimination-clears-owed-turns behavior should be tested here with a manually constructed state)
- [ ] Test: `GAME_OVER` phase set exactly when `count(alive) == 1`; that player reported as winner
- [ ] Test: game continues correctly through multiple sequential eliminations
- [ ] Test: deck running out unexpectedly (simulate by breaking the `N-1` invariant) causes the engine to flag an error rather than drawing from empty deck
