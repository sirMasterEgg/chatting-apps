import { v4 as uuid } from 'uuid';
import type { ChatMessage } from '@shared/types.js';
import { consumeAttachmentToken, consumeTextToken } from '../rateLimit.js';
import type { AppServer, AppSocket } from '../types.js';
import { hasOnlyKeys, isRecord, sanitizeText, validateAttachment } from '../validation.js';
import { clearViolations, registerViolation } from '../violations.js';

const ALLOWED_KEYS = ['kind', 'text', 'attachment'] as const;

type SendAck = (r: { ok: boolean; error?: string }) => void;

function replyRateLimited(socket: AppSocket, ack: SendAck): void {
  ack({ ok: false, error: 'RATE_LIMITED' });
  socket.emit('room:error', {
    code: 'RATE_LIMITED',
    message: 'You are sending messages too fast, please slow down.',
  });
  registerViolation(socket);
}

export function registerMessageSendHandler(io: AppServer, socket: AppSocket): void {
  socket.on('message:send', (payload, ack) => {
    if (typeof ack !== 'function') return;

    const roomId = socket.data.roomId;
    const username = socket.data.username;
    if (!roomId || !username) {
      ack({ ok: false, error: 'NOT_JOINED' });
      return;
    }

    const data: unknown = payload;
    if (!isRecord(data) || !hasOnlyKeys(data, ALLOWED_KEYS)) {
      ack({ ok: false, error: 'INVALID_PAYLOAD' });
      return;
    }

    const { kind, text, attachment } = data;
    if (kind !== 'text' && kind !== 'image' && kind !== 'file') {
      ack({ ok: false, error: 'INVALID_PAYLOAD' });
      return;
    }

    let messagePayload: Pick<ChatMessage, 'kind' | 'text' | 'attachment'>;

    if (kind === 'text') {
      if (!consumeTextToken(socket.id)) {
        replyRateLimited(socket, ack);
        return;
      }
      const cleanText = sanitizeText(text);
      if (!cleanText) {
        ack({ ok: false, error: 'INVALID_TEXT' });
        return;
      }
      messagePayload = { kind: 'text', text: cleanText };
    } else {
      if (!consumeAttachmentToken(socket.id)) {
        replyRateLimited(socket, ack);
        return;
      }
      const result = validateAttachment(kind, attachment);
      if (!result.ok) {
        ack({ ok: false, error: result.error });
        return;
      }
      messagePayload = { kind, attachment: result.attachment };
    }

    clearViolations(socket.id);

    // Server decides id/sentAt/author - client-supplied values for these are
    // never trusted or forwarded. The message object is emitted and then
    // dropped; nothing is retained beyond this handler call.
    const message: ChatMessage = {
      id: uuid(),
      roomId,
      author: { id: socket.id, username },
      sentAt: Date.now(),
      ...messagePayload,
    };

    io.to(roomId).emit('message:new', message);
    ack({ ok: true });
  });
}
