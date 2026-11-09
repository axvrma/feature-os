import { MediaItem } from '../../core/os-models';

export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|oga|wav|flac|webm)$/i;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export function validateMedia(
  file: Pick<File, 'name' | 'size' | 'type'>,
  kind: MediaItem['kind'],
): string | undefined {
  if (!file.size) return 'This file is empty.';
  const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_MEDIA_BYTES;
  if (file.size > limit) return `Choose a file smaller than ${kind === 'image' ? 10 : 25} MB.`;
  if (
    kind === 'audio' &&
    !(file.type.startsWith('audio/') || (!file.type && AUDIO_EXTENSIONS.test(file.name)))
  )
    return 'Choose a supported audio file.';
  if (kind === 'image' && !IMAGE_TYPES.has(file.type))
    return 'Choose a JPEG, PNG, WebP, GIF or AVIF image.';
  return undefined;
}

export function mediaMetadata(file: File, kind: MediaItem['kind']): MediaItem {
  return {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 255),
    type: file.type || 'application/octet-stream',
    size: file.size,
    createdAt: new Date().toISOString(),
    kind,
  };
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size < 0) return 'Unknown size';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function isTextPreview(type: string, name: string): boolean {
  return (
    type.startsWith('text/') ||
    type === 'application/json' ||
    /\.(txt|md|csv|json|log)$/i.test(name)
  );
}

/** Decode locally, constrain oversized photos, and retain the source if decoding is unsupported. */
export async function optimizePhoto(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file; // Preserve animated GIFs.
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const converted = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.84),
    );
    return converted && converted.size < file.size ? converted : file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name.replace(/[/\\]/g, '_');
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
