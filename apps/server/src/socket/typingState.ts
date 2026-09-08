import { TYPING_TTL_MS } from '@shared/constants.js';
import type { Room } from '../store/roomStore.js';
import { removeTypingUser } from '../store/roomStore.js';
import type { AppServer } from './types.js';

const expiryTimers = new Map<string, NodeJS.Timeout>();

/**
 * Broadcasts the current typing usernames for a room to everyone except the
 * given socket (the one whose typing state just changed / expired).
 */
export function broadcastTypingUpdate(io: AppServer, room: Room, excludeSocketId: string): void {
  const usernames = Array.from(room.typingUsers)
    .map((socketId) => room.users.get(socketId)?.username)
    .filter((name): name is string => Boolean(name));
  io.to(room.id).except(excludeSocketId).emit('typing:update', usernames);
}

/**
 * (Re)starts the auto-expiry timer for a socket's typing state. If
 * `typing:stop` doesn't arrive within TYPING_TTL_MS, the socket is removed
 * from the room's typing set and an update is broadcast, so the indicator
 * never gets stuck after an abrupt disconnect.
 */
export function scheduleTypingExpiry(io: AppServer, socketId: string): void {
  clearTypingExpiry(socketId);
  const timer = setTimeout(() => {
    expiryTimers.delete(socketId);
    const room = removeTypingUser(socketId);
    if (room) broadcastTypingUpdate(io, room, socketId);
  }, TYPING_TTL_MS);
  expiryTimers.set(socketId, timer);
}

export function clearTypingExpiry(socketId: string): void {
  const timer = expiryTimers.get(socketId);
  if (timer) {
    clearTimeout(timer);
    expiryTimers.delete(socketId);
  }
}
