import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStateService } from '../../core/os-state.service';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { KeypadKey, NoteDraft, NoteItem } from '../../core/os-models';
import { downloadText } from './download';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'os-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="stack">
    @if (editor) {
      <p class="hint">Draft saved on this device as you type.</p>
      <label class="field"
        >Title<input
          aria-label="Note title"
          maxlength="120"
          [ngModel]="editor.title"
          (ngModelChange)="change('title', $event)"
      /></label>
      <label class="field"
        >Note<textarea
          aria-label="Note body"
          rows="7"
          maxlength="100000"
          [ngModel]="editor.body"
          (ngModelChange)="change('body', $event)"
        ></textarea>
      </label>
      <div class="actions">
        <button type="button" (click)="save()">Save note</button
        ><button type="button" (click)="exportDraft()">Export text</button
        ><button type="button" (click)="close()">Close</button>
      </div>
      <button type="button" class="danger" (click)="discard()">Discard draft</button>
    } @else {
      <div class="actions">
        <button type="button" (click)="create()">New note</button
        ><button type="button" (click)="exportAll()" [disabled]="!os.data()!.notes.length">
          Export all
        </button>
      </div>
      @if (os.data()!.noteDraft) {
        <button class="card" type="button" (click)="recover()">
          Recover draft · {{ os.data()!.noteDraft!.title || 'Untitled' }}
        </button>
      }
      <label class="field"
        >Search<input aria-label="Search notes" type="search" [(ngModel)]="query"
      /></label>
      <label class="field"
        >Sort<select [(ngModel)]="sort">
          <option value="updated">Last edited</option>
          <option value="title">Title A–Z</option>
        </select></label
      >
      @for (note of notes; track note.id) {
        <article class="card stack">
          <button class="row" type="button" (click)="edit(note)">
            <strong>{{ note.title }}</strong
            ><small>{{ note.updatedAt | date: 'mediumDate' }}</small>
          </button>
          <p class="note-preview">{{ note.body || 'Empty note' }}</p>
          <button type="button" class="danger" (click)="remove(note)">
            Delete {{ note.title }}
          </button>
        </article>
      } @empty {
        <p class="empty">
          {{
            query
              ? 'No matching notes.'
              : 'A little space for your thoughts. Create your first note.'
          }}
        </p>
      }
    }
  </div>`,
  styles: [
    `
      .note-preview {
        margin: 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        opacity: 0.7;
      }
    `,
  ],
})
export class NotesComponent implements FeatureController {
  readonly os = inject(OsStateService);
  editor?: NoteDraft;
  query = '';
  sort = 'updated';
  get left(): SoftAction {
    return {
      label: this.editor ? 'Save' : 'New',
      run: () => (this.editor ? this.save() : this.create()),
    };
  }
  get right(): SoftAction | undefined {
    return this.editor ? { label: 'Close', run: () => this.close() } : undefined;
  }
  get notes(): NoteItem[] {
    const query = this.query.trim().toLocaleLowerCase();
    return this.os
      .data()!
      .notes.filter((note) => `${note.title} ${note.body}`.toLocaleLowerCase().includes(query))
      .slice()
      .sort((a, b) =>
        this.sort === 'title'
          ? a.title.localeCompare(b.title)
          : b.updatedAt.localeCompare(a.updatedAt),
      );
  }
  async create(): Promise<void> {
    if (this.os.data()!.noteDraft) {
      if (!(await this.os.confirm('Replace the recovered draft with a new note?'))) return;
    }
    this.editor = { id: crypto.randomUUID(), title: '', body: '' };
    this.persistDraft();
  }
  async edit(note: NoteItem): Promise<void> {
    const previous = this.os.data()!.noteDraft;
    if (
      previous &&
      previous.id !== note.id &&
      !(await this.os.confirm('Replace the recovered draft with this note?'))
    )
      return;
    this.editor =
      previous?.id === note.id
        ? { ...previous }
        : { id: note.id, title: note.title, body: note.body };
    this.persistDraft();
  }
  recover(): void {
    const draft = this.os.data()!.noteDraft;
    if (draft) this.editor = { ...draft };
  }
  change(field: 'title' | 'body', value: string): void {
    if (this.editor) {
      this.editor[field] = value;
      this.persistDraft();
    }
  }
  private persistDraft(): void {
    if (this.editor) {
      const draft = { ...this.editor };
      this.os.update((data) => {
        data.noteDraft = draft;
      });
    }
  }
  save(): void {
    if (!this.editor) return;
    const note: NoteItem = {
      ...this.editor,
      title: this.editor.title.trim() || 'Untitled note',
      updatedAt: new Date().toISOString(),
    };
    this.os.update((data) => {
      const index = data.notes.findIndex((item) => item.id === note.id);
      if (index < 0) data.notes.unshift(note);
      else data.notes[index] = note;
      delete data.noteDraft;
    });
    this.editor = undefined;
    this.os.feedback('Note saved locally.');
  }
  close(): void {
    this.persistDraft();
    this.editor = undefined;
  }
  async discard(): Promise<void> {
    if (await this.os.confirm('Discard this unsaved draft?')) {
      this.os.update((data) => {
        delete data.noteDraft;
      });
      this.editor = undefined;
    }
  }
  async remove(note: NoteItem): Promise<void> {
    if (await this.os.confirm(`Delete “${note.title}”?`)) {
      this.os.update((data) => {
        data.notes = data.notes.filter((item) => item.id !== note.id);
        if (data.noteDraft?.id === note.id) delete data.noteDraft;
      });
      this.os.feedback('Note deleted.');
    }
  }
  exportDraft(): void {
    if (this.editor)
      downloadText('feature-os-note.txt', `${this.editor.title}\n\n${this.editor.body}`);
  }
  exportAll(): void {
    downloadText(
      'feature-os-notes.txt',
      this.notes
        .map((note) => `${note.title}\n${note.updatedAt}\n\n${note.body}`)
        .join('\n\n────────\n\n'),
    );
  }
  key(key: KeypadKey): boolean {
    if (key === 'back' && this.editor) {
      this.close();
      return true;
    }
    return false;
  }
}
