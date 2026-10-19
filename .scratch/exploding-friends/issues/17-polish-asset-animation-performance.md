# 17: Polish: asset & animation performance

**What to build:** Make sure the game loads and animates smoothly on phones, the primary device per the project description.

**Blocked by:** 12 (server rooms & real-time multiplayer)

**Status:** done

- [x] All card images preloaded when the player enters the lobby, so no card appears blank mid-game
- [x] Image sizes checked on real mobile network conditions; resized/WebP versions generated at build time if the current JPEGs are too large
  - Checked by file size/dimensions, not a literal throttled-device measurement: originals were ~30-45KB at ~378x529px (already near their max on-screen size, so no resizing needed). `scripts/optimize-card-images.mjs` now converts them to WebP at build time, cutting total card art from ~1.5MB to ~1.1MB (~27% smaller).
- [x] All card movement uses springs (Motion's `type: "spring"`), not linear tweens
- [x] Animations kept short (150–400ms) across the board
