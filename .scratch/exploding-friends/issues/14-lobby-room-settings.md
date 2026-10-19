# 14: Lobby: room settings (CONFIG options)

**What to build:** A lobby screen letting the host pick the table's rule variants before starting, exposing the engine's `CONFIG` options as real settings.

**Blocked by:** 12 (server rooms & real-time multiplayer)

**Status:** done

- [x] Lobby UI shows all joined players seated around a virtual table (per project description §6)
- [x] Host-only controls for `attackStacking`, `comboScope`, `feralPairRule`, `extraDefuses`
- [x] Chosen settings are passed into `createGame`'s `config` when the host starts the game
- [x] Non-host players see the current settings but cannot change them
- [x] Manual test: starting a game with non-default settings (e.g. `attackStacking=off`) visibly changes engine behavior in play
