import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FeatureController } from '../../core/feature-contract';
import { KeypadKey, MediaItem } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsStorageService } from '../../core/os-storage.service';
import {
  downloadBlob,
  formatBytes,
  mediaMetadata,
  optimizePhoto,
  validateMedia,
} from './media-utils';

@Component({
  selector: 'os-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule],
  template: ` <div class="stack">
    <p class="hint">
      A private album on this device. Photos are optimized toward 1600 pixels when that saves space;
      some originals are retained.
    </p>
    <div class="actions">
      <button [disabled]="busy" (click)="photoInput.click()">
        {{ busy ? 'Saving…' : 'Import photos' }}
      </button>
      <button [disabled]="busy" (click)="cameraInput.click()">Take / choose photo</button>
    </div>
    <input
      #photoInput
      class="file-input"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
      multiple
      aria-label="Import photos"
      (change)="importPhotos($event)"
    />
    <input
      #cameraInput
      class="file-input"
      type="file"
      accept="image/*"
      capture="environment"
      aria-label="Capture or choose a photo"
      (change)="importPhotos($event)"
    />
    <small class="hint"
      >Camera capture opens your browser’s photo chooser. On unsupported devices, select an existing
      photo.</small
    >
    @if (error) {
      <p role="alert">{{ error }}</p>
    }
    @if (selected; as photo) {
      <div class="card photo-detail">
        @if (urls.get(photo.id); as url) {
          <img [src]="url" [alt]="photo.name" />
        }
        <strong>{{ photo.name }}</strong>
        <small>{{ photo.createdAt | date: 'medium' }} · {{ size(photo.size) }}</small>
        <div class="actions">
          <button (click)="selectedId = ''">Album</button>
          <button (click)="download(photo)">Export</button>
          <button class="danger" (click)="remove(photo)">Delete</button>
        </div>
      </div>
    } @else {
      <div class="photo-grid">
        @for (photo of photos; track photo.id) {
          <button
            class="photo-thumb"
            [attr.aria-label]="'View ' + photo.name"
            (click)="selectedId = photo.id"
          >
            @if (urls.get(photo.id); as url) {
              <img [src]="url" [alt]="photo.name" loading="lazy" />
            } @else {
              <span aria-hidden="true">▧</span>
            }
            <small>{{ photo.name }}</small>
          </button>
        } @empty {
          <p class="empty">Your album is empty. Import a photo or use your camera.</p>
        }
      </div>
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
      .photo-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }
      .photo-thumb {
        min-width: 0;
        padding: 0;
        overflow: hidden;
        border-radius: 12px;
        display: grid;
        gap: 5px;
      }
      .photo-thumb img {
        width: 100%;
        height: 105px;
        object-fit: cover;
      }
      .photo-thumb span {
        height: 105px;
        display: grid;
        place-items: center;
        font-size: 40px;
      }
      .photo-thumb small {
        padding: 0 6px 7px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .photo-detail {
        display: grid;
        gap: 10px;
      }
      .photo-detail img {
        display: block;
        width: 100%;
        max-height: 290px;
        object-fit: contain;
        border-radius: 8px;
      }
      .photo-detail strong {
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class GalleryComponent implements FeatureController, OnDestroy {
  readonly os = inject(OsStateService);
  private readonly storage = inject(OsStorageService);
  @ViewChild('photoInput', { static: true }) private photoInput!: ElementRef<HTMLInputElement>;
  selectedId = '';
  busy = false;
  error = '';
  readonly urls = new Map<string, string>();
  private readonly loading = new Set<string>();
  private destroyed = false;
  readonly size = formatBytes;
  get photos(): MediaItem[] {
    return this.os
      .data()!
      .media.filter((item) => item.kind === 'image')
      .slice()
      .reverse();
  }
  get selected(): MediaItem | undefined {
    return this.photos.find((item) => item.id === this.selectedId);
  }
  get left() {
    return { label: 'Import', run: () => this.photoInput.nativeElement.click() };
  }
  constructor() {
    effect(() => {
      const photos = this.os.data()?.media.filter((item) => item.kind === 'image') || [];
      const ids = new Set(photos.map((item) => item.id));
      this.urls.forEach((url, id) => {
        if (!ids.has(id)) {
          URL.revokeObjectURL(url);
          this.urls.delete(id);
        }
      });
      for (const item of photos) {
        if (this.urls.has(item.id) || this.loading.has(item.id)) continue;
        this.loading.add(item.id);
        void this.storage
          .getBlob(item.id)
          .then((blob) => {
            if (
              !this.destroyed &&
              blob &&
              this.os.data()?.media.some((media) => media.id === item.id)
            )
              this.urls.set(item.id, URL.createObjectURL(blob));
          })
          .catch(() => {
            if (!this.destroyed) this.error = 'A photo could not be loaded from storage.';
          })
          .finally(() => this.loading.delete(item.id));
      }
    });
  }
  key(key: KeypadKey): boolean {
    if ((key === 'back' || key === 'soft-right') && this.selectedId) {
      this.selectedId = '';
      return true;
    }
    return false;
  }
  async importPhotos(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || this.busy) return;
    this.busy = true;
    this.error = '';
    let imported = 0;
    for (const file of files) {
      const problem = validateMedia(file, 'image');
      if (problem) {
        this.error = `${file.name}: ${problem}`;
        continue;
      }
      try {
        const blob = await optimizePhoto(file);
        const meta = mediaMetadata(file, 'image');
        meta.type = blob.type;
        meta.size = blob.size;
        if (blob.type !== file.type && blob.type === 'image/webp')
          meta.name = file.name.replace(/\.[^.]+$/, '') + '.webp';
        await this.os.importMedia(meta, blob);
        imported++;
      } catch (error: unknown) {
        this.error =
          error instanceof Error
            ? error.message
            : 'This photo could not be decoded or saved. Try JPEG or PNG.';
      }
    }
    this.busy = false;
    if (imported) this.os.feedback(`${imported} photo${imported === 1 ? '' : 's'} saved locally.`);
  }
  async download(photo: MediaItem): Promise<void> {
    try {
      const blob = await this.storage.getBlob(photo.id);
      if (!blob) throw new Error('Photo unavailable');
      downloadBlob(blob, photo.name);
    } catch {
      this.os.feedback('This photo is unavailable. Try importing the original again.');
    }
  }
  async remove(photo: MediaItem): Promise<void> {
    if (!(await this.os.confirm(`Delete “${photo.name}” from this device?`))) return;
    try {
      await this.os.deleteMedia(photo.id);
      this.selectedId = '';
    } catch {
      this.os.feedback('This photo could not be deleted. Please retry.');
    }
  }
  prepareReload(): boolean {
    if (this.busy) {
      this.os.feedback('Please wait for the file import to finish before updating.');
      return false;
    }
    return true;
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
  }
}
