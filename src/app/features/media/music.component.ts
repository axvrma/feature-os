import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatureController } from '../../core/feature-contract';
import { KeypadKey, MusicTrack } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsStorageService } from '../../core/os-storage.service';
import { mediaMetadata, validateMedia } from './media-utils';

@Component({
  selector: 'os-music',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule],
  template: ` <div class="stack">
    <p class="hint">
      Your local listening room. Audio stays on this device; playback pauses when you leave Music.
    </p>
    <input
      #fileInput
      class="file-input"
      type="file"
      accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac"
      multiple
      aria-label="Import audio files"
      (change)="importFiles($event)"
    />
    <button [disabled]="busy" (click)="fileInput.click()">
      {{ busy ? 'Importing…' : '+ Import audio' }}
    </button>
    @if (error) {
      <p role="alert" class="hint">{{ error }}</p>
    }
    <div class="card player-card">
      <span class="music-art" aria-hidden="true">♫</span>
      <strong>{{ selectedTrack?.name || 'Nothing playing' }}</strong>
      <small>{{ selectedTrack?.artist || 'Import an audio file to get started' }}</small>
      <audio
        #audio
        preload="metadata"
        (loadedmetadata)="loaded()"
        (timeupdate)="timeChanged()"
        (play)="playing = true"
        (pause)="playing = false"
        (ended)="next(1)"
        (error)="playbackError()"
      ></audio>
      <div class="actions player-actions">
        <button aria-label="Previous track" [disabled]="!tracks.length" (click)="next(-1)">
          ↶
        </button>
        <button [disabled]="!tracks.length || loading" (click)="toggle()">
          {{ loading ? 'Loading…' : playing ? 'Pause' : 'Play' }}
        </button>
        <button aria-label="Next track" [disabled]="!tracks.length" (click)="next(1)">↷</button>
      </div>
      <label class="field"
        >Seek {{ timeLabel(currentTime) }} / {{ timeLabel(duration)
        }}<input
          aria-label="Seek playback"
          type="range"
          min="0"
          [max]="duration || 1"
          step="0.1"
          [disabled]="!duration"
          [ngModel]="currentTime"
          (ngModelChange)="seek($event)"
      /></label>
      <label class="field"
        >Volume<input
          aria-label="Music volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          [ngModel]="volume"
          (ngModelChange)="setVolume($event)"
      /></label>
    </div>
    <h3>Queue · {{ tracks.length }}</h3>
    @for (track of tracks; track track.id; let index = $index) {
      <div class="row track-row" [class.selected]="track.id === selectedId">
        <button class="track-title" (click)="playTrack(track)">
          <span>{{ index + 1 }}. {{ track.name }}</span
          ><small>{{ track.artist }}</small>
        </button>
        <button aria-label="Move track earlier" [disabled]="index === 0" (click)="move(index, -1)">
          ↑
        </button>
        <button class="danger" [attr.aria-label]="'Delete ' + track.name" (click)="remove(track)">
          ×
        </button>
      </div>
    } @empty {
      <p class="empty">
        No tracks yet. Import MP3, WAV or another audio format supported by your browser.
      </p>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .file-input {
        display: none;
      }
      .player-card {
        display: grid;
        gap: 10px;
        text-align: center;
      }
      .music-art {
        font-size: 56px;
        line-height: 1.2;
        color: var(--accent, #377b68);
      }
      .player-actions {
        justify-content: center;
      }
      .track-row {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .track-title {
        flex: 1;
        min-width: 0;
        text-align: left;
        display: grid;
        gap: 4px;
        background: transparent;
        color: inherit;
      }
      .track-title span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      audio {
        display: none;
      }
      small {
        opacity: 0.7;
      }
    `,
  ],
})
export class MusicComponent implements FeatureController, OnDestroy {
  readonly os = inject(OsStateService);
  private readonly storage = inject(OsStorageService);
  @ViewChild('audio', { static: true }) private audioRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('fileInput', { static: true }) private fileInput!: ElementRef<HTMLInputElement>;
  selectedId = '';
  playing = false;
  loading = false;
  busy = false;
  currentTime = 0;
  duration = 0;
  volume = 0.7;
  error = '';
  private url?: string;
  private request = 0;
  private destroyed = false;
  private restoredTime = 0;

