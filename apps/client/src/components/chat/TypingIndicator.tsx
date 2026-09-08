interface TypingIndicatorProps {
  usernames: string[];
}

function typingText(usernames: string[]): string {
  if (usernames.length === 0) return '';
  if (usernames.length === 1) return `${usernames[0]} is typing...`;
  if (usernames.length === 2) return `${usernames[0]} and ${usernames[1]} are typing...`;
  return `${usernames.length} people are typing...`;
}

/** Fixed-height row so its appearance/disappearance never shifts the layout. */
export function TypingIndicator({ usernames }: TypingIndicatorProps) {
  return (
    <div className="flex h-6 flex-none items-center px-4 text-xs text-ink-muted-48" aria-live="polite">
      {usernames.length > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
          </span>
          {typingText(usernames)}
        </span>
      )}
    </div>
  );
}
