import { TestBed } from '@angular/core/testing';
import { emptyData } from './data';
import { OS_DATABASE_NAME, OsStorageService } from './os-storage.service';

describe('Storage recovery and aborted transactions', () => {
  let storage: OsStorageService;
  let database: string;
  beforeEach(() => {
    database = `feature-os-recovery-${crypto.randomUUID()}`;
    TestBed.configureTestingModule({
      providers: [{ provide: OS_DATABASE_NAME, useValue: database }],
    });
    storage = TestBed.inject(OsStorageService);
    localStorage.removeItem('feature-phone-os:current');
  });
  afterEach(async () => {
    await storage.flush().catch(() => undefined);
    storage.ngOnDestroy();
    localStorage.removeItem('feature-phone-os:current');
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(database);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });
  async function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(database, 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('state', { keyPath: 'key' });
        request.result.createObjectStore('media', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  it('retains malformed database state for recovery instead of replacing it with samples', async () => {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite');
      tx.objectStore('state').put({ key: 'current' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    await expectAsync(storage.load()).toBeRejectedWithError(/retained/);
    const recovery = JSON.parse(await storage.recovery()) as {
      database: { key: string; value?: unknown };
    };
    expect(recovery.database.key).toBe('current');
    expect(recovery.database.value).toBeUndefined();
  });
  it('keeps failed imported blobs exportable and retries them atomically', async () => {
    await storage.load();
    const data = emptyData();
    data.media = [
      {
        id: 'pending',
        name: 'Keep me.txt',
        type: 'text/plain',
        kind: 'file',
        size: 7,
        createdAt: new Date().toISOString(),
      },
    ];
    const original = IDBObjectStore.prototype.put;
    const put = spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore,
      value: unknown,
    ): IDBRequest<IDBValidKey> {
      if (this.name === 'state') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, value);
    });
    await expectAsync(
      storage.save(data, { put: { id: 'pending', blob: new Blob(['recover']) } }),
    ).toBeRejected();
    expect(await (await storage.getBlob('pending'))?.text()).toBe('recover');
    const db = await openDatabase();
    const committed = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').get('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    expect(committed).toBeUndefined();
    const recovery = JSON.parse(await storage.recovery()) as {
      sessionMedia: Array<{ id: string; base64: string }>;
      pendingMediaMetadata: Array<{ name: string }>;
    };
    expect(recovery.sessionMedia[0].base64).toBe(btoa('recover'));
    expect(recovery.pendingMediaMetadata[0].name).toBe('Keep me.txt');
    put.and.callThrough();
    await storage.save(data);
    expect(await (await storage.getBlob('pending'))?.text()).toBe('recover');
  });
  it('removes stale fallback after explicit replacement so reset cannot resurrect old data', async () => {
    await storage.load();
    const old = emptyData();
    old.highScore = 999;
    localStorage.setItem('feature-phone-os:current', JSON.stringify(old));
    await storage.save(emptyData(), { replace: [] });
    expect(localStorage.getItem('feature-phone-os:current')).toBeNull();
  });
  it('includes durable media in recovery exports as real binary content', async () => {
    await storage.load();
    await storage.save(emptyData(), {
      put: { id: 'binary', blob: new Blob(['offline file'], { type: 'text/plain' }) },
    });
    const recovery = JSON.parse(await storage.recovery()) as {
      databaseMedia: Array<{ id: string; type: string; base64: string }>;
      errors: string[];
    };
    expect(recovery.databaseMedia[0].id).toBe('binary');
    expect(atob(recovery.databaseMedia[0].base64)).toBe('offline file');
    expect(recovery.errors).toEqual([]);
  });
});
