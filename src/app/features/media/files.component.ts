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
import { KeypadKey, MediaItem } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsStorageService } from '../../core/os-storage.service';
import {
  downloadBlob,
  formatBytes,
  isTextPreview,
  mediaMetadata,
  validateMedia,
} from './media-utils';

@Component({
  selector: 'os-files',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule],
  template: ` <div class="stack">
    <p class="hint">
      Only files imported into Feature OS appear here. This app cannot browse the rest of your
      device.
    </p>
    <div class="card">
      <strong>{{ size(totalSize) }} in {{ items.length }} imported files</strong
      ><small>{{ storageInfo }}</small
      ><button (click)="refreshUsage()">Check device storage</button>
    </div>
    <input
      #fileInput
      class="file-input"
      type="file"
      multiple
      aria-label="Import files"
      (change)="importFiles($event)"
    />
    <button [disabled]="busy" (click)="fileInput.click()">
      {{ busy ? 'Saving…' : '+ Import files' }}
    </button>
    @if (error) {
      <p role="alert">{{ error }}</p>
    }
    @if (selected; as item) {
      <div class="card preview">
        <strong>{{ item.name }}</strong
        ><small
          >{{ item.type }} · {{ size(item.size) }} · {{ item.createdAt | date: 'short' }}</small
        >
        @if (loading) {
          <p role="status">Loading preview…</p>
        } @else if (previewUrl && previewKind === 'image') {
          <img [src]="previewUrl" [alt]="item.name" />
        } @else if (previewUrl && previewKind === 'audio') {
          <audio [src]="previewUrl" controls preload="metadata"></audio>
        } @else if (previewKind === 'text') {
          <pre>{{ previewText }}</pre>
        } @else {
          <p class="hint">No preview for this format. Export it to open in a compatible app.</p>
        }
        <div class="actions">
          <button (click)="close()">Files</button><button (click)="download(item)">Export</button
          ><button class="danger" (click)="remove(item)">Delete</button>
        </div>
      </div>
    } @else {
      <label class="field"
        >Search files<input
          aria-label="Search files"
          [(ngModel)]="query"
          placeholder="Name or file type"
      /></label>
      @for (item of filtered; track item.id) {
        <button class="row file-row" (click)="open(item)">
          <span
            >{{ item.kind === 'audio' ? '♫' : item.kind === 'image' ? '▧' : '▱' }}
            {{ item.name }}</span
          ><small>{{ size(item.size) }} · {{ item.type }}</small>
        </button>
      } @empty {
        <p class="empty">
          {{
            query
              ? 'No files match your search.'
              : 'No imported files yet. Music and Gallery imports also appear here.'
          }}
        </p>
      }
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
      .card {
        display: grid;
        gap: 8px;
      }
      .file-row {
        display: grid;
        text-align: left;
        gap: 5px;
      }
      .file-row span,
      .file-row small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .preview strong {
        overflow-wrap: anywhere;
      }
      .preview img {
        width: 100%;
        max-height: 250px;
        object-fit: contain;
      }
      .preview audio {
        max-width: 100%;
        width: 100%;
      }
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        max-height: 220px;
        overflow: auto;
        font-size: 12px;
        padding: 8px;
        border: 1px solid currentColor;
        border-radius: 6px;
      }
      small {
        opacity: 0.7;
      }
    `,
  ],
})
export class FilesComponent implements FeatureController, OnDestroy {
  readonly os = inject(OsStateService);
  private readonly storage = inject(OsStorageService);
  @ViewChild('fileInput', { static: true }) private fileInput!: ElementRef<HTMLInputElement>;
  query = '';
  selected?: MediaItem;
  busy = false;
  loading = false;
  error = '';
  previewUrl?: string;
  previewText = '';
  previewKind = '';
  storageInfo = 'Storage estimates are available on supported browsers.';
  readonly size = formatBytes;
  private request = 0;
  private destroyed = false;
  get items(): MediaItem[] {
    return this.os.data()!.media;
  }
  get totalSize(): number {
    return this.items.reduce((sum, item) => sum + item.size, 0);
  }
  get filtered(): MediaItem[] {
    const query = this.query.trim().toLowerCase();
    return this.items
      .filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(query))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  get left() {
    return { label: 'Import', run: () => this.fileInput.nativeElement.click() };
  }
  key(key: KeypadKey): boolean {
    if ((key === 'back' || key === 'soft-right') && this.selected) {
      this.close();
      return true;
    }
    return false;
  }
  async refreshUsage(): Promise<void> {
    if (!navigator.storage?.estimate) {
      this.storageInfo = 'This browser does not expose storage estimates.';
      return;
    }
    try {
      const { usage, quota } = await navigator.storage.estimate();
      this.storageInfo = `This origin: ${formatBytes(usage || 0)} used${quota ? ` of about ${formatBytes(quota)}` : ''}. Browser estimates include the offline app.`;
    } catch {
      this.storageInfo = 'Storage estimate unavailable.';
    }
  }
  async importFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (this.busy || !files.length) return;
    this.busy = true;
    this.error = '';
    let imported = 0;
    for (const file of files) {
      const kind = file.type.startsWith('audio/')
        ? 'audio'
        : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)
          ? 'image'
          : 'file';
      const problem = validateMedia(file, kind);
      if (problem) {
        this.error = `${file.name}: ${problem}`;
        continue;
      }
      try {
        const meta = mediaMetadata(file, kind);
        await this.os.importMedia(meta, file);
        if (kind === 'audio')
          this.os.update((data) =>
            data.tracks.push({
              id: meta.id,
              mediaId: meta.id,
              name: file.name.replace(/\.[^.]+$/, ''),
              artist: 'Local audio',
            }),
          );
        imported++;
      } catch (error: unknown) {
        this.error =
          error instanceof Error
            ? error.message
            : 'Files could not be saved. Check available storage.';
        break;
      }
    }
    this.busy = false;
    if (imported) this.os.feedback(`${imported} file${imported === 1 ? '' : 's'} saved locally.`);
  }
  async open(item: MediaItem): Promise<void> {
    this.close();
    const request = ++this.request;
    this.selected = item;
    this.loading = true;
    try {
      const blob = await this.storage.getBlob(item.id);
      if (request !== this.request || this.destroyed) return;
      if (!blob) throw new Error('The stored file is unavailable. Import the original again.');
      if (
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(item.type)
      ) {
        this.previewKind = 'image';
        this.previewUrl = URL.createObjectURL(blob);
      } else if (item.kind === 'audio') {
        this.previewKind = 'audio';
        this.previewUrl = URL.createObjectURL(blob);
      } else if (isTextPreview(item.type, item.name)) {
        const text = await blob.slice(0, 100_000).text();
        if (request !== this.request || this.destroyed) return;
        this.previewKind = 'text';
        this.previewText =
          text +
          (blob.size > 100_000
            ? '\n… Preview limited to the first 100 KB. Export to read the full file.'
            : '');
      }
    } catch (error: unknown) {
      this.error = error instanceof Error ? error.message : 'This file could not be opened.';
    } finally {
      if (request === this.request) this.loading = false;
    }
  }
  close(): void {
    ++this.request;
    this.selected = undefined;
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = undefined;
    this.previewKind = this.previewText = '';
    this.loading = false;
  }
  async download(item: MediaItem): Promise<void> {
    try {
      const blob = await this.storage.getBlob(item.id);
      if (!blob) throw new Error();
      downloadBlob(blob, item.name);
    } catch {
      this.os.feedback('The file could not be exported.');
    }
  }
  async remove(item: MediaItem): Promise<void> {
    if (
      !(await this.os.confirm(
        `Delete “${item.name}”${item.kind === 'audio' ? ' and its Music queue entry' : ''}?`,
      ))
    )
      return;
    try {
      await this.os.deleteMedia(item.id);
      this.close();
    } catch {
      this.os.feedback('The file could not be deleted. Please retry.');
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
    this.close();
  }
}
