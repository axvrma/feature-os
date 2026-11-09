import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStateService } from '../../core/os-state.service';
import { CalendarEvent, KeypadKey } from '../../core/os-models';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { eventTimestamp, localDateKey, monthCells } from '../../core/time-utils';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'os-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="stack">
    @if (editor) {
      <label class="field"
        >Event title<input aria-label="Event title" maxlength="100" [(ngModel)]="editor.title"
      /></label>
      <label class="field"
        >Date<input
          type="date"
          min="1900-01-01"
          max="9999-12-31"
          aria-label="Event date"
          [(ngModel)]="editor.date"
      /></label>
      <label class="field"
        >Time<input type="time" aria-label="Event time" [(ngModel)]="editor.time"
      /></label>
      <label class="field"
        >Details<textarea rows="3" maxlength="4000" [(ngModel)]="editor.details"></textarea>
      </label>
      <label class="row"
        ><input type="checkbox" [(ngModel)]="editor.reminder" /> Remind while Feature OS is
        running</label
      >
      <p class="hint">Local time in {{ zone }}. Reminders cannot wake a closed browser.</p>
      <div class="actions">
        <button type="button" (click)="save()">Save event</button
        ><button type="button" (click)="editor = undefined">Cancel</button>
      </div>
      @if (existing) {
        <button type="button" class="danger" (click)="remove(editor)">Delete event</button>
      }
    } @else {
      <div class="actions month-controls">
        <button aria-label="Previous month" type="button" (click)="moveMonth(-1)">‹</button
        ><strong>{{ monthTitle }}</strong
        ><button aria-label="Next month" type="button" (click)="moveMonth(1)">›</button>
      </div>
      <div class="calendar-grid" role="group" aria-label="Month dates">
        @for (day of weekdays; track $index) {
          <small aria-hidden="true">{{ day }}</small>
        }
        @for (cell of cells; track cell.date) {
          <button
            type="button"
            [class.other-month]="!cell.inMonth"
            [class.selected]="cell.date === selectedDate"
            [class.today]="cell.date === today"
            [attr.aria-label]="cell.date + (count(cell.date) ? ', has events' : '')"
            [attr.aria-pressed]="cell.date === selectedDate"
            (click)="selectDate(cell.date)"
          >
            {{ cell.day }}<span class="event-dot" [class.has-event]="count(cell.date) > 0"></span>
          </button>
        }
      </div>
      <div class="actions">
        <button type="button" (click)="goToday()">Today</button
        ><button type="button" (click)="create()">Add event</button>
      </div>
      <strong>{{ selectedDate | date: 'fullDate' }}</strong>
      @for (event of selectedEvents; track event.id) {
        <button class="card row" type="button" (click)="edit(event)">
          <span
            ><strong>{{ event.time }} · {{ event.title }}</strong
            ><small
              >{{ event.details || 'View or edit event' }}
              {{ event.reminder ? '· reminder' : '' }}</small
            ></span
          >
        </button>
      } @empty {
        <p class="empty">No events on this date.</p>
      }
      <h3>Coming up</h3>
      @for (event of upcoming; track event.id) {
        <button class="row" type="button" (click)="edit(event)">
          <span
            >{{ event.title }}<small>{{ event.date }} · {{ event.time }}</small></span
          >
        </button>
      } @empty {
        <p class="hint">Your next events will appear here.</p>
      }
    }
  </div>`,
  styles: [
    `
      .month-controls {
        justify-content: space-between;
      }
      .month-controls strong {
        font-size: 16px;
      }
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 3px;
      }
      .calendar-grid > small {
        text-align: center;
        opacity: 0.6;
        padding: 5px 0;
      }
      .calendar-grid button {
        position: relative;
        min-width: 0;
        min-height: 34px;
        padding: 5px 0;
        font-size: 12px;
        border-radius: 7px;
      }
      .calendar-grid .other-month {
        opacity: 0.4;
      }
      .calendar-grid .today {
        box-shadow: inset 0 0 0 1px var(--accent);
      }
      .event-dot {
        display: block;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        margin: 2px auto 0;
      }
      .has-event {
        background: currentColor;
      }
      h3 {
        font-size: 13px;
        margin: 8px 0 0;
      }
    `,
  ],
})
export class CalendarComponent implements FeatureController {
  readonly os = inject(OsStateService);
  readonly weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  readonly zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  selectedDate = localDateKey(new Date());
  year = new Date().getFullYear();
  month = new Date().getMonth();
  editor?: CalendarEvent;
  get today(): string {
    return localDateKey(this.os.now());
  }
  get cells() {
    return monthCells(this.year, this.month);
  }
  get monthTitle(): string {
    return new Date(this.year, this.month, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }
  get existing(): boolean {
    return (
      Boolean(this.editor) && this.os.data()!.events.some((event) => event.id === this.editor!.id)
    );
  }
  get selectedEvents(): CalendarEvent[] {
    return this.os
      .data()!
      .events.filter((event) => event.date === this.selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }
  get upcoming(): CalendarEvent[] {
    const now = this.os.now().getTime();
    return this.os
      .data()!
      .events.filter((event) => eventTimestamp(event) >= now)
      .slice()
      .sort((a, b) => eventTimestamp(a) - eventTimestamp(b))
      .slice(0, 8);
  }
  get left(): SoftAction {
    return {
      label: this.editor ? 'Save' : 'New',
      run: () => (this.editor ? this.save() : this.create()),
    };
  }
  get right(): SoftAction | undefined {
    return this.editor
      ? {
          label: 'Cancel',
          run: () => {
            this.editor = undefined;
          },
        }
      : undefined;
  }
  count(date: string): number {
    return this.os.data()!.events.filter((event) => event.date === date).length;
  }
  moveMonth(delta: number): void {
    const next = new Date(this.year, this.month + delta, 1);
    if (next.getFullYear() < 1900 || next.getFullYear() > 9999) return;
    this.year = next.getFullYear();
    this.month = next.getMonth();
  }
  selectDate(date: string): void {
    this.selectedDate = date;
    const parts = date.split('-').map(Number);
    this.year = parts[0];
    this.month = parts[1] - 1;
  }
  goToday(): void {
    this.selectDate(this.today);
  }
  create(): void {
    this.editor = {
      id: crypto.randomUUID(),
      title: '',
      date: this.selectedDate,
      time: '09:00',
      details: '',
      reminder: false,
    };
  }
  edit(event: CalendarEvent): void {
    this.editor = { ...event };
  }
  save(): void {
    if (!this.editor) return;
    if (!this.editor.title.trim()) {
      this.os.feedback('Give your event a title.');
      return;
    }
    if (!Number.isFinite(eventTimestamp(this.editor))) {
      this.os.feedback('Choose a valid local date and time.');
      return;
    }
    const event = { ...this.editor, title: this.editor.title.trim() };
    delete event.remindedAt;
    this.os.update((data) => {
      const index = data.events.findIndex((item) => item.id === event.id);
      if (index < 0) data.events.push(event);
      else data.events[index] = event;
    });
    this.selectDate(event.date);
    this.editor = undefined;
    this.os.feedback('Event saved locally.');
  }
  async remove(event: CalendarEvent): Promise<void> {
    if (await this.os.confirm(`Delete “${event.title}”?`)) {
      this.os.update((data) => {
        data.events = data.events.filter((item) => item.id !== event.id);
      });
      this.editor = undefined;
      this.os.feedback('Event deleted.');
    }
  }
  prepareReload(): boolean {
    if (!this.editor) return true;
    this.save();
    if (this.editor) {
      this.os.feedback('Fix and save the current editor before updating.');
      return false;
    }
    return true;
  }
  key(key: KeypadKey): boolean {
    if (key === 'back' && this.editor) {
      this.editor = undefined;
      return true;
    }
    return false;
  }
}
