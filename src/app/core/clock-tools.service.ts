import { Injectable, InjectionToken, OnDestroy, NgZone, inject, signal } from '@angular/core';
import { OsStateService } from './os-state.service';
const TIMER_KEY = 'feature-os:active-timer';
export const CLOCK_MONOTONIC = new InjectionToken<() => number>('CLOCK_MONOTONIC', {
  providedIn: 'root',
  factory: () => () => performance.now(),
});
export function formatDuration(milliseconds: number, centiseconds = false): string {
  const safe = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  const base = `${hours ? String(hours).padStart(2, '0') + ':' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return centiseconds ? `${base}.${String(Math.floor((safe % 1000) / 10)).padStart(2, '0')}` : base;
}
/** Session clock tools survive app navigation. Deadlines are checked again after tab suspension. */
@Injectable({ providedIn: 'root' })
export class ClockToolsService implements OnDestroy {
  private readonly os = inject(OsStateService);
  private readonly monotonic = inject(CLOCK_MONOTONIC);
  readonly time = signal(Date.now());
  readonly deadline = signal<number | null>(null);
  readonly pausedRemaining = signal(0);
  readonly timerFinished = signal(false);
  readonly stopwatchRunning = signal(false);
  readonly laps = signal<number[]>([]);
  private timerMonotonicDeadline: number | null = null;
  private stopwatchStarted = 0;
  private stopwatchStored = 0;
  private readonly interval: number;
  constructor() {
    try {
      const raw = sessionStorage.getItem(TIMER_KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (
          saved &&
          typeof saved === 'object' &&
          'deadline' in saved &&
          typeof saved.deadline === 'number' &&
          Number.isFinite(saved.deadline) &&
          Math.abs(saved.deadline - Date.now()) < 86400000
        ) {
          this.deadline.set(saved.deadline);
          this.timerMonotonicDeadline = this.monotonic() + Math.max(0, saved.deadline - Date.now());
        }
      }
    } catch {
      /* timer remains available without session storage */
    }
    this.interval = inject(NgZone).runOutsideAngular(() =>
      window.setInterval(() => this.tick(), 100),
    );
  }
  get timerRemaining(): number {
    this.time();
    return this.deadline() !== null
      ? Math.max(0, (this.timerMonotonicDeadline ?? this.monotonic()) - this.monotonic())
      : this.pausedRemaining();
  }
  get stopwatchElapsed(): number {
    this.time();
    return (
      this.stopwatchStored +
      (this.stopwatchRunning() ? this.monotonic() - this.stopwatchStarted : 0)
    );
  }
  startTimer(seconds: number): boolean {
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400) return false;
    this.time.set(Date.now());
    this.deadline.set(Date.now() + Math.round(seconds * 1000));
    this.timerMonotonicDeadline = this.monotonic() + Math.round(seconds * 1000);
    this.pausedRemaining.set(0);
    this.timerFinished.set(false);
    this.persist();
    return true;
  }
  pauseTimer(): void {
    if (this.deadline()) {
      this.pausedRemaining.set(this.timerRemaining);
      this.deadline.set(null);
      this.timerMonotonicDeadline = null;
      this.persist();
    }
  }
  resumeTimer(): void {
    if (this.pausedRemaining() > 0) {
      this.deadline.set(Date.now() + this.pausedRemaining());
      this.timerMonotonicDeadline = this.monotonic() + this.pausedRemaining();
      this.pausedRemaining.set(0);
      this.persist();
    }
  }
  cancelTimer(): void {
    this.deadline.set(null);
    this.timerMonotonicDeadline = null;
    this.pausedRemaining.set(0);
    this.timerFinished.set(false);
    this.persist();
  }
  toggleStopwatch(): void {
    if (this.stopwatchRunning()) {
      this.stopwatchStored = this.stopwatchElapsed;
      this.stopwatchRunning.set(false);
    } else {
      this.stopwatchStarted = this.monotonic();
      this.stopwatchRunning.set(true);
    }
  }
  lap(): void {
    if (this.stopwatchRunning())
      this.laps.update((laps) => [this.stopwatchElapsed, ...laps].slice(0, 100));
  }
  resetStopwatch(): void {
    this.stopwatchStored = 0;
    this.stopwatchStarted = this.monotonic();
    this.stopwatchRunning.set(false);
    this.laps.set([]);
  }
  private tick(): void {
    this.time.set(Date.now());
    const deadline = this.deadline();
    if (deadline !== null && this.timerRemaining <= 0) {
      this.deadline.set(null);
      this.timerMonotonicDeadline = null;
      this.timerFinished.set(true);
      this.pausedRemaining.set(0);
      this.persist();
      this.os.notify('Timer complete', 'Your countdown has finished.');
    }
  }
  private persist(): void {
    try {
      if (this.deadline())
        sessionStorage.setItem(TIMER_KEY, JSON.stringify({ deadline: this.deadline() }));
      else sessionStorage.removeItem(TIMER_KEY);
    } catch {
      /* visual timer remains available */
    }
  }
  ngOnDestroy(): void {
    window.clearInterval(this.interval);
  }
}
