import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@shared/events.js';
import { env } from '../config/env.js';

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function createSocketServer(httpServer: HttpServer): AppServer {
  const io: AppServer = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
    },
    // base64 payloads for a 5MB file are ~6.7MB once encoded; leave headroom.
    maxHttpBufferSize: 8 * 1024 * 1024,
  });

  io.on('connection', (socket) => {
    // Issue #2 fills in room:join / message:send / room:leave / disconnect.
    // Issue #3 adds typing indicators, rate limiting and idle timeouts.
    void socket;
  });

  return io;
}
