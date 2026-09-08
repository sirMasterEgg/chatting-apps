import { runLeaveFlow } from '../leaveFlow.js';
import type { AppServer, AppSocket } from '../types.js';

export function registerRoomLeaveHandler(io: AppServer, socket: AppSocket): void {
  socket.on('room:leave', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    runLeaveFlow(io, socket);
    socket.leave(roomId);
    socket.data.roomId = undefined;
    socket.data.username = undefined;
  });
}
