import { TestBed } from '@angular/core/testing';
import { emptyData } from './data';
import { OsData } from './os-models';
import { OS_DATABASE_NAME, OsStorageService } from './os-storage.service';

describe('Storage revision conflicts across browser sessions', () => {
  let database: string;
  let services: OsStorageService[];
  beforeEach(() => {
    database = `feature-os-concurrency-${crypto.randomUUID()}`;
    services = [];
    localStorage.removeItem('feature-phone-os:current');
    TestBed.configureTestingModule({
      providers: [{ provide: OS_DATABASE_NAME, useValue: database }],
    });
  });
  afterEach(async () => {
    await Promise.all(services.map((service) => service.flush().catch(() => undefined)));
    for (const service of services) service.ngOnDestroy();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(database);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });
  function session(): OsStorageService {
    const service = TestBed.runInInjectionContext(() => new OsStorageService());
    services.push(service);
    return service;
  }
  async function record(): Promise<{ value: OsData; revision: number }> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(database, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction('state', 'readonly').objectStore('state').get('current');
        request.onsuccess = () => resolve(request.result as { value: OsData; revision: number });
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }
  it('rejects a stale tab without overwriting the winner and preserves its session files', async () => {
    const first = session();
    const second = session();
    const firstData = await first.load();
    const secondData = await second.load();
    const initialRevision = (await record()).revision;
    firstData.highScore = 10;
    await first.save(firstData);
    secondData.highScore = 20;
    secondData.media.push({
      id: 'conflict-file',
      name: 'Keep me.txt',
      type: 'text/plain',
      kind: 'file',
      size: 4,
      createdAt: new Date().toISOString(),
    });
    await expectAsync(
      second.save(secondData, {
        put: { id: 'conflict-file', blob: new Blob(['kept'], { type: 'text/plain' }) },
      }),
    ).toBeRejectedWithError(/Another Feature OS tab/);
    expect((await record()).value.highScore).toBe(10);
    expect((await record()).revision).toBe(initialRevision + 1);
    expect(second.warning()).toContain('Export a backup or recovery copy');
    const recovery = JSON.parse(await second.recovery()) as {
      session: OsData;
      database: { value: OsData };
      sessionMedia: Array<{ id: string; base64: string }>;
    };
    expect(recovery.session.highScore).toBe(20);
    expect(recovery.database.value.highScore).toBe(10);
    expect(atob(recovery.sessionMedia[0].base64)).toBe('kept');
    const fresh = session();
    const current = await fresh.load();
    expect(current.highScore).toBe(10);
    current.highScore = 30;
    await fresh.save(current);
    expect((await record()).value.highScore).toBe(30);
    await expectAsync(second.save(secondData)).toBeRejectedWithError(/Another Feature OS tab/);
    await expectAsync(second.save(secondData, { replace: [] })).toBeRejectedWithError(
      /Another Feature OS tab/,
    );
    expect((await record()).value.highScore).toBe(30);
  });
  it('compares revisions inside the transaction when tabs save concurrently', async () => {
    const first = session();
    const second = session();
    const a = await first.load();
    const b = await second.load();
    a.highScore = 101;
    b.highScore = 202;
    const results = await Promise.allSettled([first.save(a), second.save(b)]);
    expect(results.filter((result) => result.status === 'fulfilled').length).toBe(1);
    expect(results.filter((result) => result.status === 'rejected').length).toBe(1);
    expect([101, 202]).toContain((await record()).value.highScore);
  });
  it('migrates revisionless records once without making ordinary loads into competing writes', async () => {
    const legacy = emptyData();
    legacy.highScore = 7;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(database, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('state', { keyPath: 'key' });
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('state', 'readwrite');
        transaction.objectStore('state').put({ key: 'current', value: legacy });
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
    expect((await session().load()).highScore).toBe(7);
    const revision = (await record()).revision;
    expect(revision).toBe(1);
    expect((await session().load()).highScore).toBe(7);
    expect((await record()).revision).toBe(revision);
  });
  it('retains a corrupt revision for recovery but permits an explicit replacement to repair it', async () => {
    const original = emptyData();
    original.notes.push({
      id: 'original',
      title: 'Recover first',
      body: 'Retain my original',
      updatedAt: new Date().toISOString(),
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(database, 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('state', { keyPath: 'key' });
        request.result.createObjectStore('media', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('state', 'readwrite');
        transaction
          .objectStore('state')
          .put({ key: 'current', value: original, revision: 'damaged' });
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
    const damaged = session();
    await expectAsync(damaged.load()).toBeRejectedWithError(/retained/);
    const recovery = JSON.parse(await damaged.recovery()) as {
      database: { revision: unknown; value: OsData };
    };
    expect(recovery.database.revision).toBe('damaged');
    expect(recovery.database.value.notes[0].body).toBe('Retain my original');
    await expectAsync(damaged.save(emptyData())).toBeRejectedWithError(/revision/);
    const replacement = emptyData();
    replacement.highScore = 5;
    await damaged.save(replacement, { replace: [] });
    expect((await record()).revision).toBe(1);
    expect((await record()).value.highScore).toBe(5);
    replacement.highScore = 6;
    await damaged.save(replacement);
    expect((await record()).value.highScore).toBe(6);
  });
});
