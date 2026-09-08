import { useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Attachment, MessageKind } from '@shared/types';
import { MAX_TEXT_LENGTH } from '@shared/constants';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { attachmentKindFromMime, validateAttachmentFile } from '@/lib/validation';

interface PendingAttachment {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  kind: 'image' | 'file';
}

interface MessageInputProps {
  disabled: boolean;
  sendMessage: (payload: { kind: MessageKind; text?: string; attachment?: Attachment }) => Promise<void>;
}

export function MessageInput({ disabled, sendMessage }: MessageInputProps) {
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<PendingAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback((file: File) => {
    setError(null);
    const validationError = validateAttachmentFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setError('Gagal membaca file. Coba lagi.');
        return;
      }
      setPendingFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: result,
        kind: attachmentKindFromMime(file.type),
      });
    };
    reader.onerror = () => setError('Gagal membaca file. Coba lagi.');
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) readFile(file);
  };

  const handleSend = useCallback(async () => {
    if (disabled || isSending) return;
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;

    setIsSending(true);
    setError(null);
    try {
      if (trimmed) {
        await sendMessage({ kind: 'text', text: trimmed });
        setText('');
      }
      if (pendingFile) {
        await sendMessage({
          kind: pendingFile.kind,
          attachment: {
            name: pendingFile.name,
            mimeType: pendingFile.mimeType,
            size: pendingFile.size,
            dataUrl: pendingFile.dataUrl,
          },
        });
        setPendingFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pesan gagal terkirim.');
    } finally {
      setIsSending(false);
    }
  }, [disabled, isSending, text, pendingFile, sendMessage]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex-none border-t border-slate-800 bg-slate-900/60 px-3 py-3 sm:px-4">
      {pendingFile && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
          <Icon name={pendingFile.kind === 'image' ? 'image' : 'file'} className="h-4 w-4 flex-none" />
          <span className="min-w-0 flex-1 truncate">{pendingFile.name}</span>
          <IconButton label="Batalkan lampiran" onClick={() => setPendingFile(null)} className="h-6 w-6">
            <Icon name="x" className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      )}

      {error && (
        <p role="alert" className="mb-2 text-xs text-rose-400">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
        <IconButton
          label="Lampirkan file"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="mb-0.5"
        >
          <Icon name="paperclip" className="h-5 w-5" />
        </IconButton>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={MAX_TEXT_LENGTH}
          rows={1}
          placeholder={disabled ? 'Menunggu koneksi...' : 'Tulis pesan... (Enter untuk kirim)'}
          aria-label="Tulis pesan"
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-60"
        />

        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={disabled || (!text.trim() && !pendingFile) || isSending}
          className="mb-0.5 flex-none"
          aria-label="Kirim pesan"
        >
          <Icon name="send" className="h-4 w-4" />
          <span className="hidden sm:inline">Kirim</span>
        </Button>
      </div>
    </div>
  );
}
