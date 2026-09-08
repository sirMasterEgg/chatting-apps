import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  onClose?: () => void;
}

export function Dialog({ title, children, actions, onClose }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && onClose) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-sm rounded-[24px] border border-white bg-canvas p-6 focus:outline-none"
      >
        <h2 id="dialog-title" className="font-sans text-lg font-bold text-white">
          {title}
        </h2>
        <div className="mt-2 font-sans text-sm text-muted">{children}</div>
        <div className="mt-6 flex justify-end gap-2">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
