import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Lazily creates (once) and returns the single shared socket instance for the
 * whole app. `autoConnect` is disabled — callers (LandingPage on submit,
 * SocketProvider on RoomPage mount) decide when to actually open the
 * connection, and are responsible for calling `.connect()` / `.disconnect()`.
 */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      randomizationFactor: 0.5,
      timeout: 10_000,
    });
  }
  return socket;
}
