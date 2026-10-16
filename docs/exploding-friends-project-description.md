# Exploding Friends — Project Description

> *Working title.* A private, browser-based version of the card game Exploding Kittens (Party Pack), made for playing online with friends.

---

## 1. Summary

**Exploding Friends** is a small web application that lets a group of 2 to 10 friends play Exploding Kittens together from their own phones or computers, wherever they are. One person creates a room, shares a code, and everyone joins with just a nickname — no accounts, no installation.

The project's defining goal is that it should **feel like playing the physical game**: holding a fanned hand of cards, watching the draw pile shrink, slapping cards onto a messy discard pile, and reacting in real time when someone shouts "Nope!".

---

## 2. Background and Motivation

Exploding Kittens is a fast, chaotic party game that works best with a group in the same room. When friends are apart, there's no simple way to play it together that keeps the energy of the table version.

This project exists to fill that gap for one specific group of friends. It is a **personal project**, not a commercial product, which allows it to stay simple: it only needs to work well for a handful of people on game night.

---

## 3. Audience

| Who | Needs |
|---|---|
| **Players** — a private group of friends | Join quickly, understand what's happening, enjoy the game on phone or PC |
| **Host** — whoever opens the room | Create a room, share a code, start the game, play again |
| **Maintainer** — the developer | Easy to deploy, cheap to run, simple to change |

The game is **not** intended for public release. Access is through a private link shared within the group.

---

## 4. Goals

1. **Faithful rules.** Play by the Exploding Kittens Party Pack rules, including all card effects, combos and the Nope reaction system.
2. **Real-card feel.** The interface behaves like a physical card table, not like a menu of buttons.
3. **Zero friction to join.** Open a link, type a nickname, enter a room code, play.
4. **Fair hidden information.** No player can see another's hand or the order of the deck, even with technical knowledge.
5. **Easy to run.** One service, one link, deployed automatically from the code repository.

## 5. Non-Goals

- Public matchmaking, rankings or playing with strangers
- User accounts, profiles or long-term statistics
- Monetization of any kind
- Reproducing the official card artwork
- Supporting thousands of simultaneous players

---

## 6. How a Game Night Works

1. **Create a room.** The host opens the link and creates a room. A short code (e.g. `KTZB`) is generated.
2. **Invite friends.** The host shares the code in the group chat. Friends open the same link, enter a nickname and the code.
3. **Lobby.** Everyone appears seated around a virtual table. The host can adjust optional rule settings and starts the game.
4. **Play.** Cards are dealt automatically. Players take turns playing cards and drawing from the deck until only one remains.
5. **Play again.** At the end, a results screen shows the winner and lets the group start a new round in the same room.

If someone's connection drops or they refresh the page, they return to their seat automatically.

---

## 7. The Game

The game follows the **Exploding Kittens Party Pack** rules for 2–10 players.

- The deck contains helpful action cards and a few **Exploding Kittens** (one fewer than the number of players).
- On each turn a player may play any number of cards, then must draw one.
- Drawing an Exploding Kitten eliminates the player — unless they play a **Defuse** and secretly put the kitten back into the deck.
- The last player standing wins.

**Cards included:** Exploding Kitten, Defuse, Nope, Attack, Targeted Attack, Skip, Favor, Shuffle, See the Future, Alter the Future, Draw from the Bottom, five types of Cat cards and the wild Feral Cat.

**Combos:** pairs (steal a random card), triples (ask for a specific card) and five different cards (take a card from the discard pile).

Rules that vary between editions or tables — such as whether attacks stack or which cards can form combos — are available as **room settings** the host chooses before starting.

The complete rules are documented in two companion files:
- `exploding-kittens-party-pack-rules.md` — human-readable rules
- `exploding-kittens-party-pack-ai-spec.md` — precise specification of game state and rule resolution

---

## 8. Experience and Interface

### The table
The screen represents a card table seen from the player's seat. The **draw pile** and **discard pile** sit in the center. Friends are arranged around the edges, each shown with an avatar, their nickname and a small fan of face-down cards showing how many they hold. The active player is clearly highlighted.

### The hand
Your cards are held at the bottom of the screen in a **fanned arc**, overlapping like a real hand. Touching a card lifts it; dragging it onto the discard pile plays it. Several cards can be lifted together to play a combo, and cards can be rearranged by sliding them sideways.

### The draw pile
The deck appears as a physical stack whose **thickness shrinks** as the game goes on, making the growing danger visible. Drawn cards slide toward your hand and flip over on the way.

### Key moments
- **Exploding Kitten drawn:** the card flips in the middle of the table with a shake, sound and explosion effect.
- **Defuse:** the player chooses where to slide the kitten back into the deck; others only see it disappear.
- **Nope:** a countdown appears around the played card, and anyone holding a Nope can stamp it. Each Nope restarts the countdown.
- **Attack:** an arrow sweeps toward the target, whose seat shows how many turns they now owe.
- **See / Alter the Future:** the top three cards fan out privately for that player only.
- **Elimination and victory:** eliminated players' seats grey out; the winner gets a celebration screen.

### Feel
Movement uses soft, springy animations; every action has a sound; phones vibrate on important moments. An event log lets anyone who looked away catch up ("Ana played Skip").

### Devices
Designed for both phones (landscape) and computers, so friends can play from whatever they have at hand.

---

## 9. Visual Identity

The game uses its **own artwork and theme**, inspired by the spirit of the original but not copying its illustrations. The visual style is playful and colorful, set on a felt-table background, with clear, readable cards on small screens.

---

## 10. Technical Overview

- A **single web service** delivers both the game interface and the real-time connection between players.
- The **server is the referee**: it holds the deck and all hands, validates every move, and sends each player only what they are allowed to see.
- Rooms exist **only while being played**; no database is required.
- Built with **TypeScript**, a **React** interface and **real-time WebSocket** communication.
- Hosted on a simple cloud platform that **redeploys automatically** when the code changes.

Implementation details, technology choices and the development plan are described in `online-exploding-kittens-dev-guide.md`.

---

## 11. Constraints and Assumptions

- Expected use: one or a few rooms at a time, occasional game nights.
- Players are trusted friends; there is no moderation or anti-abuse system beyond hidden-information protection.
- Updating the service ends games in progress, which is acceptable for this audience.
- The project is for private use only; the link is not published.

---

## 12. Success Criteria

The project is successful when:

- A group of friends can go from receiving a link to playing within **one minute**.
- A full game runs from start to finish **without rule errors** or stuck turns.
- No player can discover hidden cards or deck order.
- Players describe it as **feeling like the real game**.
- The group chooses to play it again on another night.

---

## 13. Possible Future Additions

- Computer-controlled players to fill empty seats
- Spectator mode for eliminated players or late arrivals
- Additional expansion cards
- Custom card themes made by the group
- Simple per-room history of who won each round
