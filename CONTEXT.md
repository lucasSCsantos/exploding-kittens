# Exploding Kittens: Party Pack

A real-time, multi-device implementation of the Exploding Kittens Party Pack card game: an engine enforcing the rules (spec at `docs/exploding-kittens-party-pack-ai-spec.md`), a server coordinating rooms over sockets, and a client rendering the table.

## Language

**Exploded Kitten**:
An Exploding Kitten card that was drawn and resolved — defused (slipped back into the deck) or not (its drawer eliminated). Once resolved it is removed from the deck permanently and is public information (auto-revealed on draw per spec), but it is never part of the `discard` pile.
_Avoid_: Discarded kitten, burnt kitten

**Discard pile**:
The face-up pile of every non-hazard card played or given up (action cards, cats, Defuses spent on a kitten). Exploded Kittens are never added to it — see Exploded Kitten.
_Avoid_: Discard, pile (ambiguous with draw pile)

**Elimination**:
A player losing when an Exploding Kitten they drew resolves without a Defuse in hand. An eliminated player takes no further turns and cannot play Nope.
_Avoid_: Death, losing (losing is the broader player-facing concept; elimination is the specific rules event)
