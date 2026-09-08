import { runLeaveFlow } from '../leaveFlow.js';
import type { AppServer, AppSocket } from '../types.js';

export function registerDisconnectHandler(io: AppServer, socket: AppSocket): void {
  socket.on('disconnect', () => {
    runLeaveFlow(io, socket);
  });
}
