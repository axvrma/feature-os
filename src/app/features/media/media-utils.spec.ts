import { formatBytes, isTextPreview, validateMedia } from './media-utils';

describe('local media validation', () => {
  it('rejects empty, oversized and unsafe image formats', () => {
    expect(validateMedia({ name: 'empty.mp3', size: 0, type: 'audio/mpeg' }, 'audio')).toContain(
      'empty',
    );
    expect(
      validateMedia({ name: 'large.mp3', size: 26 * 1024 * 1024, type: 'audio/mpeg' }, 'audio'),
    ).toContain('25 MB');
    expect(
      validateMedia({ name: 'script.svg', size: 128, type: 'image/svg+xml' }, 'image'),
    ).toContain('JPEG');
    expect(
      validateMedia({ name: 'photo.jpg', size: 11 * 1024 * 1024, type: 'image/jpeg' }, 'image'),
    ).toContain('10 MB');
  });
  it('accepts audio extensions when the browser supplies no MIME type', () => {
    expect(validateMedia({ name: 'song.MP3', size: 100, type: '' }, 'audio')).toBeUndefined();
    expect(validateMedia({ name: 'song.html', size: 100, type: '' }, 'audio')).toContain('audio');
  });
  it('supports safe text previews without interpreting markup', () => {
    expect(isTextPreview('text/html', 'page.html')).toBeTrue();
    expect(isTextPreview('application/octet-stream', 'notes.md')).toBeTrue();
    expect(isTextPreview('application/pdf', 'document.pdf')).toBeFalse();
  });
  it('formats file usage with bounded units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(-1)).toBe('Unknown size');
  });
});
