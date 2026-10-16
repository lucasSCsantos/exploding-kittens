# 07: Engine: combos

**What to build:** Pair, triple, and five-different-cards combos (spec §9), including their configurable scope, completing the full rules engine.

**Blocked by:** 06 (engine Nope reaction stack)

**Status:** done

- [x] Pair: 2 same-title cards → take a **random** card from target's hand (seeded-RNG tested); Feral Cat may stand in for a cat card
- [x] Triple: 3 same-title cards → name a card type; target must give it if they have it, otherwise nothing happens (cards still consumed)
- [x] Five different: 5 differently-titled cards → player takes **any** chosen card from the discard pile
- [x] `comboScope=cats-only` (default) rejects non-cat combos; `comboScope=any-matching-title` variant allows them
- [x] Feral-pair rule default: two Feral Cats alone do **not** form a valid pair; at least one real cat required
- [x] Targeting a player with zero cards: combo has no effect but still consumes the played cards
- [x] All combo types open a Nope window and can be cancelled (reuses ticket 06's Nope stack)
- [x] Standalone cat/Feral Cat play (illegal outside a combo) now has a full negative test alongside the valid combo tests
