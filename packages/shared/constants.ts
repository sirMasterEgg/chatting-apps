export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TEXT_LENGTH = 2000;

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// alphanumeric plus - and _, 3-32 chars
export const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
export const USERNAME_PATTERN = /^[\p{L}\p{N} _.-]{3,20}$/u;

export const MAX_USERS_PER_ROOM = 50;
export const MAX_ROOMS = 500;

export const TEXT_RATE_LIMIT = { points: 10, windowMs: 10_000 };
export const ATTACHMENT_RATE_LIMIT = { points: 3, windowMs: 30_000 };
export const JOIN_RATE_LIMIT = { points: 5, windowMs: 60_000 };

export const TYPING_TTL_MS = 5_000;
export const JOIN_IDLE_TIMEOUT_MS = 60_000;

export const MAX_CLIENT_MESSAGES = 200;
