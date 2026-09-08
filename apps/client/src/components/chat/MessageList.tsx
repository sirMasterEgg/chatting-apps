import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '@shared/types';
import { Icon } from '@/components/ui/Icon';
import { groupSystemMessages } from '@/lib/groupSystemMessages';
import { MessageItem } from './MessageItem';
import { SystemMessageRow } from './SystemMessageRow';

interface MessageListProps {
  messages: ChatMessage[];
  selfUsername: string;
  onImageClick: (src: string, name: string) => void;
}

const BOTTOM_THRESHOLD_PX = 96;

export function MessageList({ messages, selfUsername, onImageClick }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const prevLengthRef = useRef(messages.length);

  const grouped = useMemo(() => groupSystemMessages(messages), [messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    function handleScroll() {
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX;
      setIsAtBottom(atBottom);
      if (atBottom) setNewCount(0);
    }
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    const added = messages.length - prevLengthRef.current;
    prevLengthRef.current = messages.length;
    if (!el || added <= 0) return;
    if (isAtBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      setNewCount((count) => count + added);
    }
    // Only re-scroll/track when the message count actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  function scrollToBottom() {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setNewCount(0);
    setIsAtBottom(true);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="h-full space-y-0.5 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {grouped.map(({ message, repeatCount }) =>
          message.kind === 'system' ? (
            <SystemMessageRow key={message.id} message={message} repeatCount={repeatCount} />
          ) : (
            <div key={message.id} className="py-0.5">
              <MessageItem
                message={message}
                isSelf={message.author?.username.toLowerCase() === selfUsername.toLowerCase()}
                onImageClick={onImageClick}
              />
            </div>
          ),
        )}
      </div>

      {newCount > 0 && !isAtBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-white transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus"
        >
          <Icon name="arrowDown" className="h-3.5 w-3.5" />
          Pesan baru{newCount > 1 ? ` (${newCount})` : ''}
        </button>
      )}
    </div>
  );
}
