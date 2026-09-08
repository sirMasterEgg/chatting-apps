import { v4 as uuid } from 'uuid';
import type { ChatMessage, User } from '@shared/types.js';
import { isUsernameTaken, joinRoom } from '../../store/roomStore.js';
import type { AppServer, AppSocket } from '../types.js';
import { isRecord, sanitizeRoomId, sanitizeUsername } from '../validation.js';

export function registerRoomJoinHandler(io: AppServer, socket: AppSocket): void {
  socket.on('room:join', (payload, ack) => {
    if (typeof ack !== 'function') return;

    const data: unknown = payload;
    if (!isRecord(data)) {
      ack({ ok: false, error: 'INVALID_PAYLOAD' });
      return;
    }

    if (socket.data.roomId) {
      ack({ ok: false, error: 'ALREADY_JOINED' });
      return;
    }

    const username = sanitizeUsername(data.username);
    const roomId = sanitizeRoomId(data.roomId);
    if (!username || !roomId) {
      ack({ ok: false, error: 'INVALID_INPUT' });
      return;
    }

    if (isUsernameTaken(roomId, username)) {
      ack({ ok: false, error: 'USERNAME_TAKEN' });
      return;
    }

    const user: User = { id: socket.id, username };
    const { room } = joinRoom(roomId, user);

    socket.data.roomId = roomId;
    socket.data.username = username;
    void socket.join(roomId);

    const users = Array.from(room.users.values());
    ack({ ok: true, users });

    io.to(roomId).emit('users:update', users);

    const systemMessage: ChatMessage = {
      id: uuid(),
      roomId,
      kind: 'system',
      author: null,
      text: `${username} bergabung ke room`,
      sentAt: Date.now(),
    };
    io.to(roomId).emit('message:new', systemMessage);
  });
}
