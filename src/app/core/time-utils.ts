import { AlarmItem, CalendarEvent } from './os-models';
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validTime(time: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}
export function localMinuteKey(date: Date): string {
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function alarmDue(alarm: AlarmItem, now: Date): boolean {
  if (!alarm.enabled) return false;
  if (alarm.snoozeUntil) return now.getTime() >= alarm.snoozeUntil;
  if (!validTime(alarm.time) || (alarm.repeat?.length && !alarm.repeat.includes(now.getDay())))
    return false;
  return (
    alarm.time ===
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` &&
    alarm.lastTriggered !== localMinuteKey(now)
  );
}
/** Event inputs are wall-clock local time, never parsed as UTC date-only strings. */
export function eventTimestamp(event: Pick<CalendarEvent, 'date' | 'time'>): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || !validTime(event.time)) return NaN;
  const [year, month, day] = event.date.split('-').map(Number);
  const [hour, minute] = event.time.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return localDateKey(date) === event.date &&
    date.getHours() === hour &&
    date.getMinutes() === minute
    ? date.getTime()
    : NaN;
}
export function monthCells(
  year: number,
  month: number,
): Array<{ date: string; day: number; inMonth: boolean }> {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - offset + 1);
    return { date: localDateKey(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}
