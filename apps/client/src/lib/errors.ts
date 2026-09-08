const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMITED: "You're sending messages too fast. Wait a few seconds and try again.",
  USERNAME_TAKEN: 'That username is already taken in this room.',
  INVALID_INPUT: 'Please check your username and room ID.',
  INVALID_PAYLOAD: 'Something went wrong with that request. Please try again.',
  ALREADY_JOINED: "You're already in a room.",
  SERVER_FULL: 'The server is full right now. Please try again later.',
  ROOM_FULL: 'This room is full.',
  NOT_JOINED: "You haven't joined a room yet.",
  INVALID_TEXT: 'Message text is invalid.',
  INVALID_ATTACHMENT: 'That attachment is invalid.',
  FILE_TOO_LARGE: 'That file is too large.',
  INVALID_DATA_URL: 'That file could not be read.',
  UNSUPPORTED_IMAGE_TYPE: 'That image type is not supported.',
  SIZE_MISMATCH: "That file's reported size doesn't match its contents.",
};

/** Maps a server error code to a friendlier message when known. */
export function friendlyErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? code;
}
