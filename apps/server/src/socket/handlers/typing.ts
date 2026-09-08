import { addTypingUser, removeTypingUser } from '../../store/roomStore.js';
import { broadcastTypingUpdate, clearTypingExpiry, scheduleTypingExpiry } from '../typingState.js';
import type { AppServer, AppSocket } from '../types.js';

export function registerTypingHandlers(io: AppServer, socket: AppSocket): void {
  socket.on('typing:start', () => {
    if (!socket.data.roomId) return;

    const room = addTypingUser(socket.id);
    if (!room) return;

    scheduleTypingExpiry(io, socket.id);
    broadcastTypingUpdate(io, room, socket.id);
  });

  socket.on('typing:stop', () => {
    if (!socket.data.roomId) return;

    clearTypingExpiry(socket.id);
    const room = removeTypingUser(socket.id);
    if (!room) return;

    broadcastTypingUpdate(io, room, socket.id);
  });
}
