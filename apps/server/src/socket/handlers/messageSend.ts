import { v4 as uuid } from 'uuid';
import type { ChatMessage } from '@shared/types.js';
import type { AppServer, AppSocket } from '../types.js';
import { isRecord, sanitizeText, validateAttachment } from '../validation.js';

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
    if (!isRecord(data)) {
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
      const cleanText = sanitizeText(text);
      if (!cleanText) {
        ack({ ok: false, error: 'INVALID_TEXT' });
        return;
      }
      messagePayload = { kind: 'text', text: cleanText };
    } else {
      const result = validateAttachment(kind, attachment);
      if (!result.ok) {
        ack({ ok: false, error: result.error });
        return;
      }
      messagePayload = { kind, attachment: result.attachment };
    }

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
