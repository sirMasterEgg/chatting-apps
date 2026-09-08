export type MessageKind = 'text' | 'image' | 'file' | 'system';

export interface User {
  id: string; // socket id
  username: string;
}

export interface Attachment {
  name: string; // nama file asli
  mimeType: string;
  size: number; // bytes (ukuran asli sebelum base64)
  dataUrl: string; // data:<mime>;base64,<...>
}

export interface ChatMessage {
  id: string; // uuid dibuat di server
  roomId: string;
  kind: MessageKind;
  author: User | null; // null untuk pesan sistem
  text?: string;
  attachment?: Attachment;
  sentAt: number; // epoch ms, diisi server
}
