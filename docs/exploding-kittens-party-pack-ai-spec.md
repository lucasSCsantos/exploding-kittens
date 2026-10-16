# Exploding Kittens: Party Pack — Game Specification for AI Agents

## 0. Purpose and Conventions

This document describes the game as a formal system so that an AI agent can act as a **player**, **referee/game engine**, or **rules assistant**. It defines game state, legal actions, resolution order, and edge cases.

**Conventions**

- `MUST` = mandatory rule. `MAY` = allowed option. `CONFIG` = a parameter that varies by edition or table agreement; the agent should ask or use the stated default.
- "Deck" = the face-down draw pile. Index `0` = top card. Index `len-1` = bottom card.
- "Hidden information" = information a given player is not allowed to see. An agent acting as a player MUST NOT use information it should not have.
- Card quantities differ between print runs. Treat counts as `CONFIG` and read them from the physical deck or the user when exact counts matter.

---

## 1. Objective

- Each player tries to avoid drawing an **Exploding Kitten** without a **Defuse**.
- A player who fails to defuse is **eliminated**.
- The game ends when exactly **one** player remains. That player wins.

---

## 2. Components (Card Types)

| ID | Card | Category | Playable on own turn | Playable off-turn | Ends turn |
|---|---|---|---|---|---|
| `EK` | Exploding Kitten | Hazard | No (auto-revealed on draw) | No | — |
| `DEF` | Defuse | Response | Only when resolving a drawn `EK` | No | Yes (draw step completes) |
| `NOPE` | Nope | Reaction | Yes | **Yes** | No |
| `ATK` | Attack | Action | Yes | No | Yes, without drawing |
| `TATK` | Targeted Attack | Action | Yes | No | Yes, without drawing |
| `SKIP` | Skip | Action | Yes | No | Ends one turn, without drawing |
| `FAV` | Favor | Action | Yes | No | No |
| `SHUF` | Shuffle | Action | Yes | No | No |
| `STF` | See the Future | Action | Yes | No | No |
| `ATF` | Alter the Future | Action | Yes | No | No |
| `DFB` | Draw from the Bottom | Action | Yes | No | Yes, by drawing bottom card |
| `CAT_*` | Cat cards (Tacocat, Hairy Potato Cat, Rainbow-Ralphing Cat, Beard Cat, Cattermelon) | Combo-only | Only as part of a combo | No | No |
| `FERAL` | Feral Cat | Wild combo card | Only as part of a combo | No | No |

---

## 2.1 Deck Composition by Player Count

The box contains two sub-decks: cards with a **paw-print icon**, and cards without it. The base deck (everything except `EK`) is selected by player count `N` and is `CONFIG deck_tier`, fully determined by `N` (not a free table choice):

- `2 ≤ N ≤ 3` → **paw-print** deck only (44 cards)
- `4 ≤ N ≤ 7` → **standard** deck only (71 cards)
- `8 ≤ N ≤ 10` → **combined** (paw-print + standard) deck (115 cards)

| Engine ID | Paw-print (2–3p) | Standard (4–7p) | Combined (8–10p) |
|---|---|---|---|
| `DEF` | 3 | 7 | 10 |
| `NOPE` | 5 | 5 | 10 |
| `ATK` | 4 | 4 | 8 |
| `TATK` | 0 | 3 | 3 |
| `SKIP` | 4 | 6 | 10 |
| `FAV` | 2 | 4 | 6 |
| `SHUF` | 2 | 4 | 6 |
| `STF` | 4 | 4 | 8 |
| `ATF` | 0 | 6 | 6 |
| `DFB` | 4 | 4 | 8 |
| `FERAL` | 2 | 4 | 6 |
| `CAT_*` (all types combined) | 14 | 20 | 34 |
| **Total (excl. `EK`)** | **44** | **71** | **115** |

- `EK` is never part of these totals; it is always inserted separately as `N - 1` (§4).
- Total `DEF` per tier equals that tier's maximum player count (3, 7, 10): each player is dealt 1, the rest (`total_DEF - N`) go back into the deck (§4 step 8).
- The paw-print deck has no `TATK` and no `ATF`.

