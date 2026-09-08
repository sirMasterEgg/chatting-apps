import type { ChatMessage } from '@shared/types';
import { Icon } from '@/components/ui/Icon';
import { formatTime } from '@/lib/format';
import { systemMessageTone } from '@/lib/systemMessage';

interface SystemMessageRowProps {
  message: ChatMessage;
  repeatCount: number;
}

export function SystemMessageRow({ message, repeatCount }: SystemMessageRowProps) {
  const tone = systemMessageTone(message.text);
  return (
    <div className="flex items-center justify-center gap-1.5 py-2 text-center font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
      <Icon
        name={tone === 'join' ? 'login' : tone === 'leave' ? 'logout' : 'check'}
        className={tone === 'join' ? 'h-3.5 w-3.5 flex-none text-mint' : tone === 'leave' ? 'h-3.5 w-3.5 flex-none text-ultraviolet' : 'h-3.5 w-3.5 flex-none'}
      />
      <span>{message.text}</span>
      {repeatCount > 1 && <span className="text-white/40">×{repeatCount}</span>}
      <span className="text-white/40">{formatTime(message.sentAt)}</span>
    </div>
  );
}
