# Exploding Friends — Development Plan

> Status: planning complete, no application code written yet. This document is the source of truth for phase sequencing; update it as phases complete or decisions change.

---

## 0. Inputs read

- `docs/exploding-kittens-party-pack-rules.md` (updated with deck composition table)
- `docs/exploding-kittens-party-pack-ai-spec.md` (updated with §2.1 deck composition, revised §4 setup, `cat_breakdown` CONFIG)
- `docs/exploding-friends-project-description.md`
- `docs/online-exploding-kittens-dev-guide.md`
- `explodding/` — 44 card images after cleanup (see §1.2)

---

## 1. Gaps and conflicts found (resolution log)

### 1.1 Resolved during planning

| # | Gap | Resolution |
|---|---|---|
| 1 | Dev guide assumed one image per card type; project needs per-instance design assignment | **Fixed decision wins.** Client maps `(cardType, instanceId) → design`, not just `cardType`. Dev guide text is stale on this point; this plan is authoritative. |
| 2 | Dev guide examples use `.jpeg`; actual files are `.jpg` | Plan and code use `.jpg` throughout. |
| 3 | `back.jpg` was reported missing, but already exists in `explodding/` | Treated as the real card back. No placeholder needed. |
| 4 | `feral_cat(joker).jpg` had parens, breaking snake_case convention | Renamed to `feral_cat.jpg`. |
| 5 | `favor1.jpg` broke the "first design unnumbered" convention, and `favor.jpg` was byte-identical to `favor3.jpg` | Deleted the duplicate `favor.jpg`/`favor3.jpg` pair (kept `favor3.jpg`), renamed `favor1.jpg` → `favor.jpg`. Result: `favor.jpg`, `favor2.jpg`, `favor3.jpg`, `favor4.jpg` — 4 distinct designs, consistent numbering. |
| 6 | `nope.jpg` ≡ `nope2.jpg` (byte-identical) | Deleted `nope2.jpg`. Nope has 1 design. |
| 7 | `skip.jpg` ≡ `skip3.jpg` (byte-identical) | Deleted `skip3.jpg`, renamed `skip4.jpg` → `skip3.jpg` to close the numbering gap. Skip has 3 designs (`skip.jpg`, `skip2.jpg`, `skip3.jpg`). |
| 8 | Card quantities per type were undocumented (spec marks as `CONFIG`) | User supplied the full deck-composition table (paw-print/standard/combined tiers). Baked into `exploding-kittens-party-pack-ai-spec.md` §2.1 and `exploding-kittens-party-pack-rules.md`. |
| 9 | Exact per-type cat card breakdown (`CAT_TACOCAT` vs `CAT_HAIRYPOTATO` etc.) unconfirmed from physical deck | By table decision: **even split** across the 5 cat types per tier, remainder assigned in listed order (Tacocat, Hairy Potato, Rainbow, Beard, Cattermelon). See spec §2.1 table. Implemented as an overridable `CAT_BREAKDOWN[tier][catId]` table so real counts can replace it later without touching setup logic. |
| 10 | CONFIG rule options (`attack_stacking`, `combo_scope`, Feral-pair rule, `extra_defuses`) had no chosen defaults | Spec already states defaults (stacking=on, combo_scope=cats-only, Feral-pair=requires-one-real-cat, extra_defuses=all-remaining). Adopted as engine defaults, exposed as room settings per the dev guide. |

### 1.2 Final `explodding/` inventory (post-cleanup)

