import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OsStateService } from './os-state.service';
import { ClockToolsService, CLOCK_MONOTONIC, formatDuration } from './clock-tools.service';
describe('active-session clock tools', () => {
  beforeEach(() => sessionStorage.removeItem('feature-os:active-timer'));
  afterEach(() => sessionStorage.removeItem('feature-os:active-timer'));
  it('fires countdown once, can pause/resume and cancels deadlines', fakeAsync(() => {
    const notify = jasmine.createSpy('notify');
    TestBed.configureTestingModule({
      providers: [
        { provide: OsStateService, useValue: { notify } },
        { provide: CLOCK_MONOTONIC, useValue: () => Date.now() },
      ],
    });
    const clock = TestBed.inject(ClockToolsService);
    expect(clock.startTimer(0)).toBeFalse();
    expect(clock.startTimer(86401)).toBeFalse();
    expect(clock.startTimer(2)).toBeTrue();
    tick(500);
    clock.pauseTimer();
    const remaining = clock.timerRemaining;
    tick(1000);
    expect(clock.timerRemaining).toBe(remaining);
    expect(notify).not.toHaveBeenCalled();
    clock.resumeTimer();
    tick(1600);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(clock.timerFinished()).toBeTrue();
    tick(2000);
    expect(notify).toHaveBeenCalledTimes(1);
    clock.startTimer(5);
    clock.cancelTimer();
    tick(6000);
    expect(notify).toHaveBeenCalledTimes(1);
    clock.ngOnDestroy();
  }));
  it('uses monotonic elapsed time during a wall-clock jump', fakeAsync(() => {
    let monotonic = 0;
    const notify = jasmine.createSpy('notify');
    TestBed.configureTestingModule({
      providers: [
        { provide: OsStateService, useValue: { notify } },
        { provide: CLOCK_MONOTONIC, useValue: () => monotonic },
      ],
    });
    const clock = TestBed.inject(ClockToolsService);
    clock.startTimer(2);
    tick(10000);
    expect(notify).not.toHaveBeenCalled();
    monotonic = 2000;
    tick(100);
    expect(notify).toHaveBeenCalledTimes(1);
    clock.ngOnDestroy();
  }));
  it('formats long durations and clamps negative values', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(-1)).toBe('00:00');
    expect(formatDuration(3661250, true)).toBe('01:01:01.25');
  });
});
