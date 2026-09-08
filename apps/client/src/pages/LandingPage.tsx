import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { friendlyErrorMessage } from '@/lib/errors';
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
      if (/username|taken/i.test(res.error)) {
        setUsernameError(friendlyErrorMessage(res.error));
        setSuggestion(suggestUsername(trimmedUsername));
        usernameRef.current?.focus();
      } else {
        setFormError(friendlyErrorMessage(res.error));
      }
    });
  }

  const isFormInvalid =
    validateUsername(username.trim()) !== null || validateRoomId(roomId.trim()) !== null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-16 text-ink">
      <div className="mb-10 flex flex-col items-center text-center">
        <p className="max-w-sm font-sans text-lg font-normal leading-snug text-ink-muted-80">
          No sign-up, no history. Talk, then it's gone.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-[18px] border border-hairline bg-canvas p-6">
        <p className="text-sm font-semibold text-ink">Join a room</p>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="username" className="block text-xs text-ink-muted-48">
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
              className="mt-1.5 w-full rounded-full border border-hairline bg-canvas px-4 py-2.5 font-sans text-[15px] text-ink focus-visible:border-primary focus-visible:outline-none"
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? 'username-error' : undefined}
            />
            {usernameError && (
              <p id="username-error" role="alert" className="mt-1.5 px-1 font-sans text-xs text-ink-muted-80">
                {usernameError}
                {suggestion && (
                  <>
                    {' '}
                    Try{' '}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2 hover:text-primary-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus"
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
            <label htmlFor="roomId" className="block text-xs text-ink-muted-48">
              Room ID
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="roomId"
                value={roomId}
                onChange={(event) => {
                  setRoomId(event.target.value);
                  setRoomIdError(null);
                }}
                autoComplete="off"
                className="w-full min-w-0 rounded-full border border-hairline bg-canvas px-4 py-2.5 font-sans text-[15px] text-ink focus-visible:border-primary focus-visible:outline-none"
                aria-invalid={!!roomIdError}
                aria-describedby={roomIdError ? 'roomid-error' : undefined}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateRoom}
                className="flex-none whitespace-nowrap"
              >
                New Room
              </Button>
            </div>
            {roomIdError && (
              <p id="roomid-error" role="alert" className="mt-1.5 px-1 font-sans text-xs text-ink-muted-80">
                {roomIdError}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-[14px] border border-hairline bg-parchment px-3 py-2 font-sans text-sm text-ink">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isJoining || isFormInvalid}>
            {isJoining ? 'Connecting...' : 'Join'}
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
