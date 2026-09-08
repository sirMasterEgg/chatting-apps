import type { ChatMessage } from '@shared/types';

export interface GroupedMessage {
  message: ChatMessage;
  repeatCount: number;
}

const MERGE_WINDOW_MS = 5000;

/**
 * Collapses consecutive system messages that share the same text and arrive
 * within 5s of each other (e.g. a flaky connection bouncing join/leave for
 * the same person) into a single row with a repeat count, so the log doesn't
 * get flooded.
 */
export function groupSystemMessages(messages: ChatMessage[]): GroupedMessage[] {
  const result: GroupedMessage[] = [];
  for (const message of messages) {
    const last = result[result.length - 1];
    if (
      message.kind === 'system' &&
      last?.message.kind === 'system' &&
      last.message.text === message.text &&
      message.sentAt - last.message.sentAt <= MERGE_WINDOW_MS
    ) {
      last.repeatCount += 1;
      last.message = message;
      continue;
    }
    result.push({ message, repeatCount: 1 });
  }
  return result;
}
