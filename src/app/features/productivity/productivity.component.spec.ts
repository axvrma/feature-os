import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OsStateService } from '../../core/os-state.service';
import { seedData } from '../../core/data';
import { OsData } from '../../core/os-models';
import { NotesComponent } from './notes.component';
import { CalendarComponent } from './calendar.component';
import { ClockComponent } from './clock.component';
import { ClockToolsService } from '../../core/clock-tools.service';
import { CalculatorComponent } from './calculator.component';

describe('productivity data operations', () => {
  function setup() {
    const data = signal<OsData | null>(seedData());
    const os = {
      data,
      now: signal(new Date(2026, 10, 9, 8)),
      feedback: jasmine.createSpy('feedback'),
      confirm: jasmine.createSpy('confirm').and.resolveTo(true),
      update: (change: (state: OsData) => void) => {
        const next = structuredClone(data()!);
        change(next);
        data.set(next);
      },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: OsStateService, useValue: os },
        { provide: ClockToolsService, useValue: {} },
      ],
    });
    return os;
  }
  it('recovers a draft after editor destruction, saves an existing note and confirms deletion', async () => {
    const os = setup();
    const first = TestBed.runInInjectionContext(() => new NotesComponent());
    await first.create();
    first.change('title', 'A recovered thought');
    first.change('body', 'Keep this after navigation.');
    expect(os.data()!.noteDraft?.body).toContain('navigation');
    const reopened = TestBed.runInInjectionContext(() => new NotesComponent());
    reopened.recover();
    reopened.save();
    const note = os.data()!.notes.find((note) => note.title === 'A recovered thought')!;
    expect(note.body).toBe('Keep this after navigation.');
    expect(os.data()!.noteDraft).toBeUndefined();
    await reopened.edit(note);
    reopened.change('body', 'Updated');
    reopened.save();
    expect(os.data()!.notes.filter((item) => item.id === note.id).length).toBe(1);
    await reopened.remove(note);
    expect(os.confirm).toHaveBeenCalled();
    expect(os.data()!.notes.some((item) => item.id === note.id)).toBeFalse();
  });
  it('persists calendar edits and rejects invalid dates without changing the event list', async () => {
    const os = setup();
    const calendar = TestBed.runInInjectionContext(() => new CalendarComponent());
    calendar.selectedDate = '2026-11-10';
    calendar.create();
    calendar.editor!.title = 'Review';
    calendar.editor!.time = '11:00';
    calendar.save();
    expect(os.data()!.events.length).toBe(1);
    const event = os.data()!.events[0];
    calendar.edit(event);
    calendar.editor!.date = '2026-02-30';
    calendar.save();
    expect(calendar.editor).toBeDefined();
    expect(os.data()!.events[0].date).toBe('2026-11-10');
    calendar.editor!.date = '2026-11-11';
    calendar.editor!.title = 'Revised';
    calendar.save();
    expect(os.data()!.events[0].title).toBe('Revised');
    await calendar.remove(os.data()!.events[0]);
    expect(os.data()!.events.length).toBe(0);
  });
  it('creates, edits, toggles and deletes scheduled alarms without losing repeat days', async () => {
    const os = setup();
    const clock = TestBed.runInInjectionContext(() => new ClockComponent());
    const baseline = os.data()!.alarms.length;
    clock.create();
    clock.editor!.label = 'Work';
    clock.editor!.time = '09:00';
    clock.toggleDay(1);
    clock.toggleDay(3);
    clock.save();
    const alarm = os.data()!.alarms.find((a) => a.label === 'Work')!;
    expect(alarm.repeat).toEqual([1, 3]);
    expect(os.data()!.alarms.length).toBe(baseline + 1);
    clock.edit(alarm);
    clock.editor!.time = '10:30';
    clock.save();
    clock.toggle(alarm.id);
    expect(os.data()!.alarms.find((a) => a.id === alarm.id)!.enabled).toBeFalse();
    expect(os.data()!.alarms.find((a) => a.id === alarm.id)!.time).toBe('10:30');
    await clock.remove(alarm);
    expect(os.data()!.alarms.length).toBe(baseline);
  });
  it('calculates through the physical keypad and preserves chaining after equals', () => {
    const calculator = new CalculatorComponent();
    calculator.key('2');
    calculator.key('star');
    calculator.key('3');
    calculator.key('hash');
    expect(calculator.result).toBe('5');
    calculator.press('×');
    calculator.key('4');
    calculator.key('hash');
    expect(calculator.result).toBe('20');
    calculator.press('C');
    calculator.key('8');
    calculator.press('±');
    calculator.key('hash');
    expect(calculator.result).toBe('-8');
  });
});
