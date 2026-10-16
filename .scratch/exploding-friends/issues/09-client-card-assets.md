# 09: Client: card asset mapping

**What to build:** The single place the client maps a card ID + card instance to an image, and keeps that design stable for the whole game. The engine itself never references images.

**Blocked by:** 08 (engine player view)

**Status:** ready-for-agent

- [ ] `src/client/cards.ts`: loads all `explodding/*.jpg` via `import.meta.glob(..., { eager: true })`
- [ ] Explicit `CARD_TYPE_TO_FILES: Record<CardId, string[]>` table (not guessed from filenames)
- [ ] `assignDesigns(state)` gives each card *instance* a stable design index for the whole game
- [ ] `getCardImage(cardId, instanceId)` and `getCardBackImage()` implemented
- [ ] Test: every `CardId` in `src/engine/types.ts` has at least one entry in `CARD_TYPE_TO_FILES`
- [ ] Test: every file listed in `CARD_TYPE_TO_FILES` actually exists in `explodding/`
- [ ] Test: the same card instance resolves to the same image across repeated calls within a game
