import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-mint text-black hover:bg-white/20 hover:ring-1 hover:ring-[#c2c2c2] disabled:bg-mint/40',
  secondary:
    'bg-slate text-muted-text hover:bg-white/20 hover:text-black hover:ring-1 hover:ring-[#c2c2c2] disabled:opacity-40',
  ghost: 'bg-transparent text-ink/70 hover:text-mint-text',
  danger:
    'border border-ultraviolet bg-transparent text-ultraviolet hover:bg-ultraviolet hover:text-white disabled:opacity-40',
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[24px] px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[1.5px] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-cyan',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
