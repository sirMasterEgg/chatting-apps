import { v4 as uuid } from 'uuid';
import { MAX_ROOMS, MAX_USERS_PER_ROOM } from '@shared/constants.js';
import type { ChatMessage, User } from '@shared/types.js';
import {
  getRoomCount,
  getRoomUserCount,
  isUsernameTaken,
  joinRoom,
  roomExists,
} from '../../store/roomStore.js';
import { clearJoinIdleTimer } from '../idleTimer.js';
import { consumeJoinToken } from '../rateLimit.js';
import type { AppServer, AppSocket } from '../types.js';
import { hasOnlyKeys, isRecord, sanitizeRoomId, sanitizeUsername } from '../validation.js';
import { clearViolations, registerViolation } from '../violations.js';

const ALLOWED_KEYS = ['roomId', 'username'] as const;

export function registerRoomJoinHandler(io: AppServer, socket: AppSocket): void {
  socket.on('room:join', (payload, ack) => {
    if (typeof ack !== 'function') return;

    const data: unknown = payload;
    if (!isRecord(data) || !hasOnlyKeys(data, ALLOWED_KEYS)) {
      ack({ ok: false, error: 'INVALID_PAYLOAD' });
      return;
    }

    if (socket.data.roomId) {
      ack({ ok: false, error: 'ALREADY_JOINED' });
      return;
    }

    const ip = socket.handshake.address;
    if (!consumeJoinToken(ip)) {
      ack({ ok: false, error: 'RATE_LIMITED' });
      socket.emit('room:error', {
        code: 'RATE_LIMITED',
        message: 'Terlalu banyak percobaan join, coba lagi sebentar lagi.',
      });
      registerViolation(socket);
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

    if (!roomExists(roomId) && getRoomCount() >= MAX_ROOMS) {
      ack({ ok: false, error: 'SERVER_FULL' });
      return;
    }

    if (getRoomUserCount(roomId) >= MAX_USERS_PER_ROOM) {
      ack({ ok: false, error: 'ROOM_FULL' });
      return;
    }

    const user: User = { id: socket.id, username };
    const { room } = joinRoom(roomId, user);

    socket.data.roomId = roomId;
    socket.data.username = username;
    void socket.join(roomId);

    clearJoinIdleTimer(socket.id);
    clearViolations(socket.id);

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
