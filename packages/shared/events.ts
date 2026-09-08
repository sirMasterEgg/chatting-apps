import type { Attachment, ChatMessage, MessageKind, User } from './types.js';

export interface ClientToServerEvents {
  'room:join': (
    p: { roomId: string; username: string },
    ack: (r: { ok: true; users: User[] } | { ok: false; error: string }) => void,
  ) => void;
  'room:leave': () => void;
  'message:send': (
    p: { kind: MessageKind; text?: string; attachment?: Attachment },
    ack: (r: { ok: boolean; error?: string }) => void,
  ) => void;
  'typing:start': () => void;
  'typing:stop': () => void;
}

export interface ServerToClientEvents {
  'message:new': (m: ChatMessage) => void;
  'users:update': (users: User[]) => void;
  'typing:update': (usernames: string[]) => void;
  'room:error': (p: { code: string; message: string }) => void;
}

// Data attached to each socket instance (socket.data), shared shape between
// client and server type params for socket.io-client / socket.io generics.
export type InterServerEvents = Record<string, never>;

export interface SocketData {
  roomId?: string;
  username?: string;
}
