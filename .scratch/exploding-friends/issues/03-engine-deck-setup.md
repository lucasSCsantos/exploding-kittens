# 03: Engine: deck composition & game setup

**What to build:** `createGame(playerNames, config?) → GameState`, the pure function that builds a correct starting state for 2–10 players per the AI spec §2.1/§4 — selecting the right deck tier, dealing hands, and inserting Exploding Kittens and extra Defuses. No turns or card effects yet; this ticket only has to produce a valid starting state.

**Blocked by:** 01 (project scaffold)

**Status:** ready-for-agent

- [ ] `src/engine/types.ts`: `Card`, `CardId` union (including all 5 cat IDs + Feral), `Player`, `GameState`, `Config` (`attackStacking`, `comboScope`, `feralPairRule`, `extraDefuses`, `deckTier`, `catBreakdown`)
- [ ] `src/engine/decks.ts`: deck-tier composition tables and `CAT_BREAKDOWN` from spec §2.1, as pure data (not hard-coded inline in setup logic)
- [ ] `src/engine/setup.ts`: `createGame` implementing spec §4
- [ ] `src/engine/rng.ts`: seeded RNG wrapper used by setup's shuffle (no global `Math.random`)
- [ ] Test: correct deck tier selected for N=2,3 (paw-print), N=4,7 (standard), N=8,10 (combined)
- [ ] Test: correct total card count per tier (44/71/115) before kittens are added
- [ ] Test: per-card-type counts match the §2.1 table for each tier, including `CAT_BREAKDOWN` summing to 14/20/34
- [ ] Test: paw-print tier has zero `TATK` and zero `ATF`
- [ ] Test: exactly `N - 1` Exploding Kittens inserted regardless of tier
- [ ] Test: every player dealt 7 cards + 1 `DEF` = 8-card starting hand
- [ ] Test: extra `DEF` inserted into deck equals `total_DEF_in_tier - N` (check at least one N per tier)
- [ ] Test: deck order is shuffled (seeded-RNG based check, not a strict sequence assertion)
- [ ] Test: `createGame` rejects N<2 or N>10
