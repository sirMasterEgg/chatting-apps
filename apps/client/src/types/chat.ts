/** Username + room the user is (or was) part of. Mirrored to sessionStorage. */
export interface Session {
  username: string;
  roomId: string;
}

export type RoomJoinPhase = 'joining' | 'joined' | 'failed';
