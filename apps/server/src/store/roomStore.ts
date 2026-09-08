import type { User } from '@shared/types.js';
import { getRedisClient } from '../lib/redisClient.js';

/**
 * Room state. No chat messages are ever kept here (or anywhere else on the
 * server) — messages are broadcast and immediately forgotten. See
 * docs/issue-2.md section 1. When REDIS_URL is set, this is a materialized
 * snapshot read from Redis rather than a live reference; when it isn't,
 * it's the actual in-memory object.
 */
export interface Room {
  id: string;
  users: Map<string, User>; // key: socket.id
  createdAt: number;
  /** socket ids currently marked as "typing"; TTL/expiry is managed by the socket layer. */
  typingUsers: Set<string>;
}

export interface LeaveResult {
  roomId: string;
  user: User;
  /** Room state after removal; undefined when the room became empty and was deleted. */
  room: Room | undefined;
}

// Safety-net TTL applied to Redis-backed room keys so a room can never live
// forever even if cleanup somehow fails to fire (e.g. a process killed
// mid-flow). Refreshed on every join; well above any realistic session
// length. Irrelevant in-memory mode, where state simply vanishes with the
// process.
const ROOM_TTL_SECONDS = 6 * 60 * 60;

const usersKey = (roomId: string) => `room:${roomId}:users`;
const typingKey = (roomId: string) => `room:${roomId}:typing`;
const socketRoomKey = (socketId: string) => `socket:${socketId}:room`;
const ROOMS_SET_KEY = 'rooms';

// ---------------------------------------------------------------------------
// In-memory implementation — used directly when REDIS_URL isn't set (local
// dev, or a single persistent-process deployment). Unchanged from the
// original implementation.
// ---------------------------------------------------------------------------

const memRooms = new Map<string, Room>();
const memSocketRoomIndex = new Map<string, string>();

function memJoinRoom(roomId: string, user: User): { room: Room; isNewRoom: boolean } {
  let room = memRooms.get(roomId);
  let isNewRoom = false;

  if (!room) {
    room = { id: roomId, users: new Map(), createdAt: Date.now(), typingUsers: new Set() };
    memRooms.set(roomId, room);
    isNewRoom = true;
  }

  room.users.set(user.id, user);
  memSocketRoomIndex.set(user.id, roomId);

  return { room, isNewRoom };
}

function memLeaveRoom(socketId: string): LeaveResult | null {
  const roomId = memSocketRoomIndex.get(socketId);
  if (!roomId) return null;
  memSocketRoomIndex.delete(socketId);

  const room = memRooms.get(roomId);
  if (!room) return null;

  const user = room.users.get(socketId);
  room.users.delete(socketId);
  room.typingUsers.delete(socketId);

  if (!user) return null;

  if (room.users.size === 0) {
    memRooms.delete(roomId);
    return { roomId, user, room: undefined };
  }

  return { roomId, user, room };
}

function memGetUsers(roomId: string): User[] {
  const room = memRooms.get(roomId);
  return room ? Array.from(room.users.values()) : [];
}

function memIsUsernameTaken(roomId: string, username: string): boolean {
  const room = memRooms.get(roomId);
  if (!room) return false;
  const target = username.toLowerCase();
  for (const user of room.users.values()) {
    if (user.username.toLowerCase() === target) return true;
  }
  return false;
}

function memGetRoomOfSocket(socketId: string): Room | undefined {
  const roomId = memSocketRoomIndex.get(socketId);
  return roomId ? memRooms.get(roomId) : undefined;
}

function memRoomExists(roomId: string): boolean {
  return memRooms.has(roomId);
}

function memGetRoomUserCount(roomId: string): number {
  return memRooms.get(roomId)?.users.size ?? 0;
}

function memGetRoomCount(): number {
  return memRooms.size;
}

function memAddTypingUser(socketId: string): Room | undefined {
  const room = memGetRoomOfSocket(socketId);
  room?.typingUsers.add(socketId);
  return room;
}

function memRemoveTypingUser(socketId: string): Room | undefined {
  const room = memGetRoomOfSocket(socketId);
  room?.typingUsers.delete(socketId);
  return room;
}

// ---------------------------------------------------------------------------
// Redis-backed implementation — used when REDIS_URL is set, so room/user
// state is shared across multiple server replicas (e.g. behind a load
// balancer) instead of living in one instance's memory. A hash per room
// (`room:<id>:users`, socketId -> JSON User) plus a set for typing state and
// a reverse socket->room index. Every key carries ROOM_TTL_SECONDS as a
// safety net; join/leave keep it refreshed for active rooms.
// ---------------------------------------------------------------------------

type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

async function redisMaterializeRoom(redis: RedisClient, roomId: string): Promise<Room | undefined> {
  const [usersHash, typingMembers] = await Promise.all([
    redis.hgetall(usersKey(roomId)),
    redis.smembers(typingKey(roomId)),
  ]);
  const entries = Object.entries(usersHash);
  if (entries.length === 0) return undefined;

  const users = new Map<string, User>(entries.map(([socketId, json]) => [socketId, JSON.parse(json) as User]));
  return { id: roomId, users, typingUsers: new Set(typingMembers), createdAt: 0 };
}

