import { TestBed } from '@angular/core/testing';
import { emptyData } from './data';
import { OS_DATABASE_NAME, OsStorageService } from './os-storage.service';

describe('Portable IndexedDB binary encoding', () => {
  let database: string;
  let storage: OsStorageService;
  beforeEach(() => {
    database = `feature-os-binary-${crypto.randomUUID()}`;
    localStorage.removeItem('feature-phone-os:current');
    TestBed.configureTestingModule({
      providers: [{ provide: OS_DATABASE_NAME, useValue: database }],
    });
    storage = TestBed.inject(OsStorageService);
  });
  afterEach(async () => {
    await storage.flush().catch(() => undefined);
    storage.ngOnDestroy();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(database);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });
  async function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(database, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function putRaw(value: unknown): Promise<void> {
    const db = await open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('media', 'readwrite');
        transaction.objectStore('media').put(value);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }
  it('stores ArrayBuffer and MIME type, then materializes a playable/downloadable Blob', async () => {
    await storage.load();
    await storage.save(emptyData(), {
      put: { id: 'portable', blob: new Blob(['portable bytes'], { type: 'audio/wav' }) },
    });
    const db = await open();
    const stored = await new Promise<{
      id: string;
      bytes: ArrayBuffer;
      type: string;
      blob?: unknown;
    }>((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').get('portable');
      request.onsuccess = () =>
        resolve(request.result as { id: string; bytes: ArrayBuffer; type: string });
      request.onerror = () => reject(request.error);
    });
    db.close();
    expect(stored.bytes instanceof ArrayBuffer).toBeTrue();
    expect(stored.blob).toBeUndefined();
    expect(stored.type).toBe('audio/wav');
    expect(new TextDecoder().decode(stored.bytes)).toBe('portable bytes');
    const restored = await storage.getBlob('portable');
    expect(restored?.type).toBe('audio/wav');
    expect(await restored?.text()).toBe('portable bytes');
  });
  it('continues reading earlier Blob records alongside byte records', async () => {
    await storage.load();
    await putRaw({ id: 'legacy', blob: new Blob(['old audio'], { type: 'audio/mpeg' }) });
    expect(await (await storage.getBlob('legacy'))?.text()).toBe('old audio');
    const recovery = JSON.parse(await storage.recovery()) as {
      databaseMedia: Array<{ id: string; base64: string }>;
      errors: string[];
    };
    expect(atob(recovery.databaseMedia.find((item) => item.id === 'legacy')!.base64)).toBe(
      'old audio',
    );
    expect(recovery.errors).toEqual([]);
  });
  it('exports exact byte content and explicitly reports malformed binary records', async () => {
    await storage.load();
    await putRaw({
      id: 'bytes',
      bytes: new Uint8Array([0, 1, 255]).buffer,
      type: 'application/octet-stream',
    });
    await putRaw({ id: 'broken', bytes: 'not binary', type: 'text/plain' });
    await expectAsync(storage.getBlob('broken')).toBeRejectedWithError(/damaged/);
    const recovery = JSON.parse(await storage.recovery()) as {
      databaseMedia: Array<{ id: string; base64: string; size: number }>;
      errors: string[];
    };
    const content = recovery.databaseMedia.find((item) => item.id === 'bytes')!;
    expect(content.size).toBe(3);
    expect(Array.from(atob(content.base64), (value) => value.charCodeAt(0))).toEqual([0, 1, 255]);
    expect(
      recovery.errors.some((error) => error.includes('broken') && error.includes('damaged')),
    ).toBeTrue();
    expect(storage.warning()).toContain('incomplete');
  });
});
