import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server, type Socket } from "socket.io";
import type { Action } from "../engine/actions.js";
import type { SetupConfig } from "../engine/setup.js";
import { RoomManager } from "./rooms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../client");

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.static(clientDist));

app.use((_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const httpServer = createServer(app);
// No `cors`/explicit origin: the client always connects same-origin (same host Express serves
// from), in dev via the Vite proxy and in production because Express serves the built client.
const io = new Server(httpServer);
const rooms = new RoomManager({ onChange: (code) => broadcastRoom(code) });

type Ack<T extends object = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Which room/seat a connected socket is currently bound to. */
const socketBindings = new Map<string, { code: string; playerId: string }>();

/** Re-emits the room's current state to every connected socket in it — each player's own
 * `getPlayerView`, or (pre-start) the shared lobby roster. Never a broadcast of raw GameState. */
function broadcastRoom(code: string): void {
  const room = rooms.getRoom(code);
  if (!room) return;

  for (const [socketId, binding] of socketBindings) {
    if (binding.code !== room.code) continue;
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;

    if (room.state) {
      socket.emit("view", {
        ...rooms.getView(room.code, binding.playerId),
        nopeDeadline: rooms.getNopeDeadline(room.code),
      });
    } else {
      socket.emit("lobby", {
        code: room.code,
        hostId: room.hostId,
        players: room.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      });
    }
  }
}

function bind(socket: Socket, code: string, playerId: string): void {
  socketBindings.set(socket.id, { code, playerId });
  socket.join(code);
}

io.on("connection", (socket) => {
  socket.on(
    "createRoom",
    (name: string, ack: (res: Ack<{ code: string; playerId: string; token: string }>) => void) => {
      try {
        const { code, playerId, token } = rooms.createRoom(name);
        bind(socket, code, playerId);
        ack({ ok: true, code, playerId, token });
        broadcastRoom(code);
      } catch (err) {
        ack({ ok: false, error: errorMessage(err) });
      }
    },
  );

  socket.on(
    "joinRoom",
    (
      payload: { code: string; name: string; token?: string },
      ack: (res: Ack<{ code: string; playerId: string; token: string }>) => void,
    ) => {
      try {
        const { playerId, token } = rooms.joinRoom(payload.code, payload.name, payload.token);
        const code = payload.code.trim().toUpperCase();
        bind(socket, code, playerId);
        ack({ ok: true, code, playerId, token });
        broadcastRoom(code);
      } catch (err) {
        ack({ ok: false, error: errorMessage(err) });
      }
    },
  );

  socket.on("startGame", (config: SetupConfig | undefined, ack: (res: Ack) => void) => {
    const binding = socketBindings.get(socket.id);
    if (!binding) return ack({ ok: false, error: "not in a room" });
    try {
      rooms.startGame(binding.code, binding.playerId, config);
      ack({ ok: true });
      broadcastRoom(binding.code);
    } catch (err) {
      ack({ ok: false, error: errorMessage(err) });
    }
  });

  socket.on("action", (action: Action, ack: (res: Ack) => void) => {
    const binding = socketBindings.get(socket.id);
    if (!binding) return ack({ ok: false, error: "not in a room" });
    try {
      rooms.applyAction(binding.code, binding.playerId, action);
      ack({ ok: true });
      broadcastRoom(binding.code);
    } catch (err) {
      ack({ ok: false, error: errorMessage(err) });
    }
  });

  socket.on("peekTopOfDeck", (_payload: unknown, ack: (res: Ack<{ cards: unknown[] }>) => void) => {
    const binding = socketBindings.get(socket.id);
    if (!binding) return ack({ ok: false, error: "not in a room" });
    try {
      const cards = rooms.peekTopOfDeck(binding.code, binding.playerId);
      ack({ ok: true, cards });
    } catch (err) {
      ack({ ok: false, error: errorMessage(err) });
    }
  });

  socket.on("disconnect", () => {
    const binding = socketBindings.get(socket.id);
    socketBindings.delete(socket.id);
    if (binding) {
      rooms.setConnected(binding.code, binding.playerId, false);
      broadcastRoom(binding.code);
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