**`CONFIG cat_breakdown`** — the exact per-type cat count has not been confirmed from the physical cards. By table decision, cats are split **as evenly as possible** across the 5 types (`CAT_TACOCAT`, `CAT_HAIRYPOTATO`, `CAT_RAINBOW`, `CAT_BEARD`, `CAT_CATTERMELON`), with any remainder assigned in that listed order:

| Tier | `CAT_TACOCAT` | `CAT_HAIRYPOTATO` | `CAT_RAINBOW` | `CAT_BEARD` | `CAT_CATTERMELON` | Sum |
|---|---|---|---|---|---|---|
| Paw-print (14) | 3 | 3 | 3 | 3 | 2 | 14 |
| Standard (20) | 4 | 4 | 4 | 4 | 4 | 20 |
| Combined (34) | 7 | 7 | 7 | 7 | 6 | 34 |

Engine setup MUST read this from a named, overridable `CAT_BREAKDOWN[tier][catId]` table (not hard-code it inline), so the real per-box numbers can replace this even split later without touching setup logic. Combined-tier counts are the sum of the paw-print and standard rows (consistent with "combined = both sub-decks together").

---

## 3. Game State Model

```text
GameState {
  players:          ordered list of Player (seating order, clockwise)
  current_player:   index into players
  turns_remaining:  integer ≥ 1   // turns the current player must still take
  deck:             ordered list of Card (index 0 = top)
  discard:          ordered list of Card (face up, public)
  pending_action:   Action | null // an action awaiting Nope window
  nope_stack:       list of NOPE plays on pending_action
  phase:            SETUP | ACTION | NOPE_WINDOW | DRAW | DEFUSE_REINSERT | GAME_OVER
}

Player {
  id
  hand:        list of Card (hidden from others)
  alive:       boolean
  known_deck:  private knowledge of deck positions (from STF / ATF / own reinsertion)
}
```

**Public information:** discard pile contents and order, hand sizes, deck size, who is alive, turns_remaining, every card played and its target.

**Private information:** each player's hand; deck order (except what a player has legitimately seen); where a Defused kitten was reinserted (known only to the defuser).

---

## 4. Setup Procedure

```text
1. Let N = number of players (2 ≤ N ≤ 10).
2. Select the base deck by N (§2.1): paw-print (2-3), standard (4-7), or combined (8-10).
3. Remove all DEF from the base deck. (EK is not part of the base deck; see step 6.)
4. Shuffle the remaining cards.
5. Deal 7 cards to each player.
6. Give each player exactly 1 DEF. (Hand size = 8.)
7. Insert (N - 1) EK into the deck. Return extra EK to the box.
8. Insert extra DEF into the deck:  CONFIG extra_defuses
     default: all remaining DEF = total_DEF_in_tier - N
     e.g. standard deck (total_DEF = 7), N = 5 → insert 2
9. Shuffle the deck.
10. Choose a starting player. Set turns_remaining = 1.
```

**Invariant:** at setup, `count(EK in deck) = N - 1`. Because one player is eliminated per exploded kitten and the game ends at one survivor, the deck cannot run out of kittens before the game ends. Elimination is the only way kittens leave play.

---

## 5. Turn Loop

```text
while count(alive players) > 1:
    p = current_player
    turns_remaining starts as set by previous effects (default 1)

    TURN for p:
        ACTION PHASE:
            p MAY play any number of legal cards/combos, one at a time.
            Each play opens a NOPE_WINDOW before it resolves (see §7).
            If a played card ends the turn (ATK, TATK, SKIP, DFB), go to END_TURN.
        DRAW PHASE (if turn not already ended):
            p draws deck[0] (top card).
            If the card is EK → resolve §6.
            Otherwise add it to p's hand.
        END_TURN:
            turns_remaining -= 1   (unless ATK/TATK transferred turns, see §8.1)
            if turns_remaining > 0 and p is alive: p takes another turn.
            else: advance current_player to next alive player clockwise;
                  set turns_remaining = 1 (unless set by an attack).
```

Notes:
- There is no "pass". A turn ends only by drawing (top or bottom) or by a card that ends it without drawing.
- There is no maximum hand size.
- A player MAY play zero cards.

---

## 6. Exploding Kitten Resolution

