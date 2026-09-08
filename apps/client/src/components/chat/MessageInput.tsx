import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import type { Attachment, MessageKind } from '@shared/types';
import { MAX_TEXT_LENGTH } from '@shared/constants';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useAttachmentDraft } from '@/hooks/useAttachmentDraft';
import { useTypingEmitter } from '@/hooks/useTypingEmitter';
import type { AppSocket } from '@/lib/socket';
import type { SendPhase } from '@/types/chat';
import { AttachmentPreview } from './AttachmentPreview';

export interface MessageInputHandle {
  addFile: (file: File) => void;
}

interface MessageInputProps {
  socket: AppSocket;
  disabled: boolean;
  sendMessage: (payload: { kind: MessageKind; text?: string; attachment?: Attachment }) => Promise<void>;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(function MessageInput(
  { socket, disabled, sendMessage },
  ref,
) {
  const [text, setText] = useState('');
  const [sendPhase, setSendPhase] = useState<SendPhase>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { draft, error: attachError, selectFile, clear: clearAttachment } = useAttachmentDraft();
  const { notifyTyping, stopTyping } = useTypingEmitter(socket);

  useImperativeHandle(ref, () => ({ addFile: selectFile }), [selectFile]);

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setText(value);
      if (value.trim()) {
        notifyTyping();
      } else {
        stopTyping();
      }
    },
    [notifyTyping, stopTyping],
  );

  const handleSend = useCallback(async () => {
    if (disabled || sendPhase) return;
    const trimmed = text.trim();
    const hasAttachment = !!draft;
    if (!trimmed && !hasAttachment) return;
    if (draft && !draft.dataUrl) {
      setSendError('Tunggu file selesai dibaca sebelum mengirim.');
      return;
    }

    stopTyping();
    setSendError(null);

    try {
      if (trimmed) {
        await sendMessage({ kind: 'text', text: trimmed });
        setText('');
      }
      if (draft && draft.dataUrl) {
        setSendPhase('sending');
        await sendMessage({
          kind: draft.kind,
          attachment: {
            name: draft.name,
            mimeType: draft.mimeType,
            size: draft.size,
            dataUrl: draft.dataUrl,
          },
        });
        clearAttachment();
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Pesan gagal terkirim.');
    } finally {
      setSendPhase(null);
    }
  }, [disabled, sendPhase, text, draft, stopTyping, sendMessage, clearAttachment]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectFile(file);
    event.target.value = '';
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(event.clipboardData.items).find((entry) => entry.kind === 'file');
    if (!item) return;
    const file = item.getAsFile();
    if (file) {
      event.preventDefault();
      selectFile(file);
    }
  }

  const displayedError = sendError ?? attachError;

  return (
    <div className="flex-none border-t border-frame bg-canvas px-3 py-3 sm:px-4">
      {draft && (
        <div className="mb-2">
          <AttachmentPreview draft={draft} sendPhase={sendPhase} onCancel={clearAttachment} />
        </div>
      )}

      {displayedError && (
        <p role="alert" className="mb-2 font-mono text-[11px] uppercase tracking-[1px] text-ultraviolet">
          {displayedError}
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
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={stopTyping}
          disabled={disabled}
          maxLength={MAX_TEXT_LENGTH}
          rows={1}
          placeholder={disabled ? 'Menunggu koneksi...' : 'Tulis pesan... (Enter untuk kirim)'}
          aria-label="Tulis pesan"
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-[2px] border border-white/40 bg-canvas px-3 py-2 font-sans text-sm text-white placeholder:text-muted focus-visible:border-mint focus-visible:outline-none disabled:opacity-50"
        />

        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={disabled || (!text.trim() && !draft) || sendPhase !== null}
          className="mb-0.5 flex-none"
          aria-label="Kirim pesan"
        >
          <Icon name="send" className="h-4 w-4" />
          <span className="hidden sm:inline">Kirim</span>
        </Button>
      </div>
    </div>
  );
});
