# Online Exploding Kittens (Friends Edition) — Development Guide v2

> Goal: a private online version to play with friends, **easy to deploy and maintain**, with a UX that feels like holding a real hand of cards around a real table.

---

## 1. What Changed From v1

Since this is only for friends, the plan drops everything that only matters at scale:

| v1 (public product) | v2 (friends only) |
|---|---|
| Monorepo with 3 packages | **One project, one repo** |
| Next.js app + separate game server | **One Node.js server** that serves the frontend *and* the WebSockets |
| Colyseus | **Socket.IO** (fewer concepts, plenty for 2–10 players) |
| PostgreSQL + Prisma, accounts | **No database.** Rooms live in memory |
| Auth | **Nickname + room code** |
| Two hosting providers | **One deploy, one URL** |

**IP note:** a private game among friends is low risk. Keep the link private and don't publish it, The card images in `explodding/` are for this private group only and must not be redistributed.

---

## 2. Architecture (Single Deploy Unit)

```text
                One Node.js process (one URL)
┌───────────────────────────────────────────────────────────┐
│  Express                                                   │
│   ├── serves the built React app (static files)            │
│   └── Socket.IO                                            │
│         └── RoomManager (in memory)                        │
│               └── Room ──▶ Game engine (pure TypeScript)   │
└───────────────────────────────────────────────────────────┘
          ▲                                   │
          │ actions                           │ filtered player view
          │                                   ▼
                     Browsers (friends' phones / PCs)
```

The key principles from v1 stay the same:

- **The server is authoritative.** The client never receives the deck or other players' hands.
- **The engine is pure TypeScript**: `applyAction(state, action)` and `getPlayerView(state, playerId)`. The AI rules spec in `docs/` is its requirements document (see §4.1).
- **Randomness and timers run on the server.**

---

## 3. Technologies

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One language; engine types shared by client and server |
| Frontend | **React + Vite** (SPA) | Builds to static files the Node server can serve. No SSR needed for a game, so Next.js would only add complexity |
| Animations | **Motion (Framer Motion)** | Layout animations, drag gestures and springs — the core of the "real cards" feel |
| Styling | Tailwind CSS | Fast to iterate |
| Client state | Zustand | Stores the latest player view pushed by the server |
| Sound | Howler.js | Card swish, draw, Nope, explosion |
| Server | Node.js + Express + **Socket.IO** | Simple rooms with `socket.join(roomCode)`; automatic reconnection |
| Tests | Vitest | For the engine |
| Hosting | **Railway** or **Render** (single service) | Connect the GitHub repo and it builds and deploys on every push |

---

## 4. Project Structure

```text
exploding-friends/
├── docs/                # game rules and specification (reference material)
│   ├── exploding-kittens-party-pack-rules.md
│   └── exploding-kittens-party-pack-ai-spec.md
├── explodding/          # one JPEG per card type (card art)
├── src/
│   ├── engine/          # pure game logic (no I/O)
│   │   ├── types.ts
│   │   ├── setup.ts
│   │   ├── actions.ts   # applyAction
│   │   ├── view.ts      # getPlayerView
│   │   └── engine.test.ts
│   ├── server/
│   │   ├── index.ts     # Express + Socket.IO, serves dist/client
│   │   └── rooms.ts     # RoomManager, Nope timer, reconnection
│   └── client/
│       ├── main.tsx
│       ├── table/       # Table, Hand, DrawPile, DiscardPile, Opponent
│       ├── overlays/    # SeeTheFuture, DefuseReinsert, NopeWindow
│       ├── cards.ts     # maps card IDs to images in explodding/
│       └── assets/      # sounds, table textures, UI icons
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx watch src/server/index.ts\"",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node dist/server/index.js",
    "test": "vitest"
  }
}
```

In development, Vite proxies `/socket.io` to the Node server. In production, the Node server serves `dist/client` and Socket.IO on the same port, so there is no CORS setup and only one URL.

### 4.1 Reference material in the repository

The repository already contains the game's source of truth for rules and card art. Read these before writing code.

#### `docs/` — rules and specification

| File | Content | Used for |
|---|---|---|
| `exploding-kittens-party-pack-rules.md` | Full human-readable rules of the game | Understanding the game; in-game help screen text |
| `exploding-kittens-party-pack-ai-spec.md` | Formal specification: game state, turn loop, card effects, Nope resolution, combos, edge cases, `CONFIG` options | **Requirements for `src/engine/`** — each section and edge case should become engine code and Vitest tests |

