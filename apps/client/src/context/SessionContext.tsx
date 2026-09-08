import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Session } from '@/types/chat';

const STORAGE_KEY = 'chat:session';

interface SessionContextValue {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.username === 'string' && typeof parsed.roomId === 'string') {
      return { username: parsed.username, roomId: parsed.roomId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Reads/writes the current { username, roomId } session, mirrored to
 * `sessionStorage` so a refresh on `/room/:id` doesn't lose it. Each page
 * that needs it (LandingPage, RoomPage) wraps itself in this provider — since
 * only one page is mounted at a time, sessionStorage itself is the real
 * shared source of truth across navigations, not a single app-wide tree.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => readStoredSession());

  const setSession = useCallback((next: Session) => {
    setSessionState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // sessionStorage unavailable (private mode, quota, etc.) — session still
      // works for the lifetime of this in-memory state.
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
