import { useEffect } from 'react';
import { Spinner } from './Spinner';

interface LoadingScreenProps {
  onDismiss: () => void;
  /** Auto-dismiss after this many ms; pass 0 to require a manual dismiss. */
  autoDismissMs?: number;
}

/**
 * Full-screen loading takeover. This isn't wired to any real async
 * operation — it's a standalone preview so the loading state can be
 * reviewed/demoed on its own, triggered by a button on the landing page.
 */
export function LoadingScreen({ onDismiss, autoDismissMs = 3000 }: LoadingScreenProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  useEffect(() => {
    if (!autoDismissMs) return undefined;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 bg-canvas"
      onClick={onDismiss}
    >
      <Spinner className="h-9 w-9 text-primary" />
      <p className="font-display text-lg font-semibold tracking-[-0.374px] text-ink">Loading...</p>
      <p className="text-xs text-ink-muted-48">Tap anywhere to dismiss</p>
    </div>
  );
}