| Card type | Engine ID | Design count | Files |
|---|---|---|---|
| Exploding Kitten | `EK` | 3 | exploding_kitten[.jpg,2,3] |
| Defuse | `DEF` | 6 | defuse[.jpg,2..6] |
| Nope | `NOPE` | 1 | nope.jpg |
| Attack | `ATK` | 4 | attack[.jpg,2..4] |
| Targeted Attack | `TATK` | 3 | targeted_attack[.jpg,2,3] |
| Skip | `SKIP` | 3 | skip[.jpg,2,3] |
| Favor | `FAV` | 4 | favor[.jpg,2..4] |
| Shuffle | `SHUF` | 4 | shuffle[.jpg,2..4] |
| See the Future | `STF` | 3 | see_the_future[.jpg,2,3] |
| Alter the Future | `ATF` | 4 | alter_the_future[.jpg,2..4] |
| Draw from the Bottom | `DFB` | 2 | draw_from_the_bottom[.jpg,2] |
| Tacocat | `CAT_TACOCAT` | 1 | taco_cat.jpg |
| Hairy Potato Cat | `CAT_HAIRYPOTATO` | 1 | hairy_potato_cat.jpg |
| Rainbow-Ralphing Cat | `CAT_RAINBOW` | 1 | rainbow_cat.jpg |
| Beard Cat | `CAT_BEARD` | 1 | beard_cat.jpg |
| Cattermelon | `CAT_CATTERMELON` | 1 | cattermelon.jpg |
| Feral Cat | `FERAL` | 1 | feral_cat.jpg |
| Card back | (n/a) | 1 | back.jpg |

