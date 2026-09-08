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
        'pointer-events-auto flex items-start gap-3 rounded-[20px] border bg-canvas px-4 py-3',
        tone === 'error' ? 'border-ultraviolet text-ink' : 'border-ink text-ink',
      )}
    >
      <Icon name="alert" className={cx('mt-0.5 h-5 w-5 flex-none', tone === 'error' ? 'text-ultraviolet' : 'text-mint-text')} />
      <p className="flex-1 font-sans text-sm">{message}</p>
      <IconButton label="Tutup notifikasi" onClick={onDismiss} className="-mr-1 -mt-1 h-6 w-6">
        <Icon name="x" className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
