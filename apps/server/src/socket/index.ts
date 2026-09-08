import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { registerSocketHandlers } from './handlers/index.js';
import { startJoinIdleTimer } from './idleTimer.js';
import type { AppServer } from './types.js';

export type { AppServer } from './types.js';

export function createSocketServer(httpServer: HttpServer): AppServer {
  const io: AppServer = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
    },
    // base64 payloads for a 5MB file are ~6.7MB once encoded; leave headroom.
    maxHttpBufferSize: 8 * 1024 * 1024,
  });

  // Payloads that exceed maxHttpBufferSize are rejected by the engine before
  // any handler runs (the transport itself is closed) - log it so an
  // oversized-payload attempt is at least visible server-side rather than a
  // silent drop. Legitimate traffic never hits this: MAX_FILE_SIZE (5MB) plus
  // base64/JSON overhead stays well under the 8MB buffer limit above, and
  // apps/server/src/socket/validation.ts rejects oversized/forged attachments
  // with an informative ack well before this limit for anything that *does*
  // make it through the transport.
  io.engine.on('connection_error', (err) => {
     
    console.warn('[socket] connection error:', err.code, err.message);
  });

  io.on('connection', (socket) => {
    startJoinIdleTimer(socket);
    registerSocketHandlers(io, socket);
  });

  return io;
}