When the engine's behavior and these documents disagree, update one of them deliberately so they stay in sync. The `CONFIG` options listed in the spec become the room settings the host chooses in the lobby.

#### `explodding/` — card images

Contains **one JPEG for each card type** in the game (Exploding Kitten, Defuse, Nope, Attack, Targeted Attack, Skip, Favor, Shuffle, See the Future, Alter the Future, Draw from the Bottom, each Cat card and Feral Cat). Since every copy of a card type looks the same, the client only needs one image per type and renders it as many times as needed.

How to use them in the client:

- **Map card IDs to images in one place** (`src/client/cards.ts`). The engine works only with card IDs (`ATK`, `DEF`, `CAT_TACOCAT`…); the client looks up the image for each ID. The engine never references image files.
- **Load them through Vite** so they're bundled and cache-busted, for example with `import.meta.glob('/explodding/*.jpeg', { eager: true, import: 'default' })`, and match filenames to card IDs.
- **Keep file names consistent** with the card IDs (e.g. `attack.jpeg`, `targeted-attack.jpeg`) so the mapping stays simple; add a check (a small test) that every card ID in the engine has an image.
- **Card back:** face-down cards (opponents' hands, the draw pile) need a back design. If `explodding/` doesn't include one, add `explodding/back.jpeg` or draw it in CSS.
- **Optimize for mobile:** if the JPEGs are large, generate resized versions at build time (or convert to WebP) so the game loads quickly on phones. Preload all card images when the player enters the lobby, so no card appears blank during play.
- **Private use only:** the images are for this friends' group; keep the deployed link private.

---

## 5. Real-Card UX Design

The aim is for the screen to look and behave like a table: your hand at the bottom, the draw pile ("monte") and discard pile in the middle, friends seated around the edges.

### 5.1 Table layout

```text
            [Friend 2: 🂠🂠🂠🂠]      [Friend 3: 🂠🂠🂠]
  [Friend 1:                                      [Friend 4:
   🂠🂠🂠🂠🂠]        ┌──────┐   ┌──────┐            🂠🂠]
                    │ DECK │   │DISCARD│
                    │ ▓▓▓▓ │   │  ⚔️   │
                    └──────┘   └──────┘
                ╱  🃏  🃏  🃏  🃏  🃏  🃏  ╲
                       (your hand, fanned)
```

- **Felt-table background** with subtle texture and soft shadows.
- **Opponents** shown around the table as avatars with a small fan of card backs (count = their hand size). The active player is highlighted, with a turn timer ring.
- **Landscape on phones**, with a "rotate your device" prompt in portrait (or a compact portrait layout as a later improvement).

### 5.2 Your hand

- **Fanned arc:** each card is rotated and offset along a curve, overlapping like a hand held in real life. The fan adapts its spread to the number of cards.
- **Hover/touch lift:** the selected card rises, scales up slightly and straightens.
- **Drag to play:** drag a card onto the discard pile to play it. Releasing elsewhere snaps it back to the hand with a spring. Tap-to-select + "Play" button as an accessible alternative.
- **Combos:** tap several cards to select them (they lift together), then drag or press "Play combo".
- **Reorder your hand** by dragging cards sideways.

### 5.3 Draw pile ("monte")

- Rendered as a **stack with visible thickness** (several offset layers), which gets **thinner as cards are drawn** — players can feel the danger rising.
- **Drawing:** tap or drag from the deck. The top card slides toward your hand and **flips** (3D CSS rotation) on the way.
- **Drawing an Exploding Kitten:** the card flips in the center of the table, screen shake, explosion sound and animation. If you have a Defuse, it's highlighted to play.
- **Defuse reinsertion:** the deck "opens" sideways and you drag the kitten into the gap you choose, or use a slider ("Top … Bottom"). Other players only see the kitten disappear into the deck.

### 5.4 Discard pile

- Each card lands with a **slight random rotation and offset**, like a real messy pile.
- Played cards **fly from the player's seat** to the pile, so everyone sees who played what.
- Tapping the pile shows a scrollable history (useful for the 5-different-cards combo).

### 5.5 Special moments

| Moment | Effect |
|---|---|
| Nope window | A countdown ring around the played card; a big "NOPE" button pulses for everyone holding one. Each Nope stamps onto the card with a thud and resets the ring |
| See the Future / Alter the Future | The top 3 cards slide out of the deck face up, only on your screen; for Alter, drag them to reorder |
| Attack / Targeted Attack | An arrow sweeps toward the target player; their seat shows "×2" (or stacked count) |
| Favor | The target sees their hand enlarged with "Choose a card to give"; the card flies across the table |
| Pair / triple steal | The target's card backs shuffle; the chosen card flies to the thief |
| Elimination | The player's seat greys out with the kitten placed face up in front of them |
| Win | Confetti, final ranking, "Play again" button keeping the same room |

### 5.6 Feel details

- Use **springs, not linear tweens**, for card movement (Motion's `type: "spring"`).
- Give every action **a sound and a short animation** — that's most of what makes digital cards feel physical.
- Add **haptics on mobile** (`navigator.vibrate`) for drawing a kitten and being attacked.
- Keep animations **short (150–400 ms)** so the game never feels slow.
- **Event log** at the side ("Ana played Skip") for anyone who looked away.

---

## 6. Server Essentials

- **Rooms:** 4-letter room code, max 10 players, first player is the host and starts the game.
- **Joining:** nickname only. Store a random `playerToken` in `localStorage` so refreshing the page reconnects you to the same seat.
- **Reconnection:** keep a disconnected player's seat for ~60 s. During their turn, a turn timer (e.g. 45 s) auto-draws if they don't act.
- **Nope window:** a server-side phase with a 3–5 s timer that restarts on each Nope.
- **Hidden info:** after every action, emit `getPlayerView(state, playerId)` to each socket individually — never broadcast the raw state.
- **Seeded RNG:** keep the seed and action log per game to reproduce bugs.
- **Cleanup:** delete rooms after ~30 min with nobody connected.

Since rooms live in memory, a redeploy ends running games. For a friends' game this is fine — just don't deploy during game night.

---

## 7. Deployment

### Option A — Railway (recommended)

1. Push the repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Railway detects Node, runs `npm run build` then `npm start`.
4. Make sure the server listens on `process.env.PORT`.
5. Generate a public domain in the service settings and share the link with your friends.

Every `git push` to `main` redeploys automatically. It's a low-cost paid service, but a small game like this uses very little.

### Option B — Render (free tier possible)

Same flow (**New Web Service → connect repo**, build command `npm run build`, start command `npm start`). On the free tier the service **sleeps when idle** and takes about a minute to wake up — open the link a minute before game night.

### Pre-deploy checklist

- [ ] Server uses `process.env.PORT`
- [ ] Production serves `dist/client` from Express
- [ ] Socket.IO client connects to the same origin (no hard-coded URLs)
- [ ] `npm run build && npm start` works locally

Check the providers' current pricing and free-tier limits before choosing, as these change often.

---

## 8. Workflow

| Step | Goal | Done when |
|---|---|---|
| 1. Engine (test-driven) | All rules from `docs/` as pure functions | Vitest covers setup, stacked attacks, Nope chains, defusing, combos and elimination |
| 2. Table UI, hot-seat | Real-card feel on one screen | Full game playable locally with all hands on one device (switch player with a button), with fan, drag, flip and pile animations |
| 3. Multiplayer | Play over the internet | Socket.IO rooms, room codes, per-player views, Nope timer, reconnection; tested with several browser windows and a phone |
| 4. Deploy | One shareable link | App runs on Railway/Render and a test game with 2–3 friends works |
| 5. Polish | Make game night great | Sounds, haptics, event log, "play again", custom rule toggles (`CONFIG` options from the AI spec) |

**MVP = end of step 4.** Build the UX in step 2 before multiplayer: animating cards is much easier to iterate on without network delays in the way.

---

## 9. Quick Checklist

- [ ] Single repo with `engine`, `server`, `client` folders
- [ ] Engine follows the spec in `docs/`
- [ ] Every card ID mapped to an image in `explodding/` (plus a card back)
- [ ] Engine fully tested
- [ ] `getPlayerView` never leaks hands or deck order
- [ ] Fanned hand, drag-to-play, flip-on-draw, thick-then-thin deck, messy discard pile
- [ ] Nope countdown visible to everyone
- [ ] Nickname + room code, reconnect via `localStorage` token
- [ ] Turn timer and room cleanup
- [ ] Deployed as one service, one URL
- [ ] Link kept private
