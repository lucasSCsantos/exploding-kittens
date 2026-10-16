# 17: Polish: asset & animation performance

**What to build:** Make sure the game loads and animates smoothly on phones, the primary device per the project description.

**Blocked by:** 12 (server rooms & real-time multiplayer)

**Status:** ready-for-agent

- [ ] All card images preloaded when the player enters the lobby, so no card appears blank mid-game
- [ ] Image sizes checked on real mobile network conditions; resized/WebP versions generated at build time if the current JPEGs are too large
- [ ] All card movement uses springs (Motion's `type: "spring"`), not linear tweens
- [ ] Animations kept short (150–400ms) across the board