```text
on draw of EK by player p:
    reveal EK publicly (MUST)
    if p has DEF in hand:
        p MAY choose to play DEF (a rational agent always does unless it wants to lose)
        discard DEF
        phase = DEFUSE_REINSERT
        p chooses integer position k, 0 ≤ k ≤ len(deck)
        insert EK at deck[k]   (secretly; k is known only to p)
        the turn's draw is complete → END_TURN
    else:
        p.alive = false
        EK is placed face up in front of p (out of play, not reshuffled)
        p's hand is discarded / removed from play
        if p had remaining turns from an attack, they are lost (not passed on)
        advance to next alive player with turns_remaining = 1
```

- `EK` and `DEF` **cannot be Noped**.
- Reinsertion position is a strategic choice. Common choices: `k = 0` (next player draws it immediately), `k = 1`, `k = len(deck)` (bottom, safest for self), or a random-looking position.

---

## 7. Nope Resolution (Reaction Stack)

Any played action card or combo (not `EK`, not `DEF`) creates a `pending_action` and opens a **Nope window**.

```text
NOPE_WINDOW:
    any alive player (including the one who played the card) MAY play NOPE.
    each NOPE is pushed onto nope_stack.
    a NOPE may itself be Noped; the window stays open after each NOPE.
    the window closes when no player wants to play another NOPE.

RESOLUTION:
    if len(nope_stack) is odd  → pending_action is cancelled
    if len(nope_stack) is even → pending_action resolves normally
    all played cards (action + all NOPEs) go to discard.
```

- A cancelled card is **not** returned to the player's hand.
- A Noped `ATK`/`TATK`/`SKIP`/`DFB` does **not** end the turn; the player continues their action phase.
- A Noped combo uses up all its cards.
- `NOPE` is the only card playable off-turn.
- Timing: once the next action begins resolving, earlier actions can no longer be Noped. For an AI engine, implement an explicit "anyone Nope?" prompt with a short timeout or a round of passes.

---

## 8. Card Effects (Precise)

### 8.1 Attack (`ATK`)
```text
effect:
    current turn ends immediately, no draw
    next = next alive player clockwise
    if current player was themselves under attack (turns_remaining > 1 before playing):
        next.turns_remaining = (current turns_remaining remaining) + 2   // stacking rule
    else:
        next.turns_remaining = 2
```
`CONFIG attack_stacking`: default **stacking** (modern rules). Older printings: next player simply takes 2 turns regardless (no stacking). Confirm with the table.

### 8.2 Targeted Attack (`TATK`)
Same as `ATK`, but the player **chooses any alive opponent** as the target. Play then continues clockwise **from the target**. Stacking follows `attack_stacking`.

### 8.3 Skip (`SKIP`)
Ends **one** turn without drawing. If `turns_remaining > 1`, decrement by 1 and the same player continues with a new turn.

### 8.4 Favor (`FAV`)
Choose an alive opponent with at least one card. That opponent **chooses** one card from their hand and gives it to the player. The giver chooses, not the receiver. If the target has 0 cards, nothing happens.

### 8.5 Shuffle (`SHUF`)
Randomly shuffle the deck. All players' `known_deck` information is invalidated.

### 8.6 See the Future (`STF`)
The player privately views `deck[0..2]` (fewer if the deck is smaller). Order is unchanged. Update only that player's `known_deck`.

### 8.7 Alter the Future (`ATF`)
The player privately views `deck[0..2]` and puts them back on top **in any order** they choose. Update only that player's `known_deck`.

### 8.8 Draw from the Bottom (`DFB`)
Ends the turn by drawing `deck[len-1]` instead of `deck[0]`. If that card is `EK`, resolve §6 normally.

### 8.9 Cat cards and Feral Cat
No standalone effect. Usable only in combos (§9). `FERAL` substitutes for any cat card.

---

## 9. Combos

Combos are played during the player's own action phase and are subject to Nope.

| Combo | Requirement | Effect |
|---|---|---|
| Pair | 2 cards with the same title (Feral Cat can be one of them if the other is a cat) | Choose an alive opponent; take a **random** card from their hand (the taker draws blindly). |
| Triple | 3 cards with the same title (Feral Cats allowed as wild cats) | Choose an opponent and **name** a card type. If they hold one, they must give it; otherwise nothing. |
| Five different | 5 cards with 5 different titles | Search the discard pile and take any one card. |

- `CONFIG combo_scope`: default — only cat cards (and Feral Cat) form pairs/triples. Common variant — any two/three cards with identical titles may combo. Confirm with the table.
- Whether two Feral Cats alone form a pair is `CONFIG` (not universally defined; default: allowed only with at least one real cat).
- A combo targeting a player with no cards has no effect but still consumes the cards.

