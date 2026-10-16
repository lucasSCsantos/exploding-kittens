# Exploding Kittens: Party Pack — Rules Reference

> A summary of the rules written in plain language. Card quantities and any player-count adjustments can differ between print runs, so check the rulebook in your box if something here doesn't match your cards.

## Overview

- **Players:** 2–10
- **Goal:** Be the last player who hasn't exploded.
- **How you lose:** Draw an Exploding Kitten without a Defuse card to save you.

The deck is a pile of mostly helpful cards with a few Exploding Kittens hidden inside. On each turn you play cards to dodge, manipulate, or pass the danger to others, then draw. As the deck shrinks, the odds of drawing a kitten go up.

---

## Deck Composition

The box has two sub-decks: cards with a **paw-print icon** and cards **without** it. Use:

- **2–3 players:** paw-print deck only (44 cards)
- **4–7 players:** standard deck only (71 cards)
- **8–10 players:** both decks combined (115 cards)

| Card | Engine ID | Paw-print deck (2–3 players) | Standard deck (4–7 players) | Combined (8–10 players) |
|---|---|---|---|---|
| Defuse | `DEF` | 3 | 7 | 10 |
| Nope | `NOPE` | 5 | 5 | 10 |
| Attack | `ATK` | 4 | 4 | 8 |
| Targeted Attack | `TATK` | — | 3 | 3 |
| Skip | `SKIP` | 4 | 6 | 10 |
| Favor | `FAV` | 2 | 4 | 6 |
| Shuffle | `SHUF` | 2 | 4 | 6 |
| See the Future | `STF` | 4 | 4 | 8 |
| Alter the Future | `ATF` | — | 6 | 6 |
| Draw from the Bottom | `DFB` | 4 | 4 | 8 |
| Feral Cat | `FERAL` | 2 | 4 | 6 |
| Cat cards (no effect) | `CAT_*` | 14 | 20 | 34 |
| **Total (without Exploding Kittens)** | | **44** | **71** | **115** |

- **Exploding Kittens are not part of these counts.** They are always added separately: number of players − 1.
- **Defuse count equals the deck's maximum player count** (3, 7, 10): each player gets 1 and the rest go into the draw pile.
- **The paw-print deck has no Targeted Attack or Alter the Future.**
- **Cat cards per type:** the paw-print deck's 14 cats include Beard Cat, Tacocat, Cattermelon and Hairy Potato Cat; the standard deck's 20 include Tacocat, Hairy Potato Cat and others. The exact count of each cat type per deck still needs to be confirmed from the physical cards (`CONFIG cat_breakdown`).

---

## Setup

1. **Choose the deck** for your number of players (see above) and put the unused cards back in the box. Take out all Defuse cards.
2. **Shuffle** the remaining cards and **deal 7 cards** face down to each player.
3. **Give each player 1 Defuse card**, so everyone starts with 8 cards. Players may look at their own hand.
4. **Insert Exploding Kittens** into the deck: use **one fewer than the number of players** (e.g., 5 players → 4 kittens). Return any extra kittens to the box.
5. **Insert the remaining Defuse cards** into the deck (e.g. 5 players with the standard deck: 7 − 5 = 2 Defuses go in).
6. **Shuffle** the deck and place it face down in the middle of the table. Leave space for a discard pile.
7. Choose a first player (traditionally, whoever looks most like a cat) and play proceeds clockwise.

---

## Turn Structure

On your turn:

1. **Play cards (optional).** Play as many cards as you want, one at a time, by placing them face up on the discard pile and following their instructions. You may also play nothing.
2. **End your turn by drawing** the top card of the draw pile — unless a card you played (like Skip or Attack) ends your turn without drawing.

Then play passes to the next player.

**Tip:** Keep your hand size in mind — there's no maximum hand size.

---

## Exploding Kittens and Defusing

- When you draw an **Exploding Kitten**, you must **reveal it immediately**.
- If you have a **Defuse** card, play it. Then take the Exploding Kitten and **secretly put it back into the draw pile anywhere you like** (top, bottom, somewhere in the middle). You may hold the deck under the table to keep its position secret.
- If you **don't** have a Defuse, you **explode** and are out of the game. Place the kitten face up in front of you so everyone knows it's gone; your remaining cards are discarded (or put in front of you face up — they no longer count).
- After defusing, your turn is over.

---

## Card Reference

### Exploding Kitten
Reveal immediately when drawn. Defuse it or you're out.

### Defuse
Play when you draw an Exploding Kitten to survive, then secretly reinsert the kitten into the draw pile. This is the only use of a Defuse card.

### Nope
Stops the action of any other card (except an Exploding Kitten or a Defuse).
- Can be played **at any time**, even when it isn't your turn.
- A Nope can be Noped ("Yup"), and so on — chains resolve from the last card played.
- A Noped card stays in the discard pile; it doesn't return to anyone's hand.
- You can Nope a cat card combo (pair, triple, etc.).

### Attack
End your turn **without drawing**. The next player must take **2 turns** in a row.
- If the attacked player plays an Attack on any of their turns, their remaining turns are passed on, and the next player takes those turns **plus 2** (attacks stack).

### Targeted Attack
Same as Attack, but **you choose which player** must take the turns. Play continues from that player afterward. Stacks the same way as a regular Attack.

### Skip
End **one** turn without drawing. If you are taking multiple turns because of an Attack, a Skip only ends one of them.

### Favor
Choose another player. They must give you **one card of their choice** from their hand.

### Shuffle
Shuffle the draw pile thoroughly (useful when you know a kitten is coming).

### See the Future
Privately look at the **top 3 cards** of the draw pile, then return them in the same order. Don't show anyone.

### Alter the Future
Privately look at the **top 3 cards** of the draw pile and **rearrange them in any order**, then return them to the top.

### Draw from the Bottom
End your turn by drawing the **bottom** card of the draw pile instead of the top.

### Cat Cards
Cat cards (such as Tacocat, Hairy Potato Cat, Rainbow-Ralphing Cat, Beard Cat, and Cattermelon) have **no effect on their own**. They're only useful in combos (see below).

### Feral Cat
A **wild** cat card. It can stand in for any cat card when making a combo. It has no effect on its own.

---

## Special Combos

Combos are played on your turn like any other card and can be Noped.

| Combo | Effect |
|---|---|
| **Two of a kind** (2 matching cards) | Pick another player and take a **random** card from their hand. |
| **Three of a kind** (3 matching cards) | Name a specific card and pick a player. If they have it, they must give it to you. If not, you get nothing. |
| **Five different cards** (5 cards with different titles) | Look through the discard pile and take **any one card** you want. |

- Feral Cats can be used as any cat in a pair or triple.
- Many groups allow combos with any matching card titles (not only cats) — a common house-rule-friendly reading. Agree on this before starting.

---

## Winning

The game ends when only **one player** has not exploded. That player wins.

---

## Quick Clarifications

- **You must draw** to end a normal turn — there's no passing.
- **Exploding Kittens can't be Noped**, and neither can Defuse cards.
- **Being attacked** doesn't stop you from playing cards; you play cards normally on each of your turns.
- **Card positions are secret:** when reinserting a kitten, others shouldn't see where it goes.
- **Out of cards in the deck?** It won't happen in normal play — there's always one kitten fewer than players, so the game ends before the deck runs out.

---

## Optional House Rules (Party-Friendly)

- **Fast game:** Deal fewer cards (e.g., 4 + Defuse) for quicker, more chaotic rounds.
- **Big groups (8–10 players):** Consider removing some Defuses from the deck so the game doesn't drag.
- **Nope speed rule:** Once the next action starts, it's too late to Nope the previous card.
