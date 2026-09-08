import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_TEXT_LENGTH,
  ROOM_ID_PATTERN,
  USERNAME_PATTERN,
} from '@shared/constants.js';
import type { Attachment, MessageKind } from '@shared/types.js';

const DATA_URL_PATTERN =
  /^data:([a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+);base64,([A-Za-z0-9+/]+=?=?)$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Trims and checks against USERNAME_PATTERN (3-20 chars, non-empty). */
export function sanitizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!USERNAME_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/** Trims and checks against ROOM_ID_PATTERN (3-32 alphanumeric + - / _). */
export function sanitizeRoomId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!ROOM_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/** Trims and enforces MAX_TEXT_LENGTH; rejects empty text. */
export function sanitizeText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TEXT_LENGTH) return null;
  return trimmed;
}

function isAllowedImageType(mime: string): mime is (typeof ALLOWED_IMAGE_TYPES)[number] {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
}

export type AttachmentValidationResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; error: string };

/**
 * Validates an untrusted attachment payload for `message:send` (kind
 * 'image' | 'file') per docs/issue-2.md section 2: attachment must be
 * present, size within MAX_FILE_SIZE, and dataUrl a well-formed
 * `data:<mime>;base64,...` string.
 */
export function validateAttachment(kind: MessageKind, raw: unknown): AttachmentValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }

  const { name, mimeType, size, dataUrl } = raw;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }

  if (typeof mimeType !== 'string' || mimeType.length === 0) {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }

  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }
  if (size > MAX_FILE_SIZE) {
    return { ok: false, error: 'FILE_TOO_LARGE' };
  }

  if (typeof dataUrl !== 'string') {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    return { ok: false, error: 'INVALID_DATA_URL' };
  }
  const [, mime] = match;

  if (mime.toLowerCase() !== mimeType.toLowerCase()) {
    return { ok: false, error: 'INVALID_DATA_URL' };
  }

  if (kind === 'image' && !isAllowedImageType(mime.toLowerCase())) {
    return { ok: false, error: 'UNSUPPORTED_IMAGE_TYPE' };
  }

  return {
    ok: true,
    attachment: { name: name.trim(), mimeType: mime, size, dataUrl },
  };
}
