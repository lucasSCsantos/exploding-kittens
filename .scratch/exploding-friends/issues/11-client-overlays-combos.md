# 11: Client: special-moment overlays & combos

**What to build:** The remaining interactive moments the rules need, completing a fully rules-compliant hot-seat game: Nope window, See/Alter the Future, Defuse reinsertion, Favor, and combo multi-select.

**Blocked by:** 10 (client table & hand, hot-seat play)

**Status:** ready-for-agent

- [ ] `src/client/overlays/NopeWindow.tsx`: countdown ring, big Nope button, restarts countdown per Nope played
- [ ] `src/client/overlays/SeeTheFuture.tsx`: private top-3 fan-out
- [ ] `src/client/overlays/AlterTheFuture.tsx`: private top-3 fan-out with drag-to-reorder
- [ ] `src/client/overlays/DefuseReinsert.tsx`: slider or drag-into-gap to choose reinsertion position, visually hidden from other seats
- [ ] Favor prompt: target sees their hand enlarged with "choose a card to give"
- [ ] Combo multi-select: tap several cards in hand to select them (they lift together), then play as pair/triple/five-different
- [ ] A full hot-seat game can be played start to finish touching every card type and every special moment, including a Nope chain and at least one of each combo type
