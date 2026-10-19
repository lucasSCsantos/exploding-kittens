// The one Socket.IO connection for this tab. Always same-origin (no URL passed to `io()`) —
// in dev the Vite proxy forwards it to the server process, in production Express serves both
// from the same origin directly (ticket 12).

import { io, type Socket } from "socket.io-client";

export const socket: Socket = io();
