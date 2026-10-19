# 26: Draw travel animation

**What to build:** Drawing a card looks like a card physically moving from the deck, instead of an instant hand-size change. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** 19 (needs the flight-offset helper)

**Status:** done

- [x] Your own draw keeps the existing in-place flip at the deck, then the revealed card flies into its slot in your hand, using the shared flight-offset helper
- [x] An opponent's draw shows a face-down card flying from the deck to their fan (no flip, since the card's identity is hidden), and their hand count increments once it lands
- [x] Existing draw interaction (tap/drag to draw, `canDraw` gating) is unchanged
- [x] Full test suite and typecheck still pass
