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
        <span className="mb-0.5 px-1 text-xs font-medium text-slate-400">{message.author.username}</span>
      )}
      <div
        className={cx(
          'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[65%]',
          isSelf ? 'rounded-tr-sm bg-sky-600 text-white' : 'rounded-tl-sm bg-slate-800 text-slate-100',
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
            className="block overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="max-h-72 max-w-full rounded-lg object-cover"
            />
          </button>
        )}

        {!isInlineImage && attachment && message.kind !== 'text' && (
          <a
            href={attachment.dataUrl}
            download={attachment.name}
            className={cx(
              'flex items-center gap-3 rounded-lg px-2 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300',
              isSelf ? 'bg-sky-700/60 hover:bg-sky-700' : 'bg-slate-700/60 hover:bg-slate-700',
            )}
          >
            <Icon name="file" className="h-6 w-6 flex-none" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{truncateFilename(attachment.name)}</span>
              <span className="block text-xs opacity-75">{formatBytes(attachment.size)}</span>
            </span>
            <Icon name="download" className="h-4 w-4 flex-none" />
          </a>
        )}
      </div>
      <span className="mt-0.5 px-1 text-[11px] text-slate-500">{formatTime(message.sentAt)}</span>
    </div>
  );
}
