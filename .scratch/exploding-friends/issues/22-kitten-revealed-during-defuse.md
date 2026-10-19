# 22: Exploding Kitten revealed during defuse reinsertion

**What to build:** The actual Exploding Kitten card is shown on screen to everyone while the defusing player chooses where to reinsert it. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `DefuseReinsert` renders the kitten's `CardFace`, centered above the reinsertion slider, using `pendingAction.kitten` (already available in the view for this phase — no new data needed)
- [ ] The card is visible to every player at the table during the `DEFUSE_REINSERT` phase, not only the defusing player
- [ ] Full test suite and typecheck still pass
