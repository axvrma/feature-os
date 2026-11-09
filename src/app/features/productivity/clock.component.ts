import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStateService } from '../../core/os-state.service';
import { AlarmItem, KeypadKey } from '../../core/os-models';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { ClockToolsService, formatDuration } from '../../core/clock-tools.service';
import { validTime } from '../../core/time-utils';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'os-clock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<div class="stack">
    <div class="local-clock">
      <strong>{{ os.now() | date: 'HH:mm:ss' }}</strong
      ><small>{{ os.now() | date: 'fullDate' }}</small>
    </div>
    <div class="actions clock-tabs" role="group" aria-label="Clock tools">
      <button
        type="button"
        [attr.aria-pressed]="tab === 'alarms'"
        (click)="tab = 'alarms'; editor = undefined"
      >
        Alarms</button
      ><button
        type="button"
        [attr.aria-pressed]="tab === 'timer'"
        (click)="tab = 'timer'; editor = undefined"
      >
        Timer</button
      ><button
        type="button"
        [attr.aria-pressed]="tab === 'stopwatch'"
        (click)="tab = 'stopwatch'; editor = undefined"
      >
        Stopwatch
      </button>
    </div>
    @if (tab === 'alarms') {
      @if (editor) {
        <label class="field"
          >Time<input type="time" aria-label="Alarm time" [(ngModel)]="editor.time"
        /></label>
        <label class="field"
          >Label<input maxlength="80" aria-label="Alarm label" [(ngModel)]="editor.label"
        /></label>
        <fieldset>
          <legend>Repeat · none means once</legend>
          <div class="repeat-days">
            @for (day of days; track day.id) {
              <label [class.selected]="editor.repeat?.includes(day.id)"
                ><input
                  type="checkbox"
                  [checked]="editor.repeat?.includes(day.id)"
                  (change)="toggleDay(day.id)"
                />{{ day.label }}</label
              >
            }
          </div>
        </fieldset>
        <label class="row"><input type="checkbox" [(ngModel)]="editor.enabled" /> Enabled</label>
        <div class="actions">
          <button type="button" (click)="save()">Save alarm</button
          ><button type="button" (click)="editor = undefined">Cancel</button>
        </div>
      } @else {
        <button type="button" (click)="create()">New alarm</button>
        @for (alarm of os.data()!.alarms; track alarm.id) {
          <article class="card stack">
            <div class="actions">
              <button type="button" class="alarm-detail" (click)="edit(alarm)">
                <strong>{{ alarm.time }}</strong
                ><span>{{ alarm.label }}</span
                ><small>{{ repeatLabel(alarm) }}</small></button
              ><label class="field"
                ><span>On</span
                ><input
                  type="checkbox"
                  [attr.aria-label]="'Enable ' + alarm.label"
                  [checked]="alarm.enabled"
                  (change)="toggle(alarm.id)"
              /></label>
            </div>
            <button type="button" class="danger" (click)="remove(alarm)">
              Delete {{ alarm.label }}
            </button>
          </article>
        } @empty {
          <p class="empty">No alarms. Add a reminder for your day.</p>
        }
      }
      <button type="button" (click)="os.requestNotifications()">
        Enable browser notifications
      </button>
    } @else if (tab === 'timer') {
      <output class="tool-display" aria-live="off">{{ duration(tools.timerRemaining) }}</output>
      @if (tools.timerFinished()) {
        <p role="status" class="card">Time is up.</p>
      }
      <label class="field"
        >Minutes<input
          type="number"
          aria-label="Timer minutes"
          min="0"
          max="1440"
          step="1"
          [(ngModel)]="timerMinutes"
      /></label>
      <label class="field"
        >Seconds<input
          type="number"
          aria-label="Timer seconds"
          min="0"
          max="59"
          step="1"
          [(ngModel)]="timerSeconds"
      /></label>
      <div class="actions">
        @if (tools.deadline()) {
          <button type="button" (click)="tools.pauseTimer()">Pause</button>
        } @else if (tools.pausedRemaining()) {
          <button type="button" (click)="tools.resumeTimer()">Resume</button>
        } @else {
          <button type="button" (click)="startTimer()">Start timer</button>
        }
        <button type="button" (click)="tools.cancelTimer()">Reset</button>
      </div>
    } @else {
      <output class="tool-display">{{ duration(tools.stopwatchElapsed, true) }}</output>
      <div class="actions">
        <button type="button" (click)="tools.toggleStopwatch()">
          {{ tools.stopwatchRunning() ? 'Pause' : 'Start' }}</button
        ><button type="button" (click)="tools.lap()" [disabled]="!tools.stopwatchRunning()">
          Lap</button
        ><button type="button" (click)="tools.resetStopwatch()">Reset</button>
      </div>
      @for (lap of tools.laps(); track $index) {
        <div class="row">
          <span>Lap {{ tools.laps().length - $index }}</span
          ><strong>{{ duration(lap, true) }}</strong>
        </div>
      }
    }
    <p class="hint">
      Alerts work while this browser can run. Closing the browser or suspending the device can
      prevent alarms and notifications. Time zone: {{ zone }}.
    </p>
  </div>`,
  styles: [
    `
      .local-clock {
        text-align: center;
        padding: 5px;
      }
      .local-clock strong {
        display: block;
        font-size: 32px;
        letter-spacing: -1px;
        font-variant-numeric: tabular-nums;
      }
      .local-clock small {
        display: block;
        opacity: 0.7;
        font-size: 11px;
      }
      .clock-tabs {
        gap: 3px;
      }
      .clock-tabs button {
        flex: 1;
        min-width: 0;
        padding: 8px 5px;
        font-size: 11px;
      }
      .alarm-detail {
        display: grid;
        gap: 3px;
        text-align: left;
        flex: 1;
      }
      .alarm-detail strong {
        font-size: 24px;
      }
      .alarm-detail small {
        opacity: 0.65;
      }
      .tool-display {
        text-align: center;
        padding: 24px 4px;
        font-size: 34px;
        font-variant-numeric: tabular-nums;
        letter-spacing: -1px;
      }
      .repeat-days {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .repeat-days label {
        font-size: 11px;
        padding: 6px 3px;
        border-radius: 6px;
        border: 1px solid var(--line);
      }
      fieldset {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 9px;
      }
      legend {
        font-size: 11px;
        padding: 0 4px;
      }
    `,
  ],
})
export class ClockComponent implements FeatureController {
  readonly os = inject(OsStateService);
  readonly tools = inject(ClockToolsService);
  readonly days = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
  ];
  readonly zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  tab: 'alarms' | 'timer' | 'stopwatch' = 'alarms';
  editor?: AlarmItem;
  timerMinutes = 5;
  timerSeconds = 0;
  duration = formatDuration;
  get left(): SoftAction {
    if (this.tab === 'alarms')
      return {
        label: this.editor ? 'Save' : 'New',
        run: () => (this.editor ? this.save() : this.create()),
      };
    if (this.tab === 'stopwatch')
      return {
        label: this.tools.stopwatchRunning() ? 'Pause' : 'Start',
        run: () => this.tools.toggleStopwatch(),
      };
    return {
      label: this.tools.deadline() ? 'Pause' : this.tools.pausedRemaining() ? 'Resume' : 'Start',
      run: () =>
        this.tools.deadline()
          ? this.tools.pauseTimer()
          : this.tools.pausedRemaining()
            ? this.tools.resumeTimer()
            : this.startTimer(),
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
  create(): void {
    this.editor = {
      id: crypto.randomUUID(),
      label: 'Alarm',
      time: '07:30',
      enabled: true,
      repeat: [],
    };
  }
  edit(alarm: AlarmItem): void {
    this.editor = { ...alarm, repeat: [...(alarm.repeat || [])] };
  }
  toggleDay(day: number): void {
    if (!this.editor) return;
    const repeat = this.editor.repeat || [];
    this.editor.repeat = repeat.includes(day)
      ? repeat.filter((item) => item !== day)
      : [...repeat, day];
  }
  repeatLabel(alarm: AlarmItem): string {
    return alarm.snoozeUntil
      ? 'Snoozed · ' +
          new Date(alarm.snoozeUntil).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })
      : alarm.repeat?.length
        ? this.days
            .filter((day) => alarm.repeat!.includes(day.id))
            .map((day) => day.label)
            .join(', ')
        : 'Once';
  }
  save(): void {
    if (!this.editor) return;
    if (!validTime(this.editor.time)) {
      this.os.feedback('Choose a valid alarm time.');
      return;
    }
    const alarm = { ...this.editor, label: this.editor.label.trim() || 'Alarm' };
    delete alarm.lastTriggered;
    delete alarm.snoozeUntil;
    this.os.update((data) => {
      const index = data.alarms.findIndex((item) => item.id === alarm.id);
      if (index < 0) data.alarms.push(alarm);
      else data.alarms[index] = alarm;
    });
    this.editor = undefined;
    this.os.feedback('Alarm saved. Keep the browser open for alerts.');
  }
  toggle(id: string): void {
    this.os.update((data) => {
      const alarm = data.alarms.find((item) => item.id === id);
      if (alarm) {
        alarm.enabled = !alarm.enabled;
        delete alarm.snoozeUntil;
      }
    });
  }
  async remove(alarm: AlarmItem): Promise<void> {
    if (await this.os.confirm(`Delete “${alarm.label}” alarm?`)) {
      this.os.update((data) => {
        data.alarms = data.alarms.filter((item) => item.id !== alarm.id);
      });
    }
  }
  startTimer(): void {
    if (
      !Number.isInteger(this.timerMinutes) ||
      !Number.isInteger(this.timerSeconds) ||
      this.timerMinutes < 0 ||
      this.timerSeconds < 0 ||
      this.timerSeconds > 59 ||
      !this.tools.startTimer(this.timerMinutes * 60 + this.timerSeconds)
    )
      this.os.feedback('Choose a countdown between 1 second and 24 hours.');
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
