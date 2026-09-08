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
        'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur',
        tone === 'error'
          ? 'border-rose-800 bg-rose-950/90 text-rose-100'
          : 'border-slate-700 bg-slate-900/90 text-slate-100',
      )}
    >
      <Icon name="alert" className="mt-0.5 h-5 w-5 flex-none" />
      <p className="flex-1 text-sm">{message}</p>
      <IconButton label="Tutup notifikasi" onClick={onDismiss} className="-mr-1 -mt-1 h-6 w-6">
        <Icon name="x" className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
