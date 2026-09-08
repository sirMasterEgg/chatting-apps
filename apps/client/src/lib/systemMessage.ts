export type SystemMessageTone = 'join' | 'leave' | 'info';

/** Picks a display tone/icon for a system message based on its text. */
export function systemMessageTone(text: string | undefined): SystemMessageTone {
  if (!text) return 'info';
  if (text.includes('bergabung')) return 'join';
  if (text.includes('meninggalkan')) return 'leave';
  return 'info';
}
