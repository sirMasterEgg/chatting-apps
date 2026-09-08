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
        'inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
