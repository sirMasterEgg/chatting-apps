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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Realtime Chat</h1>
        <p className="mt-1 text-sm text-slate-400">Tanpa daftar, tanpa riwayat. Ngobrol, lalu hilang.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300">
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
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? 'username-error' : undefined}
            />
            {usernameError && (
              <p id="username-error" role="alert" className="mt-1 text-xs text-rose-400">
                {usernameError}
                {suggestion && (
                  <>
                    {' '}
                    Coba{' '}
                    <button
                      type="button"
                      className="underline hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
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
            <label htmlFor="roomId" className="block text-sm font-medium text-slate-300">
              Room ID
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="roomId"
                value={roomId}
                onChange={(event) => {
                  setRoomId(event.target.value);
                  setRoomIdError(null);
                }}
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                aria-invalid={!!roomIdError}
                aria-describedby={roomIdError ? 'roomid-error' : undefined}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateRoom}
                className="flex-none whitespace-nowrap"
              >
                Buat Room Baru
              </Button>
            </div>
            {roomIdError && (
              <p id="roomid-error" role="alert" className="mt-1 text-xs text-rose-400">
                {roomIdError}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-lg border border-rose-900 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
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
