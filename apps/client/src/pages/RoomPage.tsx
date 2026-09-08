import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { MessageInput } from '@/components/chat/MessageInput';
import { MessageList } from '@/components/chat/MessageList';
import { UserList } from '@/components/chat/UserList';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { SocketProvider } from '@/context/SocketContext';
import { useChatRoom } from '@/hooks/useChatRoom';

function RoomPageInner() {
  const { roomId: routeRoomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { session, clearSession } = useSession();

  // No/mismatched session (e.g. a pasted room URL) — bounce to landing.
  useEffect(() => {
    if (!session || session.roomId !== routeRoomId) {
      navigate('/', { replace: true });
    }
  }, [session, routeRoomId, navigate]);

  const { phase, joinError, messages, users, sendMessage, leaveRoom } = useChatRoom(session);

  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopyRoomId = useCallback(() => {
    if (!session) return;
    navigator.clipboard?.writeText(session.roomId).then(
      () => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      },
      () => undefined,
    );
  }, [session]);

  const handleBackToLanding = useCallback(() => {
    clearSession();
    navigate('/');
  }, [clearSession, navigate]);

  function handleLeave() {
    leaveRoom();
    handleBackToLanding();
  }

  if (!session || session.roomId !== routeRoomId) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex flex-none items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="truncate text-sm font-semibold text-slate-200">
            Room <span className="font-mono text-sky-400">{session.roomId}</span>
          </h1>
          <IconButton label="Salin Room ID" onClick={handleCopyRoomId}>
            <Icon name={copyFeedback ? 'check' : 'copy'} className="h-4 w-4" />
          </IconButton>
        </div>
        <Button variant="secondary" onClick={handleLeave}>
          <Icon name="logout" className="h-4 w-4" />
          Keluar
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {phase === 'joining' && (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              Bergabung ke room...
            </div>
          )}

          {phase === 'failed' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-rose-300">{joinError ?? 'Gagal bergabung ke room.'}</p>
              <Button onClick={handleBackToLanding}>Kembali ke Landing</Button>
            </div>
          )}

          {phase === 'joined' && (
            <>
              <MessageList messages={messages} selfUsername={session.username} />
              <MessageInput disabled={phase !== 'joined'} sendMessage={sendMessage} />
            </>
          )}
        </div>

        <aside className="hidden w-60 flex-none border-l border-slate-800 md:block">
          <UserList users={users} selfUsername={session.username} />
        </aside>
      </div>
    </div>
  );
}

export function RoomPage() {
  return (
    <SessionProvider>
      <SocketProvider>
        <RoomPageInner />
      </SocketProvider>
    </SessionProvider>
  );
}
