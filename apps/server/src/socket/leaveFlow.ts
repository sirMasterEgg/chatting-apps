import { v4 as uuid } from 'uuid';
import type { ChatMessage } from '@shared/types.js';
import { leaveRoom } from '../store/roomStore.js';
import { clearJoinIdleTimer } from './idleTimer.js';
import { clearSocketRateLimits } from './rateLimit.js';
import { broadcastTypingUpdate, clearTypingExpiry } from './typingState.js';
import type { AppServer, AppSocket } from './types.js';
import { clearViolations } from './violations.js';

/**
 * Shared exit flow used by both `room:leave` and `disconnect` (docs/issue-2.md
 * section 2): removes the socket from its room, broadcasts a system message
 * and an updated user list, and cleans up all per-socket ephemeral state. If
 * the room became empty, roomStore already deleted it - nothing further to
 * broadcast to a room with nobody left in it.
 */
export async function runLeaveFlow(io: AppServer, socket: AppSocket): Promise<void> {
  clearJoinIdleTimer(socket.id);
  clearTypingExpiry(socket.id);
  clearViolations(socket.id);

  // Rate-limit cleanup can involve a Redis round trip - kick it off in
  // parallel with the room-store lookup below rather than serializing them.
  const rateLimitCleanup = clearSocketRateLimits(socket.id);

  try {
    const result = await leaveRoom(socket.id);
    if (!result) {
      await rateLimitCleanup;
      return;
    }

    const { roomId, user, room } = result;

    const systemMessage: ChatMessage = {
      id: uuid(),
      roomId,
      kind: 'system',
      author: null,
      text: `${user.username} left the room`,
      sentAt: Date.now(),
    };
    io.to(roomId).emit('message:new', systemMessage);

    if (room) {
      io.to(roomId).emit('users:update', Array.from(room.users.values()));
      broadcastTypingUpdate(io, room, socket.id);
    }
  } catch (err) {
    // Room store failure (e.g. Redis unreachable) - log and move on rather
    // than letting a disconnect/leave crash the process; the socket is
    // going away regardless.
     
    console.error('[leaveFlow] store error:', err);
  }

  await rateLimitCleanup;
}
