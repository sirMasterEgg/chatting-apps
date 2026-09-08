import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@shared/types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  selfUsername: string;
}

export function MessageList({ messages, selfUsername }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-4 sm:px-4"
    >
      {messages.map((message) =>
        message.kind === 'system' ? (
          <p key={message.id} className="py-1 text-center text-xs text-slate-500">
            {message.text}
          </p>
        ) : (
          <div key={message.id} className="py-0.5">
            <MessageItem
              message={message}
              isSelf={message.author?.username.toLowerCase() === selfUsername.toLowerCase()}
            />
          </div>
        ),
      )}
    </div>
  );
}
