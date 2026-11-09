import { emptyData, migrateData, validateData, validStoredDate } from './data';

describe('Durable data validation', () => {
  it('migrates existing records without reseeding or mutating the original', () => {
    const old = {
      settings: { profile: 'Silent', theme: 'dark', seeded: true },
      notes: [{ id: 'n', title: 'Keep', body: 'My text', updatedAt: '2026-11-09T12:00:00.000Z' }],
      contacts: [],
      highScore: 4,
    };
    const result = validateData(old);
    expect(result.schemaVersion).toBe(2);
    expect(result.notes[0].body).toBe('My text');
    expect(result.contacts).toEqual([]);
    expect(result.settings.multiTap).toBeTrue();
    result.notes[0].body = 'Changed';
    expect(old.notes[0].body).toBe('My text');
  });
  it('rejects corrupt collections, future versions and invalid schema types', () => {
    expect(() => validateData({ ...emptyData(), events: 'lost' })).toThrowError(/events/);
    expect(() => migrateData({ ...emptyData(), schemaVersion: 3 })).toThrowError(/newer/);
    expect(() => migrateData({ ...emptyData(), schemaVersion: '2' })).toThrowError(/schema/);
  });
  it('validates leap days and rejects normalized impossible dates', () => {
    expect(validStoredDate('2024-02-29')).toBeTrue();
    expect(validStoredDate('2000-02-29')).toBeTrue();
    for (const date of [
      '2025-02-29',
      '1900-02-29',
      '2026-02-30',
      '2026-04-31',
      '2026-00-01',
      '2026-13-01',
      '0000-01-01',
    ])
      expect(validStoredDate(date)).toBeFalse();
    const data = emptyData();
    data.events = [
      {
        id: 'event',
        title: 'Bad day',
        date: '2026-02-30',
        time: '09:00',
        details: '',
        reminder: false,
      },
    ];
    expect(() => validateData(data)).toThrowError(/calendar/);
  });
  it('rejects impossible timestamp dates even when Date.parse normalizes them', () => {
    const data = emptyData();
    data.notes = [
      { id: 'note', title: 'Bad date', body: 'Keep source', updatedAt: '2026-02-30T12:00:00.000Z' },
    ];
    expect(() => validateData(data)).toThrowError(/notes/);
  });
  it('rejects duplicate IDs in each entity collection and inside conversations', () => {
    const data = emptyData();
    const contact = { id: 'same', name: 'One', phone: '1234' };
    data.contacts = [contact, { ...contact, name: 'Two' }];
    expect(() => validateData(data)).toThrowError(/Duplicate contacts/);
    const other = emptyData();
    const message = { id: 'same', body: 'A', mine: true, at: '2026-11-09T12:00:00.000Z' };
    other.threads = [
      {
        id: 'thread',
        phone: '1234',
        contactName: 'One',
        messages: [message, { ...message, body: 'B' }],
      },
    ];
    expect(() => validateData(other)).toThrowError(/Duplicate message/);
  });
  it('validates draft shape and optional booleans instead of coercing corrupt values', () => {
    expect(() => validateData({ ...emptyData(), noteDraft: null })).toThrowError(/draft/);
    expect(() => validateData({ ...emptyData(), messageDraft: 'unsaved' })).toThrowError(/draft/);
    const data = emptyData();
    data.settings.sound = 'yes' as unknown as boolean;
    expect(() => validateData(data)).toThrowError(/preference/);
    const other = emptyData();
    other.threads = [
      {
        id: 'thread',
        phone: '1234',
        contactName: 'A',
        draft: 44 as unknown as string,
        messages: [],
      },
    ];
    expect(() => validateData(other)).toThrowError(/conversations/);
  });
  it('bounds every top-level collection including alarms and call history', () => {
    const data = emptyData();
    data.alarms = Array.from({ length: 1001 }, (_, index) => ({
      id: String(index),
      label: 'Alarm',
      time: '07:00',
      enabled: false,
    }));
    expect(() => validateData(data)).toThrowError(/Too many alarms/);
  });
  it('retains valid legacy large-file metadata while import controls enforce new upload limits', () => {
    const data = emptyData();
    data.media = [
      {
        id: 'legacy',
        name: 'Previously imported.wav',
        type: 'audio/wav',
        size: 30 * 1024 * 1024,
        kind: 'audio',
        createdAt: '2026-11-09T12:00:00.000Z',
      },
    ];
    expect(validateData(data).media[0].size).toBe(30 * 1024 * 1024);
  });
});
