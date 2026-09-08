import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/format';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ className, label, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-ink/60 transition-colors',
        'hover:bg-ink/5 hover:text-mint-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-cyan',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
