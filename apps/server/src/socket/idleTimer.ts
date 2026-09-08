import { JOIN_IDLE_TIMEOUT_MS } from '@shared/constants.js';
import type { AppSocket } from './types.js';

const timers = new Map<string, NodeJS.Timeout>();

/**
 * Starts (or restarts) the idle-join timer for a socket: if `room:join`
 * hasn't succeeded within JOIN_IDLE_TIMEOUT_MS, the socket is disconnected.
 */
export function startJoinIdleTimer(socket: AppSocket): void {
  clearJoinIdleTimer(socket.id);
  const timer = setTimeout(() => {
    timers.delete(socket.id);
    socket.emit('room:error', {
      code: 'JOIN_TIMEOUT',
      message: 'Did not join a room within the allotted time; disconnecting.',
    });
    socket.disconnect(true);
  }, JOIN_IDLE_TIMEOUT_MS);
  timers.set(socket.id, timer);
}

export function clearJoinIdleTimer(socketId: string): void {
  const timer = timers.get(socketId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(socketId);
  }
}
