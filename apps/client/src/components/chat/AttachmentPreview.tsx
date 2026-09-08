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
    <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2">
      {draft.kind === 'image' && draft.previewUrl ? (
        <img src={draft.previewUrl} alt="" className="h-12 w-12 flex-none rounded-md object-cover" />
      ) : (
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-md bg-slate-700 text-slate-300">
          <Icon name="file" className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-100">{draft.name}</p>
        <p className="text-xs text-slate-400">{formatBytes(draft.size)}</p>
        {sendPhase === 'sending' ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-sky-400">
            <Spinner className="h-3 w-3" />
            <span>Mengirim...</span>
          </div>
        ) : isReading ? (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-sky-500 transition-all"
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
