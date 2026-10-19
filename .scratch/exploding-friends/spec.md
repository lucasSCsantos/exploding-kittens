# Table feedback & animation polish

Status: ready-for-agent

## Problem Statement

The table screen works, but it doesn't *feel* like a physical card game and it's unclear at a glance what's happening. Specifically:

- The discard pile only ever shows the single top card, instead of looking like a real pile of played cards.
- When a player draws the Exploding Kitten, nothing marks the moment — the defusing player just sees a plain reinsertion slider with no card shown, and a player who has no Defuse is eliminated with no visual sense of what just happened or which card did it.
- The game-over screen only names the winner; there's no sense of occasion, and no distinct feedback for the player who actually lost.
- There's no indicator that it's your turn — you only discover it by noticing your hand has become interactive.
- Drawing a card and giving/stealing a card between players (Favor, Pair, Triple) both just pop the new state into place, with no sense of a card physically moving from one place to another.
- Selecting cards to play nudges them up slightly in place, which doesn't clearly separate "the cards I'm about to play" from "my hand."

## Solution

Add visual feedback and animation across the table screen so the state of the game — whose turn it is, what just got drawn, who just got hit, who just won or lost — is always legible at a glance, and card movement (drawing, giving, discarding) is animated as physical movement between on-screen positions rather than instant state swaps.

This also requires closing a real gap in what the client can see: today, when a player is eliminated without defusing, the Exploding Kitten card they drew disappears from every player's view entirely (it's added to the engine's internal `explodedKittens` list, but that list was never exposed in `PlayerView`). Exposing it is required to show the card during a loss, and is consistent with the spec's existing "auto-revealed on draw" rule for the Exploding Kitten card — it's a view-layer gap, not a new game-rule decision.

## User Stories

