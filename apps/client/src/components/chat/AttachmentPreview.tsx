import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Spinner } from '@/components/ui/Spinner';
import { formatBytes } from '@/lib/format';
import type { AttachmentDraftState } from '@/hooks/useAttachmentDraft';
import type { SendPhase } from '@/types/chat';

interface AttachmentPreviewProps {
  draft: AttachmentDraftState;
  sendPhase: SendPhase;
  onCancel: () => void;
}

export function AttachmentPreview({ draft, sendPhase, onCancel }: AttachmentPreviewProps) {
  const isBusy = sendPhase !== null;
  const isReading = draft.dataUrl === null;

  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-frame bg-canvas-alt px-3 py-2">
      {draft.kind === 'image' && draft.previewUrl ? (
        <img src={draft.previewUrl} alt="" className="h-12 w-12 flex-none rounded-[10px] object-cover" />
      ) : (
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[10px] bg-slate text-white/70">
          <Icon name="file" className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm text-white">{draft.name}</p>
        <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">{formatBytes(draft.size)}</p>
        {sendPhase === 'sending' ? (
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] text-mint">
            <Spinner className="h-3 w-3" />
            <span>Mengirim...</span>
          </div>
        ) : isReading ? (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate">
            <div
              className="h-full bg-mint transition-all"
              style={{ width: `${draft.readProgress}%` }}
            />
          </div>
        ) : null}
      </div>
      {!isBusy && (
        <IconButton label="Batalkan lampiran" onClick={onCancel}>
          <Icon name="x" className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  );
}
