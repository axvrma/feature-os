import { TestBed } from '@angular/core/testing';
import { emptyData, validateData } from './data';
import { OS_DATABASE_NAME, OsStorageService } from './os-storage.service';
describe('Versioned local storage', () => {
  let storage: OsStorageService;
  let database: string;
  beforeEach(() => {
    database = `feature-os-test-${crypto.randomUUID()}`;
    TestBed.configureTestingModule({
      providers: [{ provide: OS_DATABASE_NAME, useValue: database }],
    });
    storage = TestBed.inject(OsStorageService);
    localStorage.removeItem('feature-phone-os:current');
  });
  afterEach(async () => {
    await storage.flush().catch(() => undefined);
    storage.ngOnDestroy();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(database);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });
  it('seeds once and never repopulates deleted user records', async () => {
    await storage.load();
    const d = emptyData();
    await storage.save(d);
    const again = await storage.load();
    expect(again.contacts).toEqual([]);
    expect(again.callLog).toEqual([]);
    expect(again.notes).toEqual([]);
  });
  it('migrates v1 embedded audio in one upgrade and retains old text/preferences', async () => {
    const old = emptyData();
    old.notes = [
      { id: 'note', title: 'Preserve me', body: 'offline', updatedAt: new Date().toISOString() },
    ];
    old.tracks = [
      {
        id: 'old-audio',
        name: 'Song',
        artist: 'Me',
        blob: new Blob(['audio'], { type: 'audio/wav' }),
        url: 'blob:expired',
      },
    ];
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(database, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('state', { keyPath: 'key' });
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('state', 'readwrite');
        tx.objectStore('state').put({ key: 'current', value: old });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    const loaded = await storage.load();
    expect(loaded.notes[0].body).toBe('offline');
    expect(loaded.tracks[0].mediaId).toBe('old-audio');
    expect(loaded.tracks[0].url).toBeUndefined();
    expect(loaded.tracks[0].blob).toBeUndefined();
    expect(await (await storage.getBlob('old-audio'))?.text()).toBe('audio');
  });
  it('serializes rapid snapshots and commits binary content atomically', async () => {
    await storage.load();
    const first = emptyData();
    first.highScore = 10;
    const second = emptyData();
    second.highScore = 20;
    await Promise.all([
      storage.save(first),
      storage.save(second, { put: { id: 'file', blob: new Blob(['kept']) } }),
    ]);
    expect((await storage.load()).highScore).toBe(20);
    expect(await (await storage.getBlob('file'))?.text()).toBe('kept');
    await storage.save(second, { replace: [] });
    expect(await storage.getBlob('file')).toBeUndefined();
  });
  it('refuses damaged or future records without reseeding them', () => {
    expect(() => validateData({ settings: {}, contacts: 'lost' })).toThrowError(/Invalid contacts/);
    expect(() => validateData({ ...emptyData(), schemaVersion: 100 })).toThrowError(
      /newer version/,
    );
    expect(() =>
      validateData({ ...emptyData(), notes: [{ id: 'x', title: 'x', body: 42 }] }),
    ).toThrowError(/notes/);
  });
  it('reports an explicit fallback instead of silently dropping media', async () => {
    spyOn(indexedDB, 'open').and.throwError('denied');
    await storage.load();
    expect(storage.mode()).toBe('localStorage');
    expect(storage.warning()).toContain('session-only');
    await storage.save(emptyData(), {
      put: { id: 'session', blob: new Blob(['session content']) },
    });
    expect(await (await storage.getBlob('session'))?.text()).toBe('session content');
  });
});
