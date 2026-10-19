# 24: Selection staging row

**What to build:** Cards selected to play visually separate into their own row above the hand, instead of nudging up slightly in place. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Selected cards move into a dedicated row above the fanned hand, ordered by selection order (the order the player tapped them), not hand order
- [x] The remaining (unselected) hand cards re-fan to fill the gap, consistent with the existing reorder animation behavior
- [x] Deselecting a staged card returns it to its place in the hand
- [x] New positioning logic lives as a pure, tested function in `layout.ts`, following the existing `fanTransform` convention
- [x] Existing selection classification/play behavior (`selection.ts`, the Play button, combo routing) is unchanged
- [x] Full test suite and typecheck still pass
