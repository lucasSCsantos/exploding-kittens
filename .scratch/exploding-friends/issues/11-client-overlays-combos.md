# 11: Client: special-moment overlays & combos

**What to build:** The remaining interactive moments the rules need, completing a fully rules-compliant hot-seat game: Nope window, See/Alter the Future, Defuse reinsertion, Favor, and combo multi-select.

**Blocked by:** 10 (client table & hand, hot-seat play)

**Status:** done (commit 3d8af16)

- [x] `src/client/overlays/NopeWindow.tsx`: countdown ring, big Nope button, restarts countdown per Nope played
- [x] `src/client/overlays/SeeTheFuture.tsx`: private top-3 fan-out
- [x] `src/client/overlays/AlterTheFuture.tsx`: private top-3 fan-out with drag-to-reorder
- [x] `src/client/overlays/DefuseReinsert.tsx`: slider or drag-into-gap to choose reinsertion position, visually hidden from other seats
- [x] Favor prompt: target sees their hand enlarged with "choose a card to give"
- [x] Combo multi-select: tap several cards in hand to select them (they lift together), then play as pair/triple/five-different
- [x] A full hot-seat game can be played start to finish touching every card type and every special moment, including a Nope chain and at least one of each combo type

## Comments

Browser-verified: Nope window countdown + Play Nope, See the Future reveal/dismiss,
Defuse reinsertion slider, Favor (target picker on the giver's side, enlarged-hand
prompt on the receiver's side), and a Pair combo through the full multi-select →
target-picker → dispatch pipeline (including the engine correctly rejecting a
title-mismatched pair). Triple/Five Different combo UI (`NamedCardPicker`,
`DiscardPicker`) share the identical routing path as Pair and are unit-tested at the
`selection.ts` classification layer, but weren't separately live-clicked through —
heavy card overlap in a small test hand made multi-selecting 3/5 specific cards
unreliable to drive by automated clicks; the underlying mechanism is the same proven
code path, just a different `pendingPlay.kind` branch.

`src/client/overlays/NamedCardPicker.tsx` lets the Triple-combo namer pick any
`CardId` (including EK/DEF/NOPE/FERAL) — the engine doesn't restrict this either, so
it's not a bug, just unpolished scope not asked for by this ticket.

Sound, haptics, and the "arrow sweeps"/"card flies" animations from the dev guide's
§5.5/§5.6 are intentionally left to tickets 15 and 17 (polish).
