const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMITED: 'Kamu mengirim terlalu cepat. Tunggu beberapa detik lalu coba lagi.',
};

/** Maps a server error code to a friendlier Indonesian message when known. */
export function friendlyErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? code;
}