1. As a player, I want the discard pile to visually resemble a real pile of played cards, so that the table feels physical rather than abstract.
2. As a player, I want the discard pile's existing tap-to-view-full-history modal to keep working unchanged, so that I don't lose the ability to review the complete discard history.
3. As any player, I want to see the actual Exploding Kitten card appear on screen, centered above the reinsertion slider, when the defusing player is choosing where to slip it back into the deck, so that the moment is visible and unambiguous to everyone at the table.
4. As the player who drew the Exploding Kitten and has no Defuse, I want a clear, brief full-screen moment showing that I was eliminated and which card did it, so that my loss isn't just a silent fade to grayscale.
5. As a player watching someone else get eliminated, I want a smaller, seat-local effect (the kitten card appearing and fading at their seat) rather than a full-screen takeover, so that the feedback is proportional to how relevant the event is to me.
6. As the winning player, I want the win screen to clearly celebrate the win (emphasis on my name/avatar, a lightweight celebratory effect), so that winning feels like an occasion rather than a plain text label.
7. As any player, I want the win screen to stay focused on the winner without duplicating the full elimination history, so that it doesn't redundantly repeat what the event log sidebar already shows.
8. As the player whose turn it is, I want a clear visual indicator (a highlight around my hand area, plus a short text label) so that I immediately know it's my turn without having to infer it from interactivity.
9. As a player, I want my own draw to show the drawn card flipping face-up and then flying into my hand, so that drawing feels like a physical action instead of an instant hand-size change.
10. As a player, I want to see an opponent's draw as a face-down card traveling from the deck to their hand, so that I can follow the flow of the game even when I can't see what they drew.
11. As the player playing a Favor, Pair, or Triple, I want to see the transferred card fly from the giving player's hand to the receiving player's hand, so that the exchange is visible rather than an instant state update.
12. As a player who isn't involved in a Favor/Pair/Triple exchange, I want to see a face-down card fly between the two seats involved, so that I can follow that a transfer happened without learning the card's identity (which the rules don't let me know).
13. As a player, I want the cards I've selected to play to visually separate into their own row above my hand (not just lift slightly in place), so that it's unambiguous which cards are staged to be played.
14. As a player, I want my selected cards to appear in the order I selected them, so that for combo plays (Pair, Triple, Five Different) I can visually confirm the order/composition of my selection.
15. As a player, I want deselecting a staged card to return it to its place in my hand, so that staging is clearly reversible.
16. As a player, I want my hand to re-fan and fill the gap left by staged cards, so that my hand doesn't look broken or sparse while I'm building a selection.

## Implementation Decisions

### Engine / view layer

- `PlayerView` (and therefore `ServerView` on the client) gains a new field: `explodedKittens: Card[]` — a direct passthrough of `GameState.explodedKittens`, mirroring how `discard` and `playHistory` are already exposed. This is public information per the spec (Exploding Kitten is "auto-revealed on draw"), so no redaction is needed — same treatment as `discard`.
- No change to engine rules, state transitions, or the `DEFUSE_REINSERT`/elimination logic itself — this is purely exposing already-public data that was previously only kept in internal `GameState`.

### Shared client diff logic (new pure functions, colocated with or beside `gameFeedback.ts`)

- **`detectKittenEvent(prev, next)`**: a single pure function that detects "a kitten event happened in this diff" and returns a structured result (which seat, which card, whether it was a defuse-reinsert-in-progress vs. a completed elimination, whether it's the viewer's own event) or `null`. This replaces the currently-duplicated defused/eliminated boolean logic in `gameFeedback.ts` with one shared source of truth, consumed by both:
  - the existing sound/haptic feedback (`gameFeedback.ts`), and
  - the new overlay-triggering UI state in `Table.tsx`.
- **`detectCardTransfer(prev, next)`**: a pure function scanning newly-appended `playHistory` entries for Favor/Pair/Triple effects and returning the `{ fromSeat, toSeat }` pairs to animate, reused by the single new transfer-animation trigger in `Table.tsx` instead of three near-duplicate call sites.
- Both functions operate only on `ServerView` diffs (same shape of input `gameFeedback.ts` already consumes), and both are pure (no side effects), matching the project's existing seam convention of pushing branching logic into pure, independently-testable functions.

### Geometry / layout (`layout.ts` extensions)

- **Discard pile depth**: a pure function returning the last N (capped at 15) discard cards plus a messy offset per card (reusing/extending the existing `messyOffset` approach), so the pile visually reads as having bulk, not just a single floating card. The existing full-history modal (`DiscardPile`'s tap-to-view) is unchanged and still shows the entire `discard` array.
- **Selection staging row**: a pure function computing the position of each selected card in a row above the hand, keyed by selection order (not hand order), so the staging row always reads left-to-right in the order the player tapped the cards.
- **Flight offset helper**: a pure function taking two rects (source, destination) and returning the relative transform (`dx`/`dy`, and optionally a flip/rotation state) needed to animate an element from one to the other. This one helper backs all three travel animations (own draw, opponent draw, hand-to-hand transfer) — they differ only in which rects are passed in and whether the card renders face-up or face-down, not in the underlying math.

### Component changes

- **`DiscardPile`**: renders up to the last 15 cards (via the new layout helper) instead of only the top card; tap-to-view-history behavior is unchanged.
- **`DefuseReinsert`**: gains the kitten's `CardFace`, rendered centered above the slider, using `pendingAction.kitten` (already available in the view — no new data needed for this specific case).
- **`Table`**:
  - Renders the full-screen "you were eliminated" overlay when `detectKittenEvent` reports an elimination for the viewer's own seat, auto-dismissing after a short, fixed delay, using the newly-exposed `explodedKittens` card for the art.
  - Renders a smaller, seat-local kitten-appear-and-fade effect at the relevant opponent seat when `detectKittenEvent` reports an elimination for someone else.
  - Adds a your-turn indicator (ring/glow matching the existing `Opponent` active-turn treatment, plus a short text label) around the hand area, driven by the existing `isYourTurn` computation already in `Table.tsx`.
  - Enhances the win screen: emphasized winner name/avatar plus a lightweight, Motion-driven celebratory effect. No standings/elimination-order recap is added (out of scope — see below).
  - Wires up `detectCardTransfer` to trigger one shared fly-animation for Favor/Pair/Triple resolutions, rendering the moving card face-up when the viewer is the giver or receiver, face-down otherwise.
- **`DrawPile`**: the existing in-place flip is kept for the drawing player's own draw, followed by the card flying to its slot in the hand (using the flight-offset helper and the hand's own position); for other players' draws, a face-down card flies from the deck to the opponent's fan (no flip).
- **`Hand`**: selected cards move into a dedicated row above the fanned hand (via the new layout helper) instead of nudging up in place; the remaining (unselected) hand cards re-fan to fill the gap, consistent with the existing `layout` animation prop already used for reordering.
- **`Opponent`**: no structural change beyond providing a stable ref/position for the flight-offset and seat-local kitten-fade effects to target.

## Testing Decisions

- Keep testing at the existing pure-function seams; this repo currently has zero component-rendering tests, and this work should not introduce the first one. Prior art: `layout.test.ts`, `selection.test.ts`, `gameFeedback.test.ts`, `eventLogText.test.ts` — all test pure functions directly, with no rendering involved.
- `explodedKittens` passthrough: tested the same way `view.test.ts` already tests other `PlayerView` fields (constructs a `GameState`, calls `getPlayerView`, asserts on the result).
- `detectKittenEvent`: tested like `gameFeedback.test.ts` already tests the existing defused/eliminated branches (construct `prev`/`next` `ServerView` pairs, assert on the returned structured result) — including the regression case already covered there (a batch with more than one relevant entry only reports the correct/most-recent one).
- `detectCardTransfer`: tested the same way, with `prev`/`next` pairs whose `playHistory` differs by a Favor/Pair/Triple entry, asserting the correct `{ fromSeat, toSeat }` is returned, and that unrelated entries (Skip, Shuffle, etc.) return nothing.
- New `layout.ts` functions (discard depth/offsets, staging row positions, flight offset): tested the same way existing `layout.ts` functions are tested — plain input/output assertions, no DOM involved.
- Component wiring itself (refs, `AnimatePresence`, Motion transitions) is not unit tested, consistent with the rest of the codebase; manual verification via `/run` (or equivalent) is the check for the actual animations looking right.

## Out of Scope

- Any change to game rules, engine logic, or network/protocol shape beyond adding the single `explodedKittens` passthrough field.
- A full win-screen standings/elimination-order recap (the event log sidebar already covers this).
- Animating card transfers for Five Different (it moves from the discard pile, not a player's hand) or See/Alter the Future reveals — these are visually and mechanically distinct from the hand-to-hand transfer case and aren't part of this batch.
- Sound/haptic changes beyond whatever already exists from ticket 15 — this spec is about visual feedback and animation, not new audio.
- Accessibility/reduced-motion handling beyond what the codebase already does for animations (no new reduced-motion preference support is being added here).
- Performance work beyond the discard pile's existing 15-card cap (no virtualization, no WebGL, etc.).

## Further Notes

- This spec assumes the existing Motion-based animation infrastructure from ticket 17 (`motion.ts`'s `CARD_SPRING`/`cardFlipSpring`) is reused for all new animations rather than introducing a new animation approach.
- `CONTEXT.md` was created as part of scoping this work, capturing the **Exploded Kitten** / **discard pile** / **elimination** distinction that the `explodedKittens` exposure decision depends on.
