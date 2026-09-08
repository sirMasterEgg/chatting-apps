import type { AppServer, AppSocket } from '../types.js';
import { registerDisconnectHandler } from './disconnect.js';
import { registerMessageSendHandler } from './messageSend.js';
import { registerRoomJoinHandler } from './roomJoin.js';
import { registerRoomLeaveHandler } from './roomLeave.js';

export function registerSocketHandlers(io: AppServer, socket: AppSocket): void {
  registerRoomJoinHandler(io, socket);
  registerMessageSendHandler(io, socket);
  registerRoomLeaveHandler(io, socket);
  registerDisconnectHandler(io, socket);
}