**Still open, non-blocking:** exact per-type cat counts from the physical box (item #9 above uses a documented even-split placeholder). Revisit before calling the project "feature complete" — not before MVP.

---

## 2. Phased plan

### Phase 0 — Project scaffold

**Goal:** a buildable, empty TypeScript project with the agreed folder structure and tooling, nothing game-specific yet.

Tasks:
1. `npm init`, install deps: `typescript`, `vite`, `react`, `react-dom`, `express`, `socket.io`, `socket.io-client`, `zustand`, `framer-motion` (package name `motion` per dev guide), `howler`, `tailwindcss`, `vitest`, `tsx`, `concurrently`, dev types (`@types/node`, `@types/express`, `@types/react`, `@types/react-dom`).
2. Create folder structure: `src/engine/`, `src/server/`, `src/client/{table,overlays,assets}`.
3. `tsconfig.json` (shared/base), `tsconfig.server.json` (server build target), Vite config, Tailwind config.
4. `package.json` scripts: `dev`, `build`, `start`, `test` (exactly as in the dev guide).
5. Empty `index.html`, `src/client/main.tsx` placeholder, `src/server/index.ts` placeholder (serves a "hello" static page).
6. Git init + first commit (if not already a repo), `.gitignore` (node_modules, dist, .env).

Files created: `package.json`, `tsconfig*.json`, `vite.config.ts`, `tailwind.config.*`, `index.html`, `src/client/main.tsx`, `src/server/index.ts`.

**Done when:** `npm run dev` starts both Vite and the Node server without errors, and `npm run build && npm start` serves a static page from the single Node process.

---

### Phase 1 — Engine (test-driven, pure TypeScript)

**Goal:** every rule in the spec exists as a pure function, fully covered by Vitest, with zero UI or network code.

Tasks (in order, each a red-green slice):
1. `src/engine/types.ts` — `Card`, `CardId` union (incl. per-tier cat IDs), `Player`, `GameState`, `Action`, `PlayerView`, `Config` (`attackStacking`, `comboScope`, `feralPairRule`, `extraDefuses`, `deckTier`, `catBreakdown`).
2. `src/engine/decks.ts` — `CAT_BREAKDOWN` table and deck-tier composition tables from spec §2.1, as pure data.
3. `src/engine/setup.ts` — `createGame(playerNames, config?) → GameState` implementing spec §4 (tier selection, dealing, kitten/defuse insertion, shuffle).
4. `src/engine/actions.ts` — `applyAction(state, action) → GameState`:
   - Turn loop (§5): play phase, draw phase, end-turn bookkeeping, `turns_remaining`.
   - Exploding Kitten resolution (§6): reveal, defuse-and-reinsert, elimination.
   - Nope stack resolution (§7): `pending_action`, `nope_stack`, parity rule, timing.
   - Each card effect (§8.1–8.9): Attack, Targeted Attack, Skip, Favor, Shuffle, See the Future, Alter the Future, Draw from the Bottom, Cat/Feral no-ops.
   - Combos (§9): pair, triple, five-different, with `comboScope`/`feralPairRule` config.
   - Elimination and win condition (§10).
5. `src/engine/view.ts` — `getPlayerView(state, playerId) → PlayerView`: strips other hands, deck order/contents, and reinsertion positions except the viewer's own legitimate knowledge (`known_deck`).
6. `src/engine/rng.ts` — seeded RNG wrapper (so games are reproducible for debugging per dev guide §6), injected into `createGame`/`applyAction` rather than using global `Math.random`.
7. `src/engine/engine.test.ts` (and split files per concern if it grows large) — see §3 Engine Test Plan below; write failing tests first, then the minimal implementation to pass each group.

Files created: `src/engine/{types,decks,setup,actions,view,rng}.ts` + test files.

**Done when:** `npm test` is green and every row of the Engine Test Plan (§3) has a corresponding passing test; `getPlayerView` has an explicit test asserting it never leaks another player's hand, deck contents, or a hidden reinsertion position.

---

### Phase 2 — Table UI, hot-seat (single device, no network)

**Goal:** a full game playable locally on one screen/device, switching the active player's view with a button — this is where the "real card table" feel gets built, deliberately before network latency is in the mix.

Tasks:
1. `src/client/cards.ts` — `import.meta.glob('/explodding/*.jpg', { eager: true, import: 'default' })`, explicit `CARD_TYPE_TO_FILES: Record<CardId, string[]>` table (not guessed from filenames), `assignDesigns(state)` that gives each card *instance* a stable design index for the whole game, `getCardImage(cardId, instanceId)` and `getCardBackImage()`.
2. A small Vitest/unit check: every `CardId` in `src/engine/types.ts` has at least one entry in `CARD_TYPE_TO_FILES`, and every listed file exists in `explodding/` (prevents silent drift between engine IDs and art).
3. Local "fake multiplayer" harness: hold `GameState` in a Zustand store client-side (temporary, just for Phase 2), derive each seat's `PlayerView` via the engine directly (no server yet), with a dev-only "switch active seat" control.
4. `src/client/table/Table.tsx` — felt background, seat layout around the edge, draw pile, discard pile.
5. `src/client/table/Hand.tsx` — fanned arc layout, hover/touch lift, drag-to-play onto discard (Framer Motion drag + layout animations), tap-to-select + "Play" button fallback, multi-select for combos, sideways reorder.
6. `src/client/table/DrawPile.tsx` — stacked/thick-to-thin visual by remaining count, tap/drag-to-draw, flip animation.
7. `src/client/table/DiscardPile.tsx` — messy pile (random rotation/offset per card), tap-to-view history (for five-different combo).
8. `src/client/table/Opponent.tsx` — avatar, nickname, face-down fan sized to hand count, active-player highlight.
9. `src/client/overlays/NopeWindow.tsx` — countdown ring, big Nope button, stub timing logic reused later by the server.
10. `src/client/overlays/SeeTheFuture.tsx` / `AlterTheFuture.tsx` — private top-3 fan-out, drag-to-reorder for Alter.
11. `src/client/overlays/DefuseReinsert.tsx` — slider or drag-into-gap to choose reinsertion position.
12. Wire all card plays through `applyAction` locally; re-render from the resulting `PlayerView`.

Files created: `src/client/cards.ts`, `src/client/table/*.tsx`, `src/client/overlays/*.tsx`, `src/client/main.tsx` updated to mount `Table`.

**Done when:** one person can play a full game end-to-end on one device (switching seats via the dev control) with fanned hand, drag-to-play, flip-on-draw, shrinking/thickening deck, messy discard, and a visible Nope countdown — no network code involved yet.

---

### Phase 3 — Multiplayer (Socket.IO)

**Goal:** the same UI, now driven by a real server over the network for 2–10 real browsers.

Tasks:
1. `src/server/rooms.ts` — `RoomManager`: create/join by 4-letter code, max 10 players, first joiner is host, holds one `GameState` + engine instance per room.
2. `src/server/index.ts` — Express serves `dist/client`; Socket.IO handles `join`, `startGame`, `action`, `nope`, `favorResponse`, etc. Every state-changing event re-emits `getPlayerView(state, socketPlayerId)` to each socket in the room individually — never a broadcast of raw state.
3. Nope window as a server-side timer (3–5s, restarts per Nope) rather than the Phase 2 stub.
4. Turn timer (e.g. 45s) that auto-draws for an inactive player.
5. Reconnection: `playerToken` generated on join, stored in `localStorage`; rejoining with the same token re-seats the player; ~60s grace period before a disconnected seat is dropped.
6. Room settings screen in the lobby exposing the `CONFIG` options (`attackStacking`, `comboScope`, `feralPairRule`, `extraDefuses`) the host picks before starting.
7. Replace the Phase 2 local Zustand harness with real socket-driven state updates.
8. Manual test pass with several browser windows/profiles and at least one real phone.

Files created/changed: `src/server/rooms.ts`, `src/server/index.ts` (expanded), `src/client/` socket client module, lobby/join screens.

**Done when:** 2+ separate browser sessions (including one phone) can create a room, join by code, play a full game with hidden information correctly enforced, survive a refresh/reconnect, and see the Nope timer and turn timer work over the network.

---

### Phase 4 — Deploy

**Goal:** one shareable URL.

Tasks:
1. Ensure server listens on `process.env.PORT`.
2. Confirm `npm run build && npm start` serves everything from one process locally.
3. Push to GitHub (private repo).
4. Deploy on Railway or Render per the dev guide's provider steps; generate a public domain.
5. Run through the pre-deploy checklist from the dev guide §7.
6. Test game with 2–3 real friends on the deployed link.

**Done when:** a friend outside your network can open the link, join a room, and play a full game without you running anything locally.

---

### Phase 5 — Polish

**Goal:** make game night great.

Tasks (roughly priority order):
1. Sounds (Howler.js): draw, play, Nope stamp, explosion, win.
2. Haptics (`navigator.vibrate`) for drawing a kitten and being attacked.
3. Event log sidebar ("Ana played Skip").
4. "Play again" in the same room after `GAME_OVER`.
5. Card image preloading on lobby entry (avoid blank cards mid-game); resized/WebP variants if JPEGs are large on mobile.
6. Animation polish: springs over linear tweens, 150–400ms durations, screen-shake on Exploding Kitten.
7. Portrait-mode handling on phones (rotate prompt, or compact layout).
8. Room cleanup after ~30 min with nobody connected.
9. Resolve the deferred `cat_breakdown` CONFIG item with real per-box counts if/when available.

**Done when:** the dev guide's Quick Checklist (§9) is fully checked off.

---

## 3. Engine test plan

Grouped by spec section. Each row is at least one Vitest case; some need several (one per branch).

### Setup (§4, §2.1)
- Deck tier selection: N=2,3 → paw-print; N=4,7 → standard; N=8,10 → combined.
- Correct total card count per tier (44/71/115) before kittens are added.
- Per-card-type counts match §2.1 table for each tier (including `CAT_BREAKDOWN` sums to 14/20/34).
- Paw-print tier has zero `TATK` and zero `ATF`.
- `N - 1` Exploding Kittens inserted regardless of tier.
- Every player dealt exactly 7 cards + 1 `DEF` = 8-card starting hand.
- Extra `DEF` inserted into deck = `total_DEF_in_tier - N` for N=2 (paw-print), N=5 (standard), N=9 (combined).
- Deck shuffled (statistical/seeded-RNG test, not strict order assertion).
- Rejects N<2 or N>10.

### Turn loop (§5)
- Player may play zero cards and still end turn by drawing.
- Drawing a non-EK card adds it to hand and ends the turn.
- Playing `ATK`/`TATK`/`SKIP`/`DFB` ends the turn without a draw.
- `turns_remaining` decrements correctly and re-grants the same player another turn when >0 after decrement.
- Turn advances to the next **alive** player (skips eliminated seats) when `turns_remaining` reaches 0.
- No hand-size cap enforced anywhere.

### Exploding Kitten / Defuse (§6, §11)
- Drawing `EK` with a `DEF` in hand: `DEF` discarded, player chooses reinsertion position `k` (test k=0, k=mid, k=len(deck)), card placed exactly there, turn ends.
- Drawing `EK` without `DEF`: player eliminated, hand discarded, kitten placed face-up out of play, turn passes to next alive player with `turns_remaining=1`.
- `EK`/`DEF` cannot be Noped (attempted Nope on them is rejected or has no effect).
- Player eliminated while owing extra turns from an attack: remaining owed turns vanish, not passed on.
- `DFB` drawing an `EK` resolves identically to a top-draw `EK`.

### Nope resolution (§7)
- Single Nope cancels the pending action.
- Nope-on-Nope (2 total) → original action resolves.
- Three Nopes (odd) → action cancelled.
- A cancelled card and all Nopes go to discard, never back to a hand.
- A Noped `ATK`/`TATK`/`SKIP`/`DFB` does **not** end the turn; player continues their action phase.
- Any alive player (including the player who played the card) may play Nope.
- An eliminated player cannot play Nope.
- A Noped combo consumes all its cards.

### Each card (§8.1–8.9)
- **Attack:** next alive player gets `turns_remaining=2`; with `attackStacking=on`, attacking while already under attack adds +2 to the carried-over remainder; with `attackStacking=off`, next player simply gets 2 regardless of stacking.
- **Targeted Attack:** chosen opponent receives the turns; play continues clockwise from that target afterward; stacking behaves like Attack.
- **Skip:** decrements `turns_remaining` by 1 and ends only one turn; if `turns_remaining` was >1, the same player immediately continues with a new turn still owed.
- **Favor:** target with ≥1 card must give a card of **their own choosing**; target with 0 cards → no-op, card still consumed.
- **Shuffle:** deck order changes (seeded-RNG check) and invalidates all players' `known_deck`.
- **See the Future:** views `deck[0..2]` (or fewer if deck smaller) without changing order; only the acting player's `known_deck` updates.
- **Alter the Future:** views and reorders `deck[0..2]` arbitrarily; only acting player's `known_deck` updates; deck size unchanged.
- **Draw from the Bottom:** draws `deck[len-1]`; if it's `EK`, resolves via §6; ends the turn.
- **Cat cards / Feral Cat:** playing one standalone (not as part of a combo) is illegal / no-op — only usable inside a combo.

### Combos (§9)
- Pair: 2 same-title cards → take a **random** card from target's hand (test via seeded RNG); Feral Cat may stand in for a cat card.
- Triple: 3 same-title cards → name a card type; if target has it, they must give it; otherwise nothing happens (cards still consumed).
- Five different: 5 differently-titled cards → player takes **any** chosen card from the discard pile.
- `comboScope=cats-only` (default) rejects non-cat combos; `comboScope=any-matching-title` variant allows them.
- Feral-pair rule default: two Feral Cats alone do **not** form a valid pair; at least one real cat required.
- Targeting a player with zero cards: combo has no effect but still consumes the played cards.
- All combo types open a Nope window and can be cancelled.

### Elimination and win condition (§10)
- Eliminated player takes no further turns and cannot be targeted by future turn-order logic as "current".
- `GAME_OVER` phase set exactly when `count(alive) == 1`; that player is reported as the winner.
- Game continues correctly through multiple eliminations in sequence.

### Edge cases (§11, cross-cutting)
- Player holding `NOPE` but no `DEF` draws `EK` → eliminated (Nope cannot save them).
- `ATK` played while already under a stacked attack → correct transferred total per `attackStacking` config.
- `SKIP` played while owing 2 turns → only 1 skipped, 1 still owed.
- `STF`/`ATF` with fewer than 3 cards left in deck → views/reorders only what remains, no out-of-bounds error.
- Defuser reinserts kitten, then another player plays `SHUF` → defuser's tracked position knowledge is invalidated (not just global `known_deck`, specifically the reinsertion-position tracking from §12).
- `NOPE` on a `NOPE` on a `NOPE` (3 total, odd) → cancelled, consistent with the general odd/even rule, not special-cased.
- Deck running out unexpectedly (simulated by breaking the `N-1` invariant intentionally in a test) → engine flags an error rather than drawing from an empty deck.

### Player view / hidden information (cross-cutting, §3)
- `getPlayerView` never includes another player's hand contents (only sizes).
- `getPlayerView` never includes deck order or contents, except positions the requesting player has legitimately seen (`known_deck`) and only until invalidated by shuffle/reorder.
- `getPlayerView` never reveals where any player reinserted a kitten, except to that player.
- Public fields (discard pile, hand sizes, deck size, alive status, `turns_remaining`, play history) are present and accurate for every viewer.

---

## 4. Risks and mitigations

| Risk | Why it's hard | Mitigation |
|---|---|---|
| **Nope window timing** | Needs to feel instant for a shout-"Nope!" moment but still be a deterministic, replayable server-side window with a timeout; race conditions between near-simultaneous Nopes from multiple clients. | Model it as an explicit `NOPE_WINDOW` phase in engine state (already in the spec's state machine) with a server-owned timer; engine processes Nopes as an ordered queue by server receipt time, not client timestamps; test the parity-resolution logic exhaustively in Phase 1 before any network code exists, so by Phase 3 only *latency*, not *logic*, is new risk. |
| **Hidden information leaks** | Any accidental `console.log(state)`, naive `JSON.stringify(state)` to a socket, or a view function that forgets one field can leak a hand or deck order. | `getPlayerView` is the *only* function allowed to touch sockets (enforced by code convention + a lint/review check); dedicated Vitest suite specifically asserting non-leakage (see test plan); server never holds a reference to raw state inside any client-facing emit call — always goes through the view function first. |
| **Reconnection correctness** | A refresh mid-Nope-window, mid-Favor-request, or mid-Defuse-reinsert must not corrupt state or let a reconnecting player replay/see something new. | Room state lives entirely server-side keyed by `playerToken`, not socket ID; on reconnect, re-send the current `PlayerView` as-is (no replay of missed events needed since UI re-renders from a snapshot); test manually for each of the three "mid-interaction" cases in Phase 3. |
| **Card animations on mobile** | Drag gestures, 3D flips and layout animations can jank or conflict with mobile touch-scroll; performance varies widely across phones. | Use Framer Motion's layout/gesture primitives (built for this) rather than hand-rolled transforms; keep animations short (150–400ms per dev guide); build and test the full UI in Phase 2 hot-seat mode on a real phone before multiplayer adds network variables; disable page scroll/bounce on the table view. |
| **Image loading on phones** | 47 JPEGs (some fairly large) could cause blank cards or slow lobby entry on cellular connections. | Preload all card images on lobby entry (per dev guide); consider resizing/WebP conversion at build time if file sizes are large (check actual KB — current files range ~13–45KB, likely fine as-is, but verify before Phase 5 polish); Vite's `eager: true` glob import bundles them so there's no runtime 404 risk. |
| **Unconfirmed cat-type breakdown** | Engine currently uses a guessed even split, not the real box distribution. | Isolated behind a single overridable data table (`CAT_BREAKDOWN`); not a correctness risk for *rules* (combos work the same regardless of exact split), only a minor fidelity gap; flagged in Phase 5 to revisit, not blocking MVP. |

---

## 5. First step

Start Phase 0 in the next session:

1. Confirm the project will live directly in this directory (`C:\Users\LUC\Projetos\expkit2`) as a single repo — there is currently no git repo initialized here; decide whether to `git init` now or after scaffolding.
2. Run through Phase 0's tasks in order: `npm init`, install the dependency list, create the folder structure, write the three config files, add the `package.json` scripts, and verify `npm run dev` boots both Vite and the Node server.
3. Do **not** start Phase 1 engine code in the same session unless Phase 0's "done when" check passes — keep the scaffold a clean, verified checkpoint before any game logic is written.
