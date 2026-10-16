# 05: Engine: action card effects

**What to build:** Every non-combo, non-Nope action card from the spec (§8.1–8.9), so a game can be played using the full card set minus Nope and combos.

**Blocked by:** 04 (engine turn loop + elimination/win)

**Status:** done

- [x] Attack: next alive player gets `turns_remaining=2`; with `attackStacking=on` (default), attacking while already under attack adds +2 to the carried-over remainder; with `attackStacking=off`, next player simply gets 2 regardless
- [x] Targeted Attack: chosen opponent receives the turns; play continues clockwise from that target afterward; stacking behaves like Attack
- [x] Skip: decrements `turns_remaining` by 1 and ends only one turn; if `turns_remaining` was >1, the same player immediately continues with a new turn still owed
- [x] Favor: target with ≥1 card must give a card of **their own** choosing; target with 0 cards is a no-op, card still consumed
- [x] Shuffle: deck order changes (seeded-RNG check) and invalidates all players' `known_deck`
- [x] See the Future: views `deck[0..2]` (fewer if deck is smaller) without changing order; only the acting player's `known_deck` updates
- [x] Alter the Future: views and reorders `deck[0..2]` arbitrarily; only acting player's `known_deck` updates; deck size unchanged
- [x] Draw from the Bottom: draws `deck[len-1]`; if it's `EK`, resolves via the existing Exploding Kitten path; ends the turn
- [x] Cat cards / Feral Cat: playing one standalone (not as part of a combo) is rejected — only usable inside a combo (full combo mechanics land in ticket 07, so this test just confirms the standalone play is illegal)
- [x] Edge case: `ATK` played while already under a stacked attack produces the correct transferred total per `attackStacking` config
- [x] Edge case: `SKIP` played while owing 2 turns only skips 1, 1 still owed
- [x] Edge case: `STF`/`ATF` with fewer than 3 cards left in deck views/reorders only what remains, no out-of-bounds error
- [x] Edge case: defuser reinserts a kitten, then another player plays `SHUF` — the defuser's tracked reinsertion-position knowledge (spec §12) is invalidated

## Comments

Code review (Standards + Spec axes) flagged that `known_deck` updates from `STF`/`ATF` were clobbering unrelated known positions (e.g. a tracked reinsertion) instead of merging — fixed in `withKnownTop` to only replace the viewed positions.

Known gap, left out of scope: §12's refinement that a tracked reinsertion position should shift (`k -= 1`) as top cards are drawn is not implemented — only its invalidation by `SHUF` is (the only §12 behavior this ticket's checklist asks for). `known_deck` isn't consumed by any AI/probability logic yet, so this is deferred to whichever ticket adds that.
