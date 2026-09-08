/** Username + room the user is (or was) part of. Mirrored to sessionStorage. */
export interface Session {
  username: string;
  roomId: string;
}

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline';

export type RoomJoinPhase = 'joining' | 'joined' | 'failed';

export type SendPhase = 'reading' | 'sending' | null;
