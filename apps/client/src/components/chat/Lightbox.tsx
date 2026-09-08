import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';

interface LightboxProps {
  src: string;
  name: string;
  onClose: () => void;
}

export function Lightbox({ src, name, onClose }: LightboxProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div className="absolute right-4 top-4 flex gap-2">
        <a
          href={src}
          download={name}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white bg-canvas text-white hover:bg-mint hover:text-black hover:border-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-cyan"
          aria-label="Unduh gambar"
        >
          <Icon name="download" className="h-5 w-5" />
        </a>
        <IconButton
          label="Tutup"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="border border-white bg-canvas hover:border-mint"
        >
          <Icon name="x" className="h-5 w-5" />
        </IconButton>
      </div>
      <img
        src={src}
        alt={name}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-[20px] border border-frame object-contain"
      />
    </div>,
    document.body,
  );
}
