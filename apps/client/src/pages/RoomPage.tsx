import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Toast } from '@/components/ui/Toast';
import { ConnectionBanner } from '@/components/chat/ConnectionBanner';
import { Lightbox } from '@/components/chat/Lightbox';
import { MessageInput, type MessageInputHandle } from '@/components/chat/MessageInput';
import { MessageList } from '@/components/chat/MessageList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { UserList } from '@/components/chat/UserList';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { SocketProvider, useSocket } from '@/context/SocketContext';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useUnreadTitle } from '@/hooks/useUnreadTitle';

function RoomPageInner() {
  const { roomId: routeRoomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { session, clearSession } = useSession();
  const { socket, status } = useSocket();

  // No/mismatched session (e.g. a pasted room URL) — bounce to landing.
  useEffect(() => {
    if (!session || session.roomId !== routeRoomId) {
      navigate('/', { replace: true });
    }
  }, [session, routeRoomId, navigate]);

  const {
    phase,
    joinError,
    showRejoinFailedDialog,
    messages,
    users,
    typingUsernames,
    roomError,
    clearRoomError,
    sendMessage,
    leaveRoom,
  } = useChatRoom(session);

  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const messageInputRef = useRef<MessageInputHandle>(null);

  const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useUnreadTitle(latestMessageId);

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

  const inputDisabled = status !== 'online' || phase !== 'joined';

  return (
    <div className="flex h-screen flex-col bg-canvas text-ink">
      <ConnectionBanner status={status} />

      {/* Room shell: full width on mobile, pinned to a centered 50%-width
          column from the md breakpoint up — a narrower reading column reads
          better than an edge-to-edge chat on wide desktop viewports. */}
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col md:w-1/2 md:min-w-[420px] md:border-x md:border-hairline">
        {/* sub-nav-frosted: parchment @ ~80% + blur, category name left,
            primary action right — Apple's product-page sub-nav pattern. */}
        <header className="flex flex-none items-center justify-between gap-3 border-b border-hairline bg-parchment/80 px-4 py-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="truncate text-[21px] font-semibold leading-tight tracking-[0.231px] text-ink">
              {session.roomId}
            </h1>
            <IconButton label="Salin Room ID" onClick={handleCopyRoomId} className="h-9 w-9">
              <Icon name={copyFeedback ? 'check' : 'copy'} className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="flex flex-none items-center gap-2">
            <IconButton label="Buka daftar user" className="h-9 w-9 md:hidden" onClick={() => setDrawerOpen(true)}>
              <Icon name="users" className="h-5 w-5" />
            </IconButton>
            <Button variant="danger" onClick={handleLeave}>
              <Icon name="logout" className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div
            className="flex min-w-0 flex-1 flex-col"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) messageInputRef.current?.addFile(file);
            }}
          >
            {phase === 'joining' && (
              <div className="flex flex-1 items-center justify-center text-sm text-ink-muted-48">
                Bergabung ke room...
              </div>
            )}

            {phase === 'failed' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="font-sans text-sm text-ink">{joinError ?? 'Gagal bergabung ke room.'}</p>
                <Button onClick={handleBackToLanding}>Kembali ke Landing</Button>
              </div>
            )}

            {phase === 'joined' && (
              <>
                {users.length <= 1 && (
                  <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-hairline bg-canvas px-4 py-2.5 font-sans text-sm text-ink sm:mx-4">
                    <span>
                      Kamu sendirian di sini. Ajak orang lain pakai Room ID{' '}
                      <span className="font-semibold text-primary">{session.roomId}</span>.
                    </span>
                    <Button variant="secondary" onClick={handleCopyRoomId} className="flex-none">
                      <Icon name="copy" className="h-4 w-4" />
                      {copyFeedback ? 'Tersalin!' : 'Salin'}
                    </Button>
                  </div>
                )}
                <MessageList
                  messages={messages}
                  selfUsername={session.username}
                  onImageClick={(src, name) => setLightbox({ src, name })}
                />
                <TypingIndicator usernames={typingUsernames} />
                <MessageInput
                  ref={messageInputRef}
                  socket={socket}
                  disabled={inputDisabled}
                  sendMessage={sendMessage}
                />
              </>
            )}
          </div>

          <aside className="hidden w-60 flex-none border-l border-hairline md:block">
            <UserList users={users} selfUsername={session.username} />
          </aside>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="w-64 flex-none border-l border-hairline bg-canvas">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="px-2 text-xs font-semibold text-ink-muted-48">Peserta</span>
              <IconButton label="Tutup daftar user" onClick={() => setDrawerOpen(false)} className="h-9 w-9">
                <Icon name="x" className="h-4 w-4" />
              </IconButton>
            </div>
            <UserList users={users} selfUsername={session.username} />
          </div>
        </div>
      )}

      {lightbox && (
        <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)} />
      )}

      {roomError && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-sm">
            <Toast message={roomError.message} onDismiss={clearRoomError} />
          </div>
        </div>
      )}

      {showRejoinFailedDialog && (
        <Dialog title="Gagal tersambung kembali" actions={<Button onClick={handleBackToLanding}>Kembali ke Landing</Button>}>
          Sesi kamu tidak bisa dipulihkan otomatis (mis. username sudah dipakai sesi lama). Silakan kembali ke landing dan masuk lagi.
        </Dialog>
      )}
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
