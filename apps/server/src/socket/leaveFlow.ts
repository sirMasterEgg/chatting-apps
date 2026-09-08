import { v4 as uuid } from 'uuid';
import type { ChatMessage } from '@shared/types.js';
import { leaveRoom } from '../store/roomStore.js';
import type { AppServer, AppSocket } from './types.js';

/**
 * Shared exit flow used by both `room:leave` and `disconnect` (docs/issue-2.md
 * section 2): removes the socket from its room, then broadcasts a system
 * message and an updated user list. If the room became empty, roomStore
 * already deleted it - nothing further to broadcast to a room with nobody
 * left in it.
 */
export function runLeaveFlow(io: AppServer, socket: AppSocket): void {
  const result = leaveRoom(socket.id);
  if (!result) return;

  const { roomId, user, room } = result;

  const systemMessage: ChatMessage = {
    id: uuid(),
    roomId,
    kind: 'system',
    author: null,
    text: `${user.username} meninggalkan room`,
    sentAt: Date.now(),
  };
  io.to(roomId).emit('message:new', systemMessage);

  if (room) {
    io.to(roomId).emit('users:update', Array.from(room.users.values()));
  }
}
