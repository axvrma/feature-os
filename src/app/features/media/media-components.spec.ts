import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { seedData } from '../../core/data';
import { MediaItem, OsData } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsStorageService } from '../../core/os-storage.service';
import { FilesComponent } from './files.component';
import { MusicComponent } from './music.component';

describe('local media components', () => {
  const meta: MediaItem = {
    id: 'local-file',
    name: 'document.html',
    kind: 'file',
    type: 'text/html',
    size: 44,
    createdAt: '2026-11-09T09:00:00.000Z',
  };
  let value: ReturnType<typeof signal<OsData>>;
  let importMedia: jasmine.Spy;
  let deleteMedia: jasmine.Spy;
  let getBlob: jasmine.Spy;

  beforeEach(() => {
    value = signal(seedData());
    importMedia = jasmine
      .createSpy('importMedia')
      .and.callFake(async (item: MediaItem, _blob: Blob) =>
        value.update((data) => ({ ...data, media: [...data.media, item] })),
      );
    deleteMedia = jasmine.createSpy('deleteMedia').and.resolveTo();
    getBlob = jasmine.createSpy('getBlob');
    TestBed.configureTestingModule({
      imports: [MusicComponent, FilesComponent],
      providers: [
        {
          provide: OsStateService,
          useValue: {
            data: value,
            importMedia,
            deleteMedia,
            feedback: jasmine.createSpy('feedback'),
            confirm: jasmine.createSpy('confirm').and.resolveTo(true),
            update: (mutate: (data: OsData) => void) => {
              const next = structuredClone(value());
              mutate(next);
              value.set(next);
            },
          },
        },
        { provide: OsStorageService, useValue: { getBlob } },
      ],
    });
    spyOn(HTMLMediaElement.prototype, 'pause').and.stub();
    spyOn(HTMLMediaElement.prototype, 'load').and.stub();
    spyOn(HTMLMediaElement.prototype, 'play').and.resolveTo();
  });

  it('imports audio as a durable blob reference without transient URLs', async () => {
    const fixture = TestBed.createComponent(MusicComponent);
    fixture.detectChanges();
    const file = new File(['audio bytes'], 'song.mp3', { type: 'audio/mpeg' });
    await fixture.componentInstance.importFiles({
      target: { files: [file], value: '' },
    } as unknown as Event);
    expect(importMedia).toHaveBeenCalled();
    const track = value().tracks.at(-1)!;
    expect(track.name).toBe('song');
    expect(track.mediaId).toBe(value().media.at(-1)!.id);
    expect(track.blob).toBeUndefined();
    expect(track.url).toBeUndefined();
    fixture.destroy();
  });

  it('releases playback URLs on exit and pauses the audio resource', async () => {
    const fixture = TestBed.createComponent(MusicComponent);
    fixture.detectChanges();
    getBlob.and.resolveTo(new Blob(['audio'], { type: 'audio/mpeg' }));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:local-audio-test');
    const revoke = spyOn(URL, 'revokeObjectURL').and.stub();
    const track = { id: 'song', mediaId: 'song', name: 'Song', artist: 'Local audio' };
    value.update((data) => ({ ...data, tracks: [track] }));
    await fixture.componentInstance.playTrack(track);
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:local-audio-test');
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('renders imported HTML as escaped text instead of executing it', async () => {
    value.update((data) => ({ ...data, media: [meta] }));
    getBlob.and.resolveTo(
      new Blob(['<script>window.stolen = true</script>'], { type: 'text/html' }),
    );
    const fixture = TestBed.createComponent(FilesComponent);
    fixture.detectChanges();
    await fixture.componentInstance.open(meta);
    fixture.detectChanges();
    expect(fixture.componentInstance.previewKind).toBe('text');
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('pre')!.textContent).toContain('<script>');
    expect(element.querySelector('script')).toBeNull();
    fixture.destroy();
  });

  it('uses atomic shared deletion and consumes Back inside a file preview', async () => {
    value.update((data) => ({ ...data, media: [meta] }));
    getBlob.and.resolveTo(new Blob(['text'], { type: 'text/plain' }));
    const fixture = TestBed.createComponent(FilesComponent);
    fixture.detectChanges();
    await fixture.componentInstance.open(meta);
    expect(fixture.componentInstance.key('back')).toBeTrue();
    expect(fixture.componentInstance.selected).toBeUndefined();
    await fixture.componentInstance.remove(meta);
    expect(deleteMedia).toHaveBeenCalledWith(meta.id);
    fixture.destroy();
  });
});
