# 03: Engine: deck composition & game setup

**What to build:** `createGame(playerNames, config?) → GameState`, the pure function that builds a correct starting state for 2–10 players per the AI spec §2.1/§4 — selecting the right deck tier, dealing hands, and inserting Exploding Kittens and extra Defuses. No turns or card effects yet; this ticket only has to produce a valid starting state.

**Blocked by:** 01 (project scaffold)

**Status:** done

- [x] `src/engine/types.ts`: `Card`, `CardId` union (including all 5 cat IDs + Feral), `Player`, `GameState`, `Config` (`attackStacking`, `comboScope`, `feralPairRule`, `extraDefuses`, `deckTier`, `catBreakdown`)
- [x] `src/engine/decks.ts`: deck-tier composition tables and `CAT_BREAKDOWN` from spec §2.1, as pure data (not hard-coded inline in setup logic)
- [x] `src/engine/setup.ts`: `createGame` implementing spec §4
- [x] `src/engine/rng.ts`: seeded RNG wrapper used by setup's shuffle (no global `Math.random`)
- [x] Test: correct deck tier selected for N=2,3 (paw-print), N=4,7 (standard), N=8,10 (combined)
- [x] Test: correct total card count per tier (44/71/115) before kittens are added
- [x] Test: per-card-type counts match the §2.1 table for each tier, including `CAT_BREAKDOWN` summing to 14/20/34
- [x] Test: paw-print tier has zero `TATK` and zero `ATF`
- [x] Test: exactly `N - 1` Exploding Kittens inserted regardless of tier
- [x] Test: every player dealt 7 cards + 1 `DEF` = 8-card starting hand
- [x] Test: extra `DEF` inserted into deck equals `total_DEF_in_tier - N` (check at least one N per tier)
- [x] Test: deck order is shuffled (seeded-RNG based check, not a strict sequence assertion)
- [x] Test: `createGame` rejects N<2 or N>10

## Comments

Code review (Standards + Spec) caught two fixes applied before commit:
- `decks.ts`'s `makeCard` used a module-level mutable `uidCounter`, an unseeded hidden dependency on call order across the whole test process → switched to `crypto.randomUUID()`.
- `setup.ts` assumed `defuses.pop()` always succeeds via a non-null assertion, silently coupled to `DECK_COMPOSITION[tier].DEF >= N` holding — made the dependency explicit with a thrown error instead.

Also addressed two spec-fidelity notes: §4 step 10 ("choose a starting player") was previously hardcoded to player 0 — now drawn from the seeded RNG; initial `phase` was `"ACTION"`, presuming turn-loop semantics this ticket doesn't own — changed to `"SETUP"` (ticket 04 will own the phase transition).
