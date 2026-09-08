import { useEffect, useRef, useState } from 'react';

const BASE_TITLE = document.title;

/**
 * Tracks an unread-message badge in `document.title` while the tab is
 * hidden (Page Visibility API), resetting it as soon as the tab regains
 * focus. Pass the id of the most recent message; every id change while
 * hidden counts as one unread message.
 */
export function useUnreadTitle(latestMessageId: string | null): void {
  const [unreadCount, setUnreadCount] = useState(0);
  const prevIdRef = useRef(latestMessageId);

  useEffect(() => {
    if (latestMessageId === prevIdRef.current) return;
    prevIdRef.current = latestMessageId;
    if (document.hidden) {
      setUnreadCount((count) => count + 1);
    }
  }, [latestMessageId]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        setUnreadCount(0);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
  }, [unreadCount]);

  useEffect(() => () => { document.title = BASE_TITLE; }, []);
}
