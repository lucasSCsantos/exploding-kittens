# 06: Engine: Nope reaction stack

**What to build:** The Nope/Yup reaction system (spec §7) wrapping every noppable play already implemented, so any eligible card or combo can be cancelled or chain-cancelled.

**Blocked by:** 05 (engine action card effects)

**Status:** ready-for-agent

- [ ] `pending_action` / `nope_stack` / `NOPE_WINDOW` phase implemented in `applyAction`
- [ ] Test: a single Nope cancels the pending action
- [ ] Test: Nope-on-Nope (2 total, even) → original action resolves
- [ ] Test: three Nopes (odd) → action cancelled
- [ ] Test: a cancelled card and all Nopes go to discard, never back to a hand
- [ ] Test: a Noped `ATK`/`TATK`/`SKIP`/`DFB` does **not** end the turn — the player continues their action phase
- [ ] Test: any alive player, including the one who played the card, may play Nope
- [ ] Test: an eliminated player cannot play Nope
- [ ] Test: player holding `NOPE` but no `DEF` who draws `EK` is still eliminated — Nope cannot stop an Exploding Kitten
- [ ] Test: `EK` and `DEF` plays cannot be Noped at all (already covered partially in ticket 04; confirm here now that the Nope window itself exists)
