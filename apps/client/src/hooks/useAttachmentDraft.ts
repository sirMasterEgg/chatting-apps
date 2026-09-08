import { useCallback, useEffect, useRef, useState } from 'react';
import { attachmentKindFromMime, validateAttachmentFile, type AttachmentKind } from '@/lib/validation';

export interface AttachmentDraftState {
  file: File;
  name: string;
  size: number;
  mimeType: string;
  kind: AttachmentKind;
  /** Instant thumbnail via `URL.createObjectURL`, independent of the base64 read below. */
  previewUrl: string | null;
  /** Populated once `FileReader.readAsDataURL` finishes. */
  dataUrl: string | null;
  readProgress: number;
}

/**
 * Owns the lifecycle of a picked-but-not-yet-sent attachment: validates size,
 * generates an instant preview, reads it to a data URL with progress
 * reporting, and surfaces read errors instead of failing silently.
 */
export function useAttachmentDraft() {
  const [draft, setDraft] = useState<AttachmentDraftState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const clear = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setDraft(null);
  }, []);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const selectFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateAttachmentFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      const kind = attachmentKindFromMime(file.type);
      const previewUrl = kind === 'image' ? URL.createObjectURL(file) : null;
      previewUrlRef.current = previewUrl;

      setDraft({
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        kind,
        previewUrl,
        dataUrl: null,
        readProgress: 0,
      });

      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setDraft((prev) => (prev && prev.file === file ? { ...prev, readProgress: progress } : prev));
        }
      };
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          setError('Gagal membaca file. Coba lagi.');
          clear();
          return;
        }
        setDraft((prev) =>
          prev && prev.file === file ? { ...prev, dataUrl: result, readProgress: 100 } : prev,
        );
      };
      reader.onerror = () => {
        setError('Gagal membaca file. Coba lagi.');
        clear();
      };
      reader.readAsDataURL(file);
    },
    [clear],
  );

  return { draft, error, selectFile, clear, setError };
}
