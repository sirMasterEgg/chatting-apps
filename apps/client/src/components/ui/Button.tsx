import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// button-primary (blue pill), button-secondary-pill (ghost blue pill),
// text-link (bare), button-dark-utility (ink rect — repurposed here as
// "danger" for the one destructive-ish action, leaving a room).
const variantClasses: Record<Variant, string> = {
  primary: 'rounded-full bg-primary px-5 py-2.5 text-white hover:bg-primary/90 disabled:bg-primary/40',
  secondary:
    'rounded-full border border-primary bg-transparent px-5 py-2.5 text-primary hover:bg-primary/5 disabled:opacity-40',
  ghost: 'rounded-full bg-transparent px-2 py-1 text-primary hover:underline disabled:opacity-40',
  danger: 'rounded-lg bg-ink px-4 py-2 text-white hover:bg-ink/85 disabled:opacity-40',
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 font-sans text-[15px] font-normal transition-transform duration-150 active:scale-95',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus',
        'disabled:cursor-not-allowed disabled:active:scale-100',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
