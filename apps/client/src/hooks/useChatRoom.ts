import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Attachment, ChatMessage, MessageKind, User } from '@shared/types';
import { useSocket } from '@/context/SocketContext';
import type { RoomJoinPhase, Session } from '@/types/chat';

const PRIVACY_NOTICE =
  'Pesan tidak disimpan di mana pun. Riwayat sebelum kamu bergabung tidak tersedia.';

interface LocationState {
  initialUsers?: User[];
  skipJoin?: boolean;
}

let localIdCounter = 0;
function makeLocalSystemMessage(roomId: string, text: string): ChatMessage {
  localIdCounter += 1;
  return {
    id: `local-${Date.now()}-${localIdCounter}`,
    roomId,
    kind: 'system',
    author: null,
    text,
    sentAt: Date.now(),
  };
}

export interface UseChatRoomResult {
  phase: RoomJoinPhase;
  joinError: string | null;
  messages: ChatMessage[];
  users: User[];
  sendMessage: (payload: { kind: MessageKind; text?: string; attachment?: Attachment }) => Promise<void>;
  leaveRoom: () => void;
}

export function useChatRoom(session: Session | null): UseChatRoomResult {
  const { socket } = useSocket();
  const location = useLocation();

  const [phase, setPhase] = useState<RoomJoinPhase>('joining');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    session ? [makeLocalSystemMessage(session.roomId, PRIVACY_NOTICE)] : [],
  );
  const [users, setUsers] = useState<User[]>([]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (!session) return undefined;

    // Landing already performed the join and knows the resulting user list —
    // reusing it here avoids a race where this component's own `users:update`
    // listener isn't attached yet when the server's post-join broadcast lands.
    const state = location.state as LocationState | null;
    if (state?.skipJoin && state.initialUsers) {
      setUsers(state.initialUsers);
      setPhase('joined');
    } else {
      setPhase('joining');
      socket.emit('room:join', { roomId: session.roomId, username: session.username }, (res) => {
        if (res.ok) {
          setUsers(res.users);
          setPhase('joined');
          setJoinError(null);
        } else {
          setJoinError(res.error);
          setPhase('failed');
        }
      });
    }

    const handleMessageNew = (message: ChatMessage) => appendMessage(message);
    const handleUsersUpdate = (nextUsers: User[]) => setUsers(nextUsers);

    socket.on('message:new', handleMessageNew);
    socket.on('users:update', handleUsersUpdate);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('users:update', handleUsersUpdate);
    };
    // Intentionally only re-runs when identity of the room/user changes —
    // `location.state` is read once at mount, not tracked as a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.roomId, session?.username, socket, appendMessage]);

  const sendMessage = useCallback(
    (payload: { kind: MessageKind; text?: string; attachment?: Attachment }) =>
      new Promise<void>((resolve, reject) => {
        socket.emit('message:send', payload, (res) => {
          if (res.ok) {
            resolve();
          } else {
            reject(new Error(res.error ?? 'Pesan gagal terkirim.'));
          }
        });
      }),
    [socket],
  );

  const leaveRoom = useCallback(() => {
    if (socket.connected) socket.emit('room:leave');
  }, [socket]);

  return { phase, joinError, messages, users, sendMessage, leaveRoom };
}
