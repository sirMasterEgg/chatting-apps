import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { registerSocketHandlers } from './handlers/index.js';
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

  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
  });

  return io;
}
