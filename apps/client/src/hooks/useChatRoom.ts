import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Attachment, ChatMessage, MessageKind, User } from '@shared/types';
import { MAX_CLIENT_MESSAGES } from '@shared/constants';
import { useSocket } from '@/context/SocketContext';
import { friendlyErrorMessage } from '@/lib/errors';
import type { RoomJoinPhase, Session } from '@/types/chat';

const PRIVACY_NOTICE =
  "Messages aren't stored anywhere. History from before you joined isn't available.";
const RECONNECTED_NOTICE =
  "Reconnected. Messages sent while you were disconnected can't be recovered.";

interface LocationState {
  initialUsers?: User[];
  skipJoin?: boolean;
}

interface RoomErrorState {
  code: string;
  message: string;
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
  showRejoinFailedDialog: boolean;
  dismissRejoinDialog: () => void;
  messages: ChatMessage[];
  users: User[];
  typingUsernames: string[];
  roomError: RoomErrorState | null;
  clearRoomError: () => void;
  sendMessage: (payload: { kind: MessageKind; text?: string; attachment?: Attachment }) => Promise<void>;
  leaveRoom: () => void;
}

export function useChatRoom(session: Session | null): UseChatRoomResult {
  const { socket } = useSocket();
  const location = useLocation();

  const [phase, setPhase] = useState<RoomJoinPhase>('joining');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showRejoinFailedDialog, setShowRejoinFailedDialog] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    session ? [makeLocalSystemMessage(session.roomId, PRIVACY_NOTICE)] : [],
  );
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsernames, setTypingUsernames] = useState<string[]>([]);
  const [roomError, setRoomError] = useState<RoomErrorState | null>(null);

  const hasJoinedOnceRef = useRef(false);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      return next.length > MAX_CLIENT_MESSAGES ? next.slice(next.length - MAX_CLIENT_MESSAGES) : next;
    });
  }, []);

  useEffect(() => {
    if (!session) return undefined;

    function doJoin(isReconnect: boolean) {
      setPhase('joining');
      socket.emit('room:join', { roomId: session!.roomId, username: session!.username }, (res) => {
        if (res.ok) {
          setUsers(res.users);
          setPhase('joined');
          setJoinError(null);
          hasJoinedOnceRef.current = true;
          if (isReconnect) {
            appendMessage(makeLocalSystemMessage(session!.roomId, RECONNECTED_NOTICE));
          }
        } else {
          setJoinError(friendlyErrorMessage(res.error));
          if (isReconnect || hasJoinedOnceRef.current) {
            setShowRejoinFailedDialog(true);
          } else {
            setPhase('failed');
          }
        }
      });
    }

    const state = location.state as LocationState | null;
    if (state?.skipJoin && state.initialUsers) {
      setUsers(state.initialUsers);
      setPhase('joined');
      hasJoinedOnceRef.current = true;
    } else {
      doJoin(false);
    }

    const handleConnect = () => {
      if (hasJoinedOnceRef.current) doJoin(true);
    };
    const handleMessageNew = (message: ChatMessage) => appendMessage(message);
    const handleUsersUpdate = (nextUsers: User[]) => setUsers(nextUsers);
    const handleTypingUpdate = (usernames: string[]) => setTypingUsernames(usernames);
    const handleRoomError = (payload: RoomErrorState) => setRoomError(payload);

    socket.on('connect', handleConnect);
    socket.on('message:new', handleMessageNew);
    socket.on('users:update', handleUsersUpdate);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('room:error', handleRoomError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('message:new', handleMessageNew);
      socket.off('users:update', handleUsersUpdate);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('room:error', handleRoomError);
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
            reject(new Error(res.error ? friendlyErrorMessage(res.error) : 'Message failed to send.'));
          }
        });
      }),
    [socket],
  );

  const leaveRoom = useCallback(() => {
    if (socket.connected) socket.emit('room:leave');
  }, [socket]);

  const dismissRejoinDialog = useCallback(() => setShowRejoinFailedDialog(false), []);
  const clearRoomError = useCallback(() => setRoomError(null), []);

  return {
    phase,
    joinError,
    showRejoinFailedDialog,
    dismissRejoinDialog,
    messages,
    users,
    typingUsernames,
    roomError,
    clearRoomError,
    sendMessage,
    leaveRoom,
  };
}
