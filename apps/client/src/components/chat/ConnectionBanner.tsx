import { Spinner } from '@/components/ui/Spinner';
import type { ConnectionStatus } from '@/types/chat';

const COPY: Partial<Record<ConnectionStatus, string>> = {
  connecting: 'Connecting...',
  reconnecting: 'Reconnecting...',
  offline: 'Connection lost.',
};

export function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  const message = COPY[status];
  if (!message) return null;
  return (
    <div
      role="status"
      className="flex flex-none items-center justify-center gap-2 border-b border-hairline bg-ink px-4 py-1.5 text-xs text-white"
    >
      <Spinner className="h-3.5 w-3.5" />
      <span>{message}</span>
    </div>
  );
}
