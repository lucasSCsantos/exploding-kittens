# 20: Discard pile shows a real stack

**What to build:** The discard pile visually reads as a real pile of played cards instead of a single floating top card. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Discard pile renders up to the last 15 discarded cards, each with its own messy offset/rotation (reusing/extending the existing `messyOffset` approach), so the pile visually has bulk
- [x] New rendering logic lives as a pure, tested function in `layout.ts`, following the existing `messyOffset`/`fanTransform` convention
- [x] The existing tap-to-view-full-history modal is unchanged and still shows the entire `discard` array, not just the capped 15
- [x] Full test suite and typecheck still pass
