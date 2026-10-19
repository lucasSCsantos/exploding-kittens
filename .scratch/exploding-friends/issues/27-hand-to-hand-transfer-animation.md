# 27: Hand-to-hand transfer animation

**What to build:** Favor, Pair, and Triple resolutions animate the transferred card flying between the two seats involved, instead of an instant state update. See `.scratch/exploding-friends/spec.md`.

**Blocked by:** 19 (needs the flight-offset helper + `detectCardTransfer`)

**Status:** ready-for-agent

- [ ] When `detectCardTransfer` reports a Favor, Pair, or Triple resolution, a single shared animation flies the card from the giving seat to the receiving seat, using the flight-offset helper
- [ ] The moving card renders face-up when the viewer is the giver or receiver (they're entitled to see it), and face-down for every other viewer (consistent with the rules not revealing the card's identity to bystanders)
- [ ] Five Different and See/Alter the Future are explicitly out of scope and unaffected (different mechanics — see spec)
- [ ] Existing Favor/Pair/Triple play flows (prompts, dispatch) are unchanged in behaviour
- [ ] Full test suite and typecheck still pass
