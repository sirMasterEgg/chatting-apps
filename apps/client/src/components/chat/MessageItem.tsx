import Linkify from 'linkify-react';
import type { ChatMessage } from '@shared/types';
import { Icon } from '@/components/ui/Icon';
import { cx, formatBytes, formatTime, truncateFilename } from '@/lib/format';
import { linkifyOptions } from '@/lib/linkify';
import { attachmentKindFromMime } from '@/lib/validation';

interface MessageItemProps {
  message: ChatMessage;
  isSelf: boolean;
  onImageClick: (src: string, name: string) => void;
}

export function MessageItem({ message, isSelf, onImageClick }: MessageItemProps) {
  const attachment = message.attachment;
  // Never trust `message.kind` alone for whether to render an inline <img> —
  // re-derive from the actual mimeType so a mislabeled/non-whitelisted file
  // always falls back to a plain file card.
  const isInlineImage = message.kind === 'image' && !!attachment && attachmentKindFromMime(attachment.mimeType) === 'image';

  return (
    <div className={cx('flex flex-col', isSelf ? 'items-end' : 'items-start')}>
      {!isSelf && message.author && (
        <span className="mb-1 px-1 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-muted">
          {message.author.username}
        </span>
      )}
      <div
        className={cx(
          'max-w-[80%] rounded-[20px] px-4 py-2.5 font-sans text-sm sm:max-w-[65%]',
          isSelf
            ? 'rounded-tr-[4px] bg-mint text-black'
            : 'rounded-tl-[4px] border border-white/80 bg-canvas text-white',
        )}
      >
        {message.kind === 'text' && (
          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            <Linkify options={linkifyOptions}>{message.text ?? ''}</Linkify>
          </div>
        )}

        {isInlineImage && attachment && (
          <button
            type="button"
            onClick={() => onImageClick(attachment.dataUrl, attachment.name)}
            className="block overflow-hidden rounded-[12px] border border-frame focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-cyan"
          >
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="max-h-72 max-w-full rounded-[10px] object-cover"
            />
          </button>
        )}

        {!isInlineImage && attachment && message.kind !== 'text' && (
          <a
            href={attachment.dataUrl}
            download={attachment.name}
            className={cx(
              'flex items-center gap-3 rounded-[14px] px-2.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-cyan',
              isSelf ? 'bg-black/10 hover:bg-black/15' : 'bg-white/5 hover:bg-white/10',
            )}
          >
            <Icon name="file" className="h-6 w-6 flex-none" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{truncateFilename(attachment.name)}</span>
              <span className="block font-mono text-[10px] uppercase tracking-[1px] opacity-70">
                {formatBytes(attachment.size)}
              </span>
            </span>
            <Icon name="download" className="h-4 w-4 flex-none" />
          </a>
        )}
      </div>
      <span className="mt-1 px-1 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
        {formatTime(message.sentAt)}
      </span>
    </div>
  );
}
