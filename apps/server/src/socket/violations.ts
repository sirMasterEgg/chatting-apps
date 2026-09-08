import type { AppSocket } from './types.js';

/** Consecutive protocol/rate-limit violations before a socket is force-disconnected. */
const MAX_CONSECUTIVE_VIOLATIONS = 5;

const violationCounts = new Map<string, number>();

/**
 * Records one violation (e.g. a rate-limit hit) for a socket. After
 * MAX_CONSECUTIVE_VIOLATIONS in a row (without a successful action resetting
 * the counter via clearViolations), the socket is disconnected.
 */
export function registerViolation(socket: AppSocket): void {
  const next = (violationCounts.get(socket.id) ?? 0) + 1;
  violationCounts.set(socket.id, next);

  if (next >= MAX_CONSECUTIVE_VIOLATIONS) {
    socket.emit('room:error', {
      code: 'TOO_MANY_VIOLATIONS',
      message: 'Too many consecutive violations; disconnecting.',
    });
    socket.disconnect(true);
  }
}

/** Resets the violation streak, e.g. after a successful send/join, or on cleanup. */
export function clearViolations(socketId: string): void {
  violationCounts.delete(socketId);
}
