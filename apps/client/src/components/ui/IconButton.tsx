import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/format';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

// button-icon-circular: 44x44 translucent chip, floats over content.
export function IconButton({ className, label, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink transition-colors active:scale-95',
        'hover:bg-chip/50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
