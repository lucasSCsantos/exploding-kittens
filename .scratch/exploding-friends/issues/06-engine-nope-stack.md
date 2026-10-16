# 06: Engine: Nope reaction stack

**What to build:** The Nope/Yup reaction system (spec §7) wrapping every noppable play already implemented, so any eligible card or combo can be cancelled or chain-cancelled.

**Blocked by:** 05 (engine action card effects)

**Status:** done

- [x] `pending_action` / `nope_stack` / `NOPE_WINDOW` phase implemented in `applyAction`
- [x] Test: a single Nope cancels the pending action
- [x] Test: Nope-on-Nope (2 total, even) → original action resolves
- [x] Test: three Nopes (odd) → action cancelled
- [x] Test: a cancelled card and all Nopes go to discard, never back to a hand
- [x] Test: a Noped `ATK`/`TATK`/`SKIP`/`DFB` does **not** end the turn — the player continues their action phase
- [x] Test: any alive player, including the one who played the card, may play Nope
- [x] Test: an eliminated player cannot play Nope
- [x] Test: player holding `NOPE` but no `DEF` who draws `EK` is still eliminated — Nope cannot stop an Exploding Kitten
- [x] Test: `EK` and `DEF` plays cannot be Noped at all (already covered partially in ticket 04; confirm here now that the Nope window itself exists)

## Comments

Every noppable play (`PLAY_ATTACK`, `PLAY_TARGETED_ATTACK`, `PLAY_SKIP`, `PLAY_FAVOR`, `PLAY_SHUFFLE`, `PLAY_SEE_FUTURE`, `PLAY_ALTER_FUTURE`, `PLAY_DRAW_FROM_BOTTOM`) now moves its card to discard and opens a `NOPE_WINDOW` (`pendingAction.type === "NOPEABLE"`, capturing the effect to apply) instead of resolving immediately. Two new engine actions drive the window: `PLAY_NOPE` (any alive player, any index) and `PASS_NOPE_WINDOW` (closes it — odd `nopeStack` cancels, even resolves the captured effect). This is a breaking change to ticket 05's existing tests, which were updated to thread a `PASS_NOPE_WINDOW` step through before asserting on the resolved effect.
