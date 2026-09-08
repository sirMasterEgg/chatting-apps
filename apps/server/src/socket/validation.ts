import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_TEXT_LENGTH,
  ROOM_ID_PATTERN,
  USERNAME_PATTERN,
} from '@shared/constants.js';
import type { Attachment, MessageKind } from '@shared/types.js';

// Regexes below are built from numeric char codes (rather than literal
// escape sequences or raw unicode characters in source) to avoid any
// editor/tool mangling of control / zero-width characters.
function charRange(startCode: number, endCode: number): string {
  let out = '';
  for (let code = startCode; code <= endCode; code += 1) {
    out += String.fromCharCode(code);
  }
  return out;
}

// C0 control chars (0x00-0x1F) minus LF (0x0A) and TAB (0x09), plus DEL
// (0x7F). Safe to strip from multi-line text like chat messages.
const CONTROL_KEEP_NEWLINE_CHARS =
  charRange(0x00, 0x08) +
  charRange(0x0b, 0x0c) +
  charRange(0x0e, 0x1f) +
  String.fromCharCode(0x7f);
// All C0 control chars including LF and TAB — used for single-line fields
// like username/roomId/file name, which must not contain newlines.
const CONTROL_STRICT_CHARS = charRange(0x00, 0x1f) + String.fromCharCode(0x7f);
// Zero-width and bidi-control characters that can be used to obscure text.
const ZERO_WIDTH_CODE_CHARS =
  charRange(0x200b, 0x200f) +
  charRange(0x202a, 0x202e) +
  String.fromCharCode(0x2060) +
  String.fromCharCode(0xfeff);

const CONTROL_CHARS_KEEP_NEWLINE = new RegExp(`[${CONTROL_KEEP_NEWLINE_CHARS}]`, 'g');
const CONTROL_CHARS_STRICT = new RegExp(`[${CONTROL_STRICT_CHARS}]`, 'g');
const ZERO_WIDTH_CHARS = new RegExp(`[${ZERO_WIDTH_CODE_CHARS}]`, 'g');

const MAX_ATTACHMENT_NAME_LENGTH = 255;
const MAX_MIME_LENGTH = 255;
const DATA_URL_PATTERN =
  /^data:([a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+);base64,([A-Za-z0-9+/]+=?=?)$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function stripUnsafeLine(input: string): string {
  return input.replace(CONTROL_CHARS_STRICT, '').replace(ZERO_WIDTH_CHARS, '');
}

/** Trims, strips control/zero-width chars, and checks against USERNAME_PATTERN. */
export function sanitizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = stripUnsafeLine(raw).trim();
  if (!USERNAME_PATTERN.test(cleaned)) return null;
  return cleaned;
}

/** Trims, strips control/zero-width chars, and checks against ROOM_ID_PATTERN. */
export function sanitizeRoomId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = stripUnsafeLine(raw).trim();
  if (!ROOM_ID_PATTERN.test(cleaned)) return null;
  return cleaned;
}

/** Trims, strips unsafe control/zero-width chars (keeps newline/tab), enforces length bounds. */
export function sanitizeText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(CONTROL_CHARS_KEEP_NEWLINE, '')
    .replace(ZERO_WIDTH_CHARS, '')
    .trim();
  if (cleaned.length === 0 || cleaned.length > MAX_TEXT_LENGTH) return null;
  return cleaned;
}

function isAllowedImageType(mime: string): mime is (typeof ALLOWED_IMAGE_TYPES)[number] {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime);
}

export type AttachmentValidationResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; error: string };

const ATTACHMENT_KEYS = ['name', 'mimeType', 'size', 'dataUrl'] as const;

/**
 * Validates an untrusted attachment payload for `message:send` (kind
 * 'image' | 'file'). Never trusts the raw object shape - rejects unknown
 * properties and cross-checks the reported size/mime against the actual
 * decoded base64 payload.
 */
export function validateAttachment(kind: MessageKind, raw: unknown): AttachmentValidationResult {
  if (!isRecord(raw) || !hasOnlyKeys(raw, ATTACHMENT_KEYS)) {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }

  const { name, mimeType, size, dataUrl } = raw;

  if (typeof name !== 'string') {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }
  const cleanedName = stripUnsafeLine(name).trim();
  if (cleanedName.length === 0 || cleanedName.length > MAX_ATTACHMENT_NAME_LENGTH) {
    return { ok: false, error: 'INVALID_ATTACHMENT' };
  }

  if (typeof mimeType !== 'string' || mimeType.length === 0 || mimeType.length > MAX_MIME_LENGTH) {
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
  const [, mime, base64] = match;

  if (mime.toLowerCase() !== mimeType.toLowerCase()) {
    return { ok: false, error: 'INVALID_DATA_URL' };
  }

  if (kind === 'image' && !isAllowedImageType(mime.toLowerCase())) {
    return { ok: false, error: 'UNSUPPORTED_IMAGE_TYPE' };
  }

  if (base64.length === 0 || base64.length % 4 !== 0) {
    return { ok: false, error: 'INVALID_DATA_URL' };
  }

  let decodedSize: number;
  try {
    decodedSize = Buffer.from(base64, 'base64').length;
  } catch {
    return { ok: false, error: 'INVALID_DATA_URL' };
  }

  if (decodedSize > MAX_FILE_SIZE) {
    return { ok: false, error: 'FILE_TOO_LARGE' };
  }

  // Base64 always rounds up to a multiple of 3 raw bytes per 4 chars; allow a
  // tiny delta for that rounding, but reject a clearly falsified `size`.
  if (Math.abs(decodedSize - size) > 2) {
    return { ok: false, error: 'SIZE_MISMATCH' };
  }

  return {
    ok: true,
    attachment: { name: cleanedName, mimeType: mime, size: decodedSize, dataUrl },
  };
}
