import { OS_APPS } from './app-registry';
import { OsData, OsSettings } from './os-models';
export const DEFAULT_SETTINGS: OsSettings = {
  profile: 'General',
  theme: 'light',
  colorTheme: 'green',
  launcherActions: { left: 'contacts', right: 'settings' },
  seeded: true,
  fontSize: 'normal',
  sound: true,
  vibration: false,
  multiTap: true,
  wallpaper: 'dune',
  immersive: false,
  demoMode: false,
};
export function emptyData(): OsData {
  return {
    schemaVersion: 2,
    settings: structuredClone(DEFAULT_SETTINGS),
    contacts: [],
    callLog: [],
    threads: [],
    alarms: [],
    notes: [],
    tracks: [],
    events: [],
    media: [],
    highScore: 0,
  };
}
export function seedData(): OsData {
  const data = emptyData();
  const now = new Date().toISOString();
  data.contacts = [
    { id: crypto.randomUUID(), name: 'Asha Kumar', phone: '9876501001', favorite: true },
    { id: crypto.randomUUID(), name: 'Maya Rao', phone: '8884400300' },
  ];
  data.notes = [
    {
      id: crypto.randomUUID(),
      title: 'A little more present',
      body: 'Welcome to Feature OS. A tiny, private place for the essentials.\n\nUse the D-pad or arrow keys to explore. Your content stays in this browser.',
      updatedAt: now,
    },
  ];
  data.threads = [
    {
      id: crypto.randomUUID(),
      contactName: 'Asha Kumar',
      phone: '9876501001',
      messages: [
        {
          id: crypto.randomUUID(),
          body: 'Welcome! This is a sample local conversation.',
          at: now,
          mine: false,
          read: false,
        },
      ],
    },
  ];
  return data;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function bounded(value: unknown, max = 10000): value is string {
  return typeof value === 'string' && value.length <= max;
}
function entityId(value: unknown): value is string {
  return bounded(value, 200) && value.trim().length > 0;
}
function phone(value: unknown): value is string {
  return bounded(value, 60) && /^\+?[\d*# ()-]{1,60}$/.test(value) && /\d/.test(value);
}
function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}
function optionalString(value: unknown, max: number): boolean {
  return value === undefined || bounded(value, max);
}
export function validStoredDate(value: unknown): value is string {
  if (!bounded(value, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
function timestamp(value: unknown): value is string {
  return (
    bounded(value, 40) &&
    validStoredDate(value.slice(0, 10)) &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}
function uniqueIds(items: readonly { id: string }[], label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Duplicate ${label} IDs; original retained.`);
    seen.add(item.id);
  }
}
export function migrateData(value: unknown): OsData {
  if (!record(value) || !record(value['settings']))
    throw new Error(
      'Stored data is damaged. The original has been retained; export recovery data before resetting.',
    );
  if (
    value['schemaVersion'] !== undefined &&
    (!Number.isInteger(value['schemaVersion']) || Number(value['schemaVersion']) < 1)
  )
    throw new Error('Invalid data schema version; original retained.');
  if (typeof value['schemaVersion'] === 'number' && value['schemaVersion'] > 2)
    throw new Error('This data needs a newer version of Feature OS.');
  const source = structuredClone(value);
  const defaults = emptyData();
  const result = {
    ...defaults,
    ...source,
    settings: { ...DEFAULT_SETTINGS, ...(source['settings'] as Record<string, unknown>) },
  } as OsData;
  for (const key of [
    'contacts',
    'callLog',
    'threads',
    'alarms',
    'notes',
    'tracks',
    'events',
    'media',
  ] as const) {
    if (source[key] !== undefined && !Array.isArray(source[key]))
      throw new Error(`Invalid ${key} data; original retained.`);
    result[key] = (source[key] ?? []) as never;
  }
  if (result.settings.launcherActions !== undefined && !record(result.settings.launcherActions))
    throw new Error('Invalid launcher settings; original retained.');
  result.settings.launcherActions = {
    ...DEFAULT_SETTINGS.launcherActions,
    ...result.settings.launcherActions,
  };
  for (const side of ['left', 'right'] as const)
    if (!OS_APPS.some((app) => app.id === result.settings.launcherActions[side]))
      result.settings.launcherActions[side] = DEFAULT_SETTINGS.launcherActions[side];
  if (!['light', 'dark', 'contrast', 'classic'].includes(result.settings.theme))
    result.settings.theme = 'light';
  if (!['General', 'Silent', 'Meeting', 'Outdoor'].includes(result.settings.profile))
    result.settings.profile = 'General';
  result.schemaVersion = 2;
  return result;
}
export function validateData(value: unknown): OsData {
  const d = migrateData(value);
  const limits = {
    contacts: 10000,
    callLog: 20000,
    threads: 10000,
    alarms: 1000,
    notes: 10000,
    tracks: 10000,
    events: 10000,
    media: 10000,
  };
  for (const key of Object.keys(limits) as Array<keyof typeof limits>)
    if (d[key].length > limits[key]) throw new Error(`Too many ${key} records; original retained.`);
  if (
    !d.contacts.every(
      (c) =>
        record(c) &&
        entityId(c.id) &&
        bounded(c.name, 200) &&
        phone(c.phone) &&
        optionalBoolean(c.favorite),
    )
  )
    throw new Error('Invalid backup contacts.');
  if (
    !d.callLog.every(
      (c) =>
        record(c) &&
        entityId(c.id) &&
        phone(c.phone) &&
        timestamp(c.at) &&
        bounded(c.name, 200) &&
        ['dialled', 'received', 'missed', 'rejected', 'outgoing'].includes(c.direction) &&
        (c.duration === undefined || (Number.isSafeInteger(c.duration) && c.duration >= 0)) &&
        optionalString(c.outcome, 500),
    )
  )
    throw new Error('Invalid call history.');
  if (
    !d.notes.every(
      (n) =>
        record(n) &&
        entityId(n.id) &&
        bounded(n.title, 500) &&
        bounded(n.body, 200000) &&
        timestamp(n.updatedAt),
    )
  )
    throw new Error('Invalid backup notes.');
  let totalMessages = 0;
  if (
    !d.threads.every(
      (t) =>
        record(t) &&
        entityId(t.id) &&
        phone(t.phone) &&
        bounded(t.contactName, 200) &&
        optionalString(t.draft, 20000) &&
        Array.isArray(t.messages) &&
        t.messages.length <= 20000 &&
        (totalMessages += t.messages.length) <= 100000 &&
        t.messages.every(
          (m) =>
            record(m) &&
            entityId(m.id) &&
            bounded(m.body, 20000) &&
            timestamp(m.at) &&
            typeof m.mine === 'boolean' &&
            optionalBoolean(m.read),
        ),
    )
  )
    throw new Error('Invalid backup conversations.');
  if (
    !d.alarms.every(
      (a) =>
        record(a) &&
        entityId(a.id) &&
        bounded(a.label, 200) &&
        bounded(a.time, 5) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(a.time) &&
        typeof a.enabled === 'boolean' &&
        (a.repeat === undefined ||
          (Array.isArray(a.repeat) &&
            a.repeat.length <= 7 &&
            new Set(a.repeat).size === a.repeat.length &&
            a.repeat.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))) &&
        (a.snoozeUntil === undefined ||
          (Number.isSafeInteger(a.snoozeUntil) && a.snoozeUntil > 0)) &&
        (a.lastTriggered === undefined ||
          (bounded(a.lastTriggered, 16) &&
            validStoredDate(a.lastTriggered.slice(0, 10)) &&
            /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(a.lastTriggered))),
    )
  )
    throw new Error('Invalid backup alarms.');
  if (
    !d.events.every(
      (e) =>
        record(e) &&
        entityId(e.id) &&
        bounded(e.title, 500) &&
        validStoredDate(e.date) &&
        bounded(e.time, 5) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time) &&
        bounded(e.details, 20000) &&
        typeof e.reminder === 'boolean' &&
        (e.remindedAt === undefined || timestamp(e.remindedAt)),
    )
  )
    throw new Error('Invalid calendar events.');
  if (
    !d.media.every(
      (m) =>
        record(m) &&
        entityId(m.id) &&
        bounded(m.name, 500) &&
        bounded(m.type, 200) &&
        Number.isSafeInteger(m.size) &&
        m.size >= 0 &&
        timestamp(m.createdAt) &&
        ['audio', 'image', 'file'].includes(m.kind),
    )
  )
    throw new Error('Invalid media metadata.');
  if (
    !d.tracks.every(
      (t) =>
        record(t) &&
        entityId(t.id) &&
        bounded(t.name, 500) &&
        bounded(t.artist, 500) &&
        (t.mediaId === undefined || entityId(t.mediaId)) &&
        (t.blob === undefined || t.blob instanceof Blob) &&
        optionalString(t.url, 20000),
    )
  )
    throw new Error('Invalid music library.');
  for (const key of Object.keys(limits) as Array<keyof typeof limits>) uniqueIds(d[key], key);
  uniqueIds(
    d.threads.flatMap((thread) => thread.messages),
    'message',
  );
  if (!Number.isSafeInteger(d.highScore) || d.highScore < 0) throw new Error('Invalid high score.');
  const s = d.settings;
  for (const key of ['seeded', 'sound', 'vibration', 'multiTap', 'immersive', 'demoMode'] as const)
    if (typeof s[key] !== 'boolean') throw new Error(`Invalid ${key} preference.`);
  d.settings = {
    ...DEFAULT_SETTINGS,
    theme: s.theme,
    profile: s.profile,
    colorTheme: ['cherry', 'azure', 'violet', 'green'].includes(s.colorTheme)
      ? s.colorTheme
      : 'green',
    launcherActions: s.launcherActions,
    fontSize: s.fontSize === 'large' ? 'large' : 'normal',
    wallpaper: ['dune', 'night', 'plain'].includes(s.wallpaper) ? s.wallpaper : 'dune',
    sound: s.sound,
    vibration: s.vibration,
    multiTap: s.multiTap,
    immersive: s.immersive,
    demoMode: s.demoMode,
  };
  if (
    d.noteDraft !== undefined &&
    (!record(d.noteDraft) ||
      !entityId(d.noteDraft.id) ||
      !bounded(d.noteDraft.title, 500) ||
      !bounded(d.noteDraft.body, 200000))
  )
    throw new Error('Invalid note draft.');
  if (
    d.messageDraft !== undefined &&
    (!record(d.messageDraft) ||
      !bounded(d.messageDraft.phone, 60) ||
      !bounded(d.messageDraft.body, 20000))
  )
    throw new Error('Invalid message draft.');
  return d;
}
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadText(text: string, name: string, type = 'text/plain'): void {
  downloadBlob(new Blob([text], { type }), name);
}
