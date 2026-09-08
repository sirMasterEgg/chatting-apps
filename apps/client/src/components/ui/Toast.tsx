import { useEffect } from 'react';
import { cx } from '@/lib/format';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  tone?: 'error' | 'info';
  autoDismissMs?: number;
}

export function Toast({ message, onDismiss, tone = 'error', autoDismissMs = 6000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissMs, message]);

  return (
    <div
      role="alert"
      className={cx(
        'pointer-events-auto flex items-start gap-3 rounded-[18px] border bg-canvas px-4 py-3',
        tone === 'error' ? 'border-2 border-ink' : 'border-hairline',
      )}
    >
      <Icon name="alert" className="mt-0.5 h-5 w-5 flex-none text-ink" />
      <p className="flex-1 font-sans text-sm text-ink">{message}</p>
      <IconButton label="Dismiss notification" onClick={onDismiss} className="-mr-2 -mt-2 h-8 w-8">
        <Icon name="x" className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
