import { addTypingUser, removeTypingUser } from '../../store/roomStore.js';
import { broadcastTypingUpdate, clearTypingExpiry, scheduleTypingExpiry } from '../typingState.js';
import type { AppServer, AppSocket } from '../types.js';

export function registerTypingHandlers(io: AppServer, socket: AppSocket): void {
  socket.on('typing:start', async () => {
    if (!socket.data.roomId) return;

    try {
      const room = await addTypingUser(socket.id);
      if (!room) return;

      scheduleTypingExpiry(io, socket.id);
      broadcastTypingUpdate(io, room, socket.id);
    } catch (err) {
       
      console.error('[typing:start] store error:', err);
    }
  });

  socket.on('typing:stop', async () => {
    if (!socket.data.roomId) return;

    clearTypingExpiry(socket.id);
    try {
      const room = await removeTypingUser(socket.id);
      if (!room) return;

      broadcastTypingUpdate(io, room, socket.id);
    } catch (err) {
       
      console.error('[typing:stop] store error:', err);
    }
  });
}
