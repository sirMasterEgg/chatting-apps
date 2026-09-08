import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { getSocket } from '@/lib/socket';
import { suggestUsername, validateRoomId, validateUsername } from '@/lib/validation';

function LandingPageInner() {
  const navigate = useNavigate();
  const { setSession } = useSession();

  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [roomIdError, setRoomIdError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  function handleCreateRoom() {
    setRoomId(crypto.randomUUID().slice(0, 8));
    setRoomIdError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedRoomId = roomId.trim();
    const uError = validateUsername(trimmedUsername);
    const rError = validateRoomId(trimmedRoomId);
    setUsernameError(uError);
    setRoomIdError(rError);
    setFormError(null);
    setSuggestion(null);
    if (uError || rError) return;

    setIsJoining(true);
    const socket = getSocket();
    socket.connect();
    socket.emit('room:join', { username: trimmedUsername, roomId: trimmedRoomId }, (res) => {
      setIsJoining(false);
      if (res.ok) {
        setSession({ username: trimmedUsername, roomId: trimmedRoomId });
        navigate(`/room/${trimmedRoomId}`, { state: { initialUsers: res.users, skipJoin: true } });
        return;
      }

      socket.disconnect();
      if (/username|dipakai|taken/i.test(res.error)) {
        setUsernameError(res.error);
        setSuggestion(suggestUsername(trimmedUsername));
        usernameRef.current?.focus();
      } else {
        setFormError(res.error);
      }
    });
  }

  const isFormInvalid =
    validateUsername(username.trim()) !== null || validateRoomId(roomId.trim()) !== null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-16 text-white">
      <div className="mb-10 flex flex-col items-center text-center">
        <p className="mb-3 font-sans text-[19px] font-light uppercase tracking-[1.9px] text-mint">
          No history · No storage
        </p>
        <h1 className="font-display text-[15vw] leading-[0.8] tracking-[1.07px] text-white sm:text-[9rem]">
          CHAT
        </h1>
        <p className="mt-4 max-w-sm font-sans text-sm text-muted">
          Tanpa daftar, tanpa riwayat. Ngobrol, lalu hilang.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-[24px] border border-white bg-canvas p-8">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[1.8px] text-muted">Masuk Room</p>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="username"
              className="block font-mono text-[11px] uppercase tracking-[1.5px] text-muted"
            >
              Username
            </label>
            <input
              id="username"
              ref={usernameRef}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setUsernameError(null);
                setSuggestion(null);
              }}
              autoComplete="off"
              autoFocus
              className="mt-2 w-full rounded-[2px] border border-white/40 bg-canvas px-3 py-2 font-sans text-sm text-white focus-visible:border-mint focus-visible:outline-none"
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? 'username-error' : undefined}
            />
            {usernameError && (
              <p id="username-error" role="alert" className="mt-1.5 font-sans text-xs text-ultraviolet">
                {usernameError}
                {suggestion && (
                  <>
                    {' '}
                    Coba{' '}
                    <button
                      type="button"
                      className="font-mono uppercase tracking-[1px] text-mint underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-cyan"
                      onClick={() => {
                        setUsername(suggestion);
                        setUsernameError(null);
                        setSuggestion(null);
                        usernameRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                    ?
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="roomId"
              className="block font-mono text-[11px] uppercase tracking-[1.5px] text-muted"
            >
              Room ID
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="roomId"
                value={roomId}
                onChange={(event) => {
                  setRoomId(event.target.value);
                  setRoomIdError(null);
                }}
                autoComplete="off"
                className="w-full min-w-0 rounded-[2px] border border-white/40 bg-canvas px-3 py-2 font-sans text-sm text-white focus-visible:border-mint focus-visible:outline-none"
                aria-invalid={!!roomIdError}
                aria-describedby={roomIdError ? 'roomid-error' : undefined}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateRoom}
                className="flex-none whitespace-nowrap"
              >
                Buat Baru
              </Button>
            </div>
            {roomIdError && (
              <p id="roomid-error" role="alert" className="mt-1.5 font-sans text-xs text-ultraviolet">
                {roomIdError}
              </p>
            )}
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-[14px] border border-ultraviolet bg-ultraviolet/10 px-3 py-2 font-sans text-sm text-white"
            >
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isJoining || isFormInvalid}>
            {isJoining ? 'Menghubungkan...' : 'Masuk'}
          </Button>
        </form>
      </div>
    </main>
  );
}

export function LandingPage() {
  return (
    <SessionProvider>
      <LandingPageInner />
    </SessionProvider>
  );
}
