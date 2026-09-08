import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  ROOM_ID_PATTERN,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from '@shared/constants';
import { formatBytes } from './format';

export function validateUsername(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Username wajib diisi.';
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return `Username harus ${USERNAME_MIN}-${USERNAME_MAX} karakter.`;
  }
  if (!USERNAME_PATTERN.test(value)) {
    return 'Username hanya boleh berisi huruf, angka, spasi, titik, garis bawah, dan strip.';
  }
  return null;
}

export function validateRoomId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Room ID wajib diisi.';
  if (!ROOM_ID_PATTERN.test(value)) {
    return 'Room ID 3-32 karakter: huruf, angka, garis bawah, atau strip.';
  }
  return null;
}

export type AttachmentKind = 'image' | 'file';

export function attachmentKindFromMime(mimeType: string): AttachmentKind {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType) ? 'image' : 'file';
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" berukuran ${formatBytes(file.size)}, melebihi batas ${formatBytes(MAX_FILE_SIZE)}.`;
  }
  return null;
}