async function redisJoinRoom(
  redis: RedisClient,
  roomId: string,
  user: User,
): Promise<{ room: Room; isNewRoom: boolean }> {
  const isNewRoom = (await redis.exists(usersKey(roomId))) === 0;

  await redis.hset(usersKey(roomId), user.id, JSON.stringify(user));
  await redis.set(socketRoomKey(user.id), roomId, 'EX', ROOM_TTL_SECONDS);
  await redis.expire(usersKey(roomId), ROOM_TTL_SECONDS);
  await redis.sadd(ROOMS_SET_KEY, roomId);

  const room = await redisMaterializeRoom(redis, roomId);
  // room is guaranteed defined: we just wrote a member into its users hash.
  return { room: room as Room, isNewRoom };
}

async function redisLeaveRoom(redis: RedisClient, socketId: string): Promise<LeaveResult | null> {
  const roomId = await redis.get(socketRoomKey(socketId));
  if (!roomId) return null;
  await redis.del(socketRoomKey(socketId));

  const userJson = await redis.hget(usersKey(roomId), socketId);
  if (!userJson) return null;
  const user = JSON.parse(userJson) as User;

  await redis.hdel(usersKey(roomId), socketId);
  await redis.srem(typingKey(roomId), socketId);

  const remaining = await redis.hlen(usersKey(roomId));
  if (remaining === 0) {
    await redis.del(usersKey(roomId), typingKey(roomId));
    await redis.srem(ROOMS_SET_KEY, roomId);
    return { roomId, user, room: undefined };
  }

  const room = await redisMaterializeRoom(redis, roomId);
  return { roomId, user, room };
}

async function redisGetUsers(redis: RedisClient, roomId: string): Promise<User[]> {
  const usersHash = await redis.hgetall(usersKey(roomId));
  return Object.values(usersHash).map((json) => JSON.parse(json) as User);
}

async function redisIsUsernameTaken(redis: RedisClient, roomId: string, username: string): Promise<boolean> {
  const users = await redisGetUsers(redis, roomId);
  const target = username.toLowerCase();
  return users.some((user) => user.username.toLowerCase() === target);
}

async function redisGetRoomOfSocket(redis: RedisClient, socketId: string): Promise<Room | undefined> {
  const roomId = await redis.get(socketRoomKey(socketId));
  return roomId ? redisMaterializeRoom(redis, roomId) : undefined;
}

async function redisAddTypingUser(redis: RedisClient, socketId: string): Promise<Room | undefined> {
  const room = await redisGetRoomOfSocket(redis, socketId);
  if (!room) return undefined;
  await redis.sadd(typingKey(room.id), socketId);
  room.typingUsers.add(socketId);
  return room;
}

async function redisRemoveTypingUser(redis: RedisClient, socketId: string): Promise<Room | undefined> {
  const room = await redisGetRoomOfSocket(redis, socketId);
  if (!room) return undefined;
  await redis.srem(typingKey(room.id), socketId);
  room.typingUsers.delete(socketId);
  return room;
}

// ---------------------------------------------------------------------------
// Public API — dispatches to Redis or in-memory. Unlike rate limiting (where
// failing open on a Redis error is safe — worst case, one extra action goes
// through), a Redis error here is surfaced to the caller rather than
// silently falling back to a local Map: an in-memory fallback would only
// live in this one process/invocation and wouldn't be visible to whichever
// instance handles that client's next request, which is worse than a clear
// error. Handlers are expected to catch and ack a graceful failure.
// ---------------------------------------------------------------------------

export async function joinRoom(roomId: string, user: User): Promise<{ room: Room; isNewRoom: boolean }> {
  const redis = getRedisClient();
  return redis ? redisJoinRoom(redis, roomId, user) : memJoinRoom(roomId, user);
}

export async function leaveRoom(socketId: string): Promise<LeaveResult | null> {
  const redis = getRedisClient();
  return redis ? redisLeaveRoom(redis, socketId) : memLeaveRoom(socketId);
}

export async function getUsers(roomId: string): Promise<User[]> {
  const redis = getRedisClient();
  return redis ? redisGetUsers(redis, roomId) : memGetUsers(roomId);
}

export async function isUsernameTaken(roomId: string, username: string): Promise<boolean> {
  const redis = getRedisClient();
  return redis ? redisIsUsernameTaken(redis, roomId, username) : memIsUsernameTaken(roomId, username);
}

export async function getRoomOfSocket(socketId: string): Promise<Room | undefined> {
  const redis = getRedisClient();
  return redis ? redisGetRoomOfSocket(redis, socketId) : memGetRoomOfSocket(socketId);
}

export async function roomExists(roomId: string): Promise<boolean> {
  const redis = getRedisClient();
  return redis ? (await redis.exists(usersKey(roomId))) > 0 : memRoomExists(roomId);
}

export async function getRoomUserCount(roomId: string): Promise<number> {
  const redis = getRedisClient();
  return redis ? redis.hlen(usersKey(roomId)) : memGetRoomUserCount(roomId);
}

export async function getRoomCount(): Promise<number> {
  const redis = getRedisClient();
  return redis ? redis.scard(ROOMS_SET_KEY) : memGetRoomCount();
}

export async function addTypingUser(socketId: string): Promise<Room | undefined> {
  const redis = getRedisClient();
  return redis ? redisAddTypingUser(redis, socketId) : memAddTypingUser(socketId);
}

export async function removeTypingUser(socketId: string): Promise<Room | undefined> {
  const redis = getRedisClient();
  return redis ? redisRemoveTypingUser(redis, socketId) : memRemoveTypingUser(socketId);
}