---

## 10. Elimination and Win Condition

- Elimination happens only via an undefused `EK`.
- An eliminated player takes no more turns and cannot play `NOPE`.
- `GAME_OVER` when `count(alive) == 1`. That player wins.

---

## 11. Edge Cases Checklist

| Situation | Ruling |
|---|---|
| Player draws `EK` while holding `NOPE` but no `DEF` | Eliminated. `NOPE` cannot stop `EK`. |
| `ATK` played while under a stacked attack | Remaining turns + 2 transfer to next player (if stacking enabled). |
| `SKIP` played while under attack with 2 turns | Only 1 turn is skipped; player still owes 1 turn. |
| `DFB` drawing a kitten | Resolve normally (§6). |
| `STF` with fewer than 3 cards in deck | View all remaining cards. |
| Player reinserts kitten, then another player plays `SHUF` | Defuser's position knowledge becomes invalid. |
| `NOPE` played on a `NOPE` | Cancels the first Nope; original action resolves (even count rule). |
| `FAV` target chooses card | Target chooses which card to give. |
| Player eliminated during an attack | Remaining owed turns vanish; next player starts with 1 turn. |
| Deck runs out | Should not occur under the N−1 kitten invariant; if it does (miscount), engine should flag an error. |

---

## 12. Information and Probability Model (for Player Agents)

Useful quantities an agent should track:

```text
P(next draw is EK) = kittens_in_deck / deck_size
kittens_in_deck    = (alive_players - 1)   // always true after setup
```

Refinements:
- If the agent has seen the top cards (`STF`/`ATF`) and no shuffle or reorder has happened since, use exact knowledge for those positions.
- If the agent itself reinserted a kitten at position `k`, track that position, adjusting it as cards are drawn from the top (`k -= 1` per top draw), drawn from the bottom (no change unless it was the bottom), or invalidated by `SHUF`.
- Track Defuses: `DEF` remaining in deck = total DEF − DEF dealt − DEF discarded. Opponents' Defuse ownership can be estimated from those who have not yet defused.

---

## 13. Strategy Heuristics (for Player Agents)

1. **Keep your Defuse.** It's your life. Only `FAV` and combos can take it.
2. **Use `SKIP`/`ATK` when risk is high**, especially when the deck is small.
3. **Save `NOPE`** for attacks aimed at you, combos targeting you, or to protect a critical play.
4. **`STF` before deciding** whether to draw, skip, or attack.
5. **`ATF` to bury a kitten** below the top 3 or to set it up for the next player.
6. **Reinsertion:** placing a kitten at the top (`k=0`) hurts the next player only if they can't skip, attack, or shuffle. Mid-deck placements create uncertainty.
7. **Target players with the most cards** with pairs; they likely hold a Defuse or Nope.
8. **Hand-size tells:** a player who just defused has likely lost their Defuse — attack them.
9. **Shuffle** when you know a kitten is on top and you can't avoid drawing.

---

## 14. Agent Roles and Behavior Rules

**As referee/engine**
- Enforce hidden information: never reveal hands, deck order, or reinsertion positions.
- Always open a Nope window for every Noppable play.
- Ask for unresolved `CONFIG` values before starting: `extra_defuses`, `attack_stacking`, `combo_scope`, Feral-pair rule. `cat_breakdown` (§2.1) defaults to an even split across cat types pending real per-box counts.
- Log every public event in order.

**As player**
- Act only on information legitimately available to your seat.
- Declare each play explicitly: card, target (if any), named card (triples).
- Respond to Nope windows and Favor requests when prompted.

**As rules assistant**
- When the user's rulebook and this spec conflict, the physical rulebook wins.
- Flag `CONFIG` items as table decisions rather than stating one version as the only rule.

---

## 15. Minimal Action Grammar (Suggested)

```text
PLAY <card_id> [TARGET <player>] [NAME <card_type>] [ORDER <c1,c2,c3>]
COMBO <card_id> <card_id> [<card_id> ...] TARGET <player> [NAME <card_type>]
NOPE
PASS_NOPE
DRAW
DEFUSE POSITION <k>
GIVE <card_id>            // response to FAV or triple
```
