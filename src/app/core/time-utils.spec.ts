import { alarmDue, eventTimestamp, localDateKey, localMinuteKey, monthCells } from './time-utils';
describe('local clock and calendar dates', () => {
  const now = new Date(2026, 10, 9, 7, 30, 20);
  it('triggers enabled alarms once per local minute and respects weekdays', () => {
    const alarm = { id: 'a', label: 'Morning', time: '07:30', enabled: true, repeat: [1] };
    expect(alarmDue(alarm, now)).toBeTrue();
    expect(alarmDue({ ...alarm, lastTriggered: localMinuteKey(now) }, now)).toBeFalse();
    expect(alarmDue({ ...alarm, repeat: [2] }, now)).toBeFalse();
    expect(alarmDue({ ...alarm, enabled: false }, now)).toBeFalse();
    expect(alarmDue({ ...alarm, snoozeUntil: now.getTime() + 1000 }, now)).toBeFalse();
    expect(alarmDue({ ...alarm, snoozeUntil: now.getTime() - 1000 }, now)).toBeTrue();
  });
  it('keeps date-only values local and rejects impossible calendar dates', () => {
    expect(localDateKey(now)).toBe('2026-11-09');
    expect(eventTimestamp({ date: '2026-11-09', time: '07:30' })).toBe(
      new Date(2026, 10, 9, 7, 30).getTime(),
    );
    expect(Number.isNaN(eventTimestamp({ date: '2026-02-30', time: '07:30' }))).toBeTrue();
    expect(Number.isNaN(eventTimestamp({ date: '2026-11-09', time: '29:30' }))).toBeTrue();
    expect(monthCells(2026, 10).length).toBe(42);
    expect(monthCells(2026, 10).filter((day) => day.inMonth).length).toBe(30);
  });
});
