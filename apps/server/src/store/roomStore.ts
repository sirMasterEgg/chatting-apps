import type { User } from '@shared/types.js';

/**
 * In-memory room state. No chat messages are ever kept here (or anywhere else
 * on the server) — messages are broadcast and immediately forgotten. See
 * docs/issue-2.md section 1.
 */
export interface Room {
  id: string;
  users: Map<string, User>; // key: socket.id
  createdAt: number;
}

export interface LeaveResult {
  roomId: string;
  user: User;
  /** Room state after removal; undefined when the room became empty and was deleted. */
  room: Room | undefined;
}

const rooms = new Map<string, Room>();
const socketRoomIndex = new Map<string, string>(); // socket.id -> roomId

export function joinRoom(roomId: string, user: User): { room: Room; isNewRoom: boolean } {
  let room = rooms.get(roomId);
  let isNewRoom = false;

  if (!room) {
    room = { id: roomId, users: new Map(), createdAt: Date.now() };
    rooms.set(roomId, room);
    isNewRoom = true;
  }

  room.users.set(user.id, user);
  socketRoomIndex.set(user.id, roomId);

  return { room, isNewRoom };
}

/**
 * Removes a user from its room. If the room becomes empty as a result, the
 * room itself is deleted from the store (auto-cleanup).
 */
export function leaveRoom(socketId: string): LeaveResult | null {
  const roomId = socketRoomIndex.get(socketId);
  if (!roomId) return null;
  socketRoomIndex.delete(socketId);

  const room = rooms.get(roomId);
  if (!room) return null;

  const user = room.users.get(socketId);
  room.users.delete(socketId);

  if (!user) return null;

  if (room.users.size === 0) {
    rooms.delete(roomId);
    return { roomId, user, room: undefined };
  }

  return { roomId, user, room };
}

export function getUsers(roomId: string): User[] {
  const room = rooms.get(roomId);
  return room ? Array.from(room.users.values()) : [];
}

export function isUsernameTaken(roomId: string, username: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const target = username.toLowerCase();
  for (const user of room.users.values()) {
    if (user.username.toLowerCase() === target) return true;
  }
  return false;
}

export function getRoomOfSocket(socketId: string): Room | undefined {
  const roomId = socketRoomIndex.get(socketId);
  return roomId ? rooms.get(roomId) : undefined;
}