  constructor() {
    try {
      const session = JSON.parse(sessionStorage.getItem('feature-os-music') || '{}') as {
        id?: string;
        time?: number;
        volume?: number;
      };
      if (typeof session.id === 'string') this.selectedId = session.id;
      if (Number.isFinite(session.time)) this.restoredTime = Math.max(0, session.time!);
      if (Number.isFinite(session.volume)) this.volume = Math.min(1, Math.max(0, session.volume!));
    } catch {
      /* Selection recovery is optional; durable media remains in IndexedDB. */
    }
  }
  get tracks(): MusicTrack[] {
    return this.os.data()!.tracks;
  }
  get selectedTrack(): MusicTrack | undefined {
    return this.tracks.find((t) => t.id === this.selectedId);
  }
  get left() {
    return { label: 'Import', run: () => this.fileInput.nativeElement.click() };
  }
  get center() {
    return { label: this.playing ? 'Pause' : 'Play', run: () => void this.toggle() };
  }
  key(key: KeypadKey): boolean {
    if (key === 'call') {
      void this.toggle();
      return true;
    }
    return false;
  }
  async importFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || this.busy) return;
    this.busy = true;
    this.error = '';
    let imported = 0;
    for (const file of files) {
      const problem = validateMedia(file, 'audio');
      if (problem) {
        this.error = `${file.name}: ${problem}`;
        continue;
      }
      const meta = mediaMetadata(file, 'audio');
      try {
        await this.os.importMedia(meta, file);
        this.os.update((data) =>
          data.tracks.push({
            id: meta.id,
            mediaId: meta.id,
            name: file.name.replace(/\.[^.]+$/, ''),
            artist: 'Local audio',
          }),
        );
        if (!this.selectedId) this.selectedId = meta.id;
        imported++;
      } catch (error: unknown) {
        this.error =
          error instanceof Error ? error.message : 'Audio could not be saved. Check storage space.';
        break;
      }
    }
    this.busy = false;
    if (imported)
      this.os.feedback(`${imported} audio file${imported === 1 ? '' : 's'} saved locally.`);
  }
  async playTrack(track: MusicTrack): Promise<void> {
    const request = ++this.request;
    this.loading = true;
    this.error = '';
    this.audioRef.nativeElement.pause();
    try {
      const blob = track.mediaId ? await this.storage.getBlob(track.mediaId) : track.blob;
      if (request !== this.request || this.destroyed) return;
      if (!blob)
        throw new Error('This audio file is missing. Remove it and import the original again.');
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(blob);
      const same = this.selectedId === track.id;
      this.selectedId = track.id;
      if (!same) this.restoredTime = 0;
      const audio = this.audioRef.nativeElement;
      audio.src = this.url;
      audio.volume = this.volume;
      await audio.play();
    } catch (error: unknown) {
      if (request !== this.request || this.destroyed) return;
      this.error =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Tap Play to allow audio in this browser.'
          : error instanceof Error
            ? error.message
            : 'This audio format cannot play in this browser.';
    } finally {
      if (request === this.request) this.loading = false;
    }
  }
  async toggle(): Promise<void> {
    const audio = this.audioRef.nativeElement;
    if (this.playing) {
      audio.pause();
      return;
    }
    const track = this.selectedTrack || this.tracks[0];
    if (!track) {
      this.os.feedback('Import audio first.');
      return;
    }
    if (!audio.src || this.selectedId !== track.id) {
      await this.playTrack(track);
      return;
    }
    try {
      await audio.play();
    } catch {
      this.error = 'Playback was blocked or this format is unsupported. Tap a track to retry.';
    }
  }
  next(delta: number): void {
    if (!this.tracks.length) return;
    const index = this.tracks.findIndex((t) => t.id === this.selectedId);
    const next = (index + delta + this.tracks.length) % this.tracks.length;
    this.restoredTime = 0;
    void this.playTrack(this.tracks[next]);
  }
  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.tracks.length) return;
    this.os.update((data) => {
      const [track] = data.tracks.splice(index, 1);
      data.tracks.splice(target, 0, track);
    });
  }
  loaded(): void {
    const audio = this.audioRef.nativeElement;
    this.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (this.restoredTime && this.duration)
      audio.currentTime = Math.min(this.restoredTime, this.duration);
    this.restoredTime = 0;
  }
  timeChanged(): void {
    this.currentTime = this.audioRef.nativeElement.currentTime;
  }
  seek(value: number): void {
    if (this.duration)
      this.audioRef.nativeElement.currentTime = Math.max(0, Math.min(this.duration, value));
  }
  setVolume(value: number): void {
    this.volume = value;
    this.audioRef.nativeElement.volume = value;
  }
  timeLabel(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }
  playbackError(): void {
    if (this.audioRef.nativeElement.error)
      this.error = 'This browser cannot decode this audio. Try MP3 or WAV.';
  }
  async remove(track: MusicTrack): Promise<void> {
    if (!(await this.os.confirm(`Delete “${track.name}” from this device?`))) return;
    if (track.id === this.selectedId) {
      ++this.request;
      this.audioRef.nativeElement.pause();
      this.audioRef.nativeElement.removeAttribute('src');
      this.audioRef.nativeElement.load();
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = undefined;
      this.selectedId = '';
      this.currentTime = this.duration = 0;
    }
    try {
      await this.os.deleteMedia(track.mediaId || track.id);
    } catch {
      this.os.feedback('The track could not be deleted. Please retry.');
    }
  }
  prepareReload(): boolean {
    if (this.busy) {
      this.os.feedback('Please wait for the audio import to finish before updating.');
      return false;
    }
    const audio = this.audioRef.nativeElement;
    try {
      sessionStorage.setItem(
        'feature-os-music',
        JSON.stringify({
          id: this.selectedId,
          time: audio.currentTime || this.restoredTime,
          volume: this.volume,
        }),
      );
    } catch {
      /* Optional playback recovery. */
    }
    return true;
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    ++this.request;
    const audio = this.audioRef.nativeElement;
    try {
      sessionStorage.setItem(
        'feature-os-music',
        JSON.stringify({
          id: this.selectedId,
          time: audio.currentTime || this.restoredTime,
          volume: this.volume,
        }),
      );
    } catch {
      /* Optional session state. */
    }
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (this.url) URL.revokeObjectURL(this.url);
  }
}
