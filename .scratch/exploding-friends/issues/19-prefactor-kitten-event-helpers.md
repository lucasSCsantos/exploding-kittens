# 19: Prefactor: expose exploded kittens + shared event/geometry helpers

**What to build:** No visible behaviour change. Expose `explodedKittens` on the player view, extract the currently-duplicated defused/eliminated detection in `gameFeedback.ts` into one shared pure `detectKittenEvent` function, add a pure `detectCardTransfer` function for Favor/Pair/Triple hand-to-hand transfers, and add a pure flight-offset geometry helper to `layout.ts`. This is prefactoring work that makes tickets 22, 26, and 27 straightforward — see `.scratch/exploding-friends/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `PlayerView` (and `ServerView`) gains `explodedKittens: Card[]`, a direct passthrough of `GameState.explodedKittens`, same treatment as `discard`
- [x] `detectKittenEvent(prev, next)` added as a pure, tested function returning which seat/card/kind (defuse-in-progress vs. completed elimination) of kitten event happened in the diff, or `null`
- [x] `gameFeedback.ts`'s existing defused/eliminated sound+haptic logic is refactored to consume `detectKittenEvent` instead of its own duplicated boolean checks; existing `gameFeedback.test.ts` tests (including the multi-entry-batch regression case) still pass unmodified in behaviour
- [x] `detectCardTransfer(prev, next)` added as a pure, tested function returning `{ fromSeat, toSeat }` pairs for new Favor/Pair/Triple `playHistory` entries, and nothing for unrelated entries (Skip, Shuffle, etc.) — Favor is detected via the FAVOR_RESOLVE→ACTION transition instead, since its playHistory entry logs the request opening, not the actual hand-off (see code comment)
- [x] A pure flight-offset helper added to `layout.ts` (and `layout.test.ts`) taking two rects and returning the relative transform needed to animate between them
- [x] Full test suite and typecheck still pass
