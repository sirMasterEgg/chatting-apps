import { useCallback, useEffect, useRef } from 'react';
import type { AppSocket } from '@/lib/socket';

const THROTTLE_MS = 2000;
const IDLE_STOP_MS = 1500;

/**
 * Emits `typing:start` (throttled to at most once every 2s) while the user
 * types, and `typing:stop` after 1.5s of inactivity, on empty input, or when
 * explicitly called (message sent).
 */
export function useTypingEmitter(socket: AppSocket) {
  const lastStartRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing:stop');
    }
  }, [socket]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (!isTypingRef.current || now - lastStartRef.current >= THROTTLE_MS) {
      isTypingRef.current = true;
      lastStartRef.current = now;
      socket.emit('typing:start');
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, IDLE_STOP_MS);
  }, [socket, stopTyping]);

  useEffect(() => () => stopTyping(), [stopTyping]);

  return { notifyTyping, stopTyping };
}
