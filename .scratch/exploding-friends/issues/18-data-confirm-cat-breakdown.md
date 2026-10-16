# 18: Data: confirm real per-box cat-type breakdown

**What to build:** Replace the placeholder even-split `CAT_BREAKDOWN` table (spec §2.1) with the real per-type cat counts once they're confirmed from the physical Party Pack box, without touching any setup logic.

**Blocked by:** 03 (engine deck composition & game setup)

**Status:** ready-for-agent

- [ ] Real counts for `CAT_TACOCAT`, `CAT_HAIRYPOTATO`, `CAT_RAINBOW`, `CAT_BEARD`, `CAT_CATTERMELON` obtained for the paw-print and standard decks (combined tier stays additive)
- [ ] `CAT_BREAKDOWN` data table updated in `src/engine/decks.ts`; per-tier sums still equal 14/20/34
- [ ] `docs/exploding-kittens-party-pack-ai-spec.md` §2.1 updated to mark `cat_breakdown` resolved with the real numbers
- [ ] Existing deck-composition tests from ticket 03 still pass unmodified (confirms the table was truly swap-in-place)
