import { Injectable, InjectionToken, OnDestroy, inject, signal } from '@angular/core';
import { validateData, seedData } from './data';
import { MediaItem, OsData } from './os-models';
const DB_NAME = 'feature-phone-os';
export const OS_DATABASE_NAME = new InjectionToken<string>('OS_DATABASE_NAME', {
  providedIn: 'root',
  factory: () => DB_NAME,
});
const LOCAL_KEY = `${DB_NAME}:current`;
export type MediaChange = {
  put?: { id: string; blob: Blob };
  delete?: string;
  replace?: Array<{ id: string; blob: Blob }>;
};
interface StateRecord {
  key: string;
  value: unknown;
  updatedAt?: number;
  revision?: number;
}
class StorageConflictError extends Error {
  constructor() {
    super(
      'Another Feature OS tab changed the saved data. Your edits and files remain in this tab. Export a backup or recovery copy, close other tabs, then reload before saving.',
    );
    this.name = 'StorageConflictError';
  }
}
function revisionOf(record: StateRecord | undefined): number {
  if (record?.revision === undefined) return 0;
  if (!Number.isSafeInteger(record.revision) || record.revision < 0)
    throw new Error(
      'Stored revision is damaged. Original data retained; export recovery before resetting.',
    );
  return record.revision;
}
interface BlobRecord {
  id: string;
  blob: Blob;
}
interface BinaryRecord {
  id: string;
  bytes: ArrayBuffer;
  type: string;
}
/** ArrayBuffer records avoid WebKit's Blob/File IndexedDB serialization failures. */
function materializeBinary(value: unknown): BlobRecord | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string')
    throw new Error('Stored binary metadata is damaged. Original record retained.');
  if ('bytes' in value) {
    if (
      !(value.bytes instanceof ArrayBuffer) ||
      !('type' in value) ||
      typeof value.type !== 'string'
    )
      throw new Error(`Stored binary content ${value.id} is damaged. Original record retained.`);
    return { id: value.id, blob: new Blob([value.bytes], { type: value.type }) };
  }
  if ('blob' in value && value.blob instanceof Blob) return { id: value.id, blob: value.blob };
  throw new Error(`Stored binary content ${value.id} is damaged. Original record retained.`);
}
interface RecoveryBlob {
  id: string;
  type: string;
  size: number;
  base64: string;
}
@Injectable({ providedIn: 'root' })
export class OsStorageService implements OnDestroy {
  private readonly databaseName = inject(OS_DATABASE_NAME);
  readonly mode = signal<'indexeddb' | 'localStorage' | 'memory'>('indexeddb');
  readonly warning = signal('');
  private db?: Promise<IDBDatabase>;
  private tail: Promise<void> = Promise.resolve();
  /** Uncommitted/fallback blobs remain recoverable even when a quota transaction aborts. */
  private memory = new Map<string, Blob>();
  private pendingMetadata = new Map<string, MediaItem>();
  private latest?: OsData;
  private revision?: number;
  async load(): Promise<OsData> {
    await this.tail.catch(() => undefined);
    if (this.latest) return structuredClone(this.latest);
    let raw: unknown;
    let fallback: string | null = null;
    let recoveredFallback = false;
    let needsMigration = true;
    try {
      fallback = localStorage.getItem(LOCAL_KEY);
    } catch {
      /* IndexedDB can work when localStorage is blocked. */
    }
    let db: IDBDatabase | undefined;
    try {
      db = await this.open();
    } catch (error) {
      if (error instanceof Error && /blocked|newer|version/i.test(error.message))
        throw new Error(
          'The database cannot be opened safely. Original data retained; close other tabs or use the newer app before resetting.',
          { cause: error },
        );
      this.mode.set('localStorage');
      this.warning.set(
        'IndexedDB unavailable. Text is saved in local storage; imported files are session-only. Export a backup before closing.',
      );
    }
    if (db) {
      try {
        const stored = await this.readRecord(db);
        this.revision = revisionOf(stored);
        needsMigration = stored?.revision === undefined;
        if (stored && stored.value === undefined) throw new Error('Missing state value');
        raw = stored?.value;
      } catch {
        throw new Error(
          'Stored data could not be read. Original database retained; export recovery data before resetting.',
        );
      }
    }
    if (raw === undefined && fallback !== null) {
      try {
        raw = JSON.parse(fallback) as unknown;
        recoveredFallback = Boolean(db);
      } catch {
        throw new Error(
          'Local data cannot be read. Original copy retained. Export recovery data before resetting.',
        );
      }
    } else if (raw !== undefined && fallback !== null) {
      this.warning.set(
        'A previous fallback copy exists. The database is active; export recovery data to preserve both copies.',
      );
    }
    const data = raw === undefined ? seedData() : validateData(raw);
    const embedded = data.tracks
      .filter((track) => track.blob instanceof Blob)
      .map((track) => ({ id: track.mediaId ?? track.id, blob: track.blob! }));
    for (const track of data.tracks) {
      if (track.blob instanceof Blob) {
        track.mediaId ??= track.id;
        if (!data.media.some((item) => item.id === track.mediaId))
          data.media.push({
            id: track.mediaId,
            name: track.name,
            type: track.blob.type,
            size: track.blob.size,
            kind: 'audio',
            createdAt: new Date().toISOString(),
          });
      }
      delete track.blob;
      delete track.url;
    }
    this.latest = data;
    // Migration appends embedded audio instead of clearing any existing binary records.
    try {
      if (!db || needsMigration || embedded.length || recoveredFallback)
        await this.save(
          data,
          embedded.length ? { put: embedded[0] } : undefined,
          embedded.slice(1),
        );
      if (recoveredFallback) {
        try {
          localStorage.removeItem(LOCAL_KEY);
        } catch {
          /* Keep the recovery copy if localStorage is blocked. */
        }
        this.warning.set('Recovered previous local fallback data into IndexedDB.');
      }
    } catch (error) {
      // Valid data and media remain usable/exportable; the original database is untouched.
      this.warning.set(
        error instanceof StorageConflictError
          ? error.message
          : 'Your data is loaded in memory, but saving failed. Export a complete backup or recovery copy before closing; retry saving in Settings.',
      );
    }
    return structuredClone(data);
  }
  save(data: OsData, change?: MediaChange, extraBlobs: BlobRecord[] = []): Promise<void> {
    const snapshot = structuredClone(data);
    for (const track of snapshot.tracks) {
      delete track.url;
      delete track.blob;
    }
    const copiedChange = change
      ? {
          ...change,
          put: change.put ? { ...change.put } : undefined,
          replace: change.replace?.map((item) => ({ ...item })),
        }
      : undefined;
    this.latest = snapshot;
    const result = this.tail
      .catch(() => undefined)
      .then(() => this.write(snapshot, copiedChange, extraBlobs));
    this.tail = result;
    return result;
  }
  async flush(): Promise<void> {
    await this.tail;
  }
  async getBlob(id: string): Promise<Blob | undefined> {
    await this.tail.catch(() => undefined);
    if (this.memory.has(id)) return this.memory.get(id);
    if (this.mode() !== 'indexeddb') return undefined;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').get(id);
      request.onsuccess = () => {
        try {
          resolve(materializeBinary(request.result as unknown)?.blob);
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  async putBlob(id: string, blob: Blob): Promise<void> {
    if (!this.latest) throw new Error('Storage not initialized.');
    await this.save(this.latest, { put: { id, blob } });
  }
  async deleteBlob(id: string): Promise<void> {
    if (this.latest) await this.save(this.latest, { delete: id });
  }
  async clear(): Promise<OsData> {
    const data = seedData();
    await this.save(data, { replace: [] });
    return data;
  }
  async recovery(): Promise<string> {
    await this.tail.catch(() => undefined);
    const copies: {
      format: string;
      version: number;
      fallback: string | null;
      database: StateRecord | undefined;
      session: OsData | undefined;
      databaseMedia: RecoveryBlob[];
      sessionMedia: RecoveryBlob[];
      pendingMediaMetadata: MediaItem[];
      errors: string[];
    } = {
      format: 'feature-os-recovery',
      version: 1,
      fallback: null,
      database: undefined,
      session: this.latest,
      databaseMedia: [],
      sessionMedia: [],
      pendingMediaMetadata: Array.from(this.pendingMetadata.values()),
      errors: [],
    };
    try {
      copies.fallback = localStorage.getItem(LOCAL_KEY);
    } catch {
      copies.errors.push('Local fallback could not be read.');
    }
    try {
      const db = await this.open();
      copies.database = await this.readRecord(db);
      const records = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction('media', 'readonly').objectStore('media').getAll();
        request.onsuccess = () => resolve(request.result as unknown[]);
        request.onerror = () => reject(request.error);
      });
      const blobs: BlobRecord[] = [];
      for (const record of records) {
        try {
          const normalized = materializeBinary(record);
          if (normalized) blobs.push(normalized);
        } catch (error) {
          copies.errors.push(
            error instanceof Error ? error.message : 'A stored binary record could not be read.',
          );
        }
      }
      // Corrupt legacy state may still contain valuable embedded audio.
      const value = copies.database?.value;
      if (value && typeof value === 'object' && 'tracks' in value && Array.isArray(value.tracks))
        for (const track of value.tracks) {
          if (
            track &&
            typeof track === 'object' &&
            typeof track.id === 'string' &&
            track.blob instanceof Blob &&
            !blobs.some((item) => item.id === track.id)
          )
            blobs.push({ id: track.id, blob: track.blob });
        }
      copies.databaseMedia = await this.encodeBlobs(blobs, copies.errors);
    } catch {
      copies.errors.push(
        'Some database records or files could not be read. Retain the original installation.',
      );
    }
    copies.sessionMedia = await this.encodeBlobs(
      Array.from(this.memory, ([id, blob]) => ({ id, blob })),
      copies.errors,
    );
    if (copies.errors.length)
      this.warning.set(
        'Recovery export is incomplete. Retain this installation and any original files; see errors inside the export.',
      );
    return JSON.stringify(copies, null, 2);
  }
  private async encodeBlobs(items: BlobRecord[], errors: string[]): Promise<RecoveryBlob[]> {
    const result: RecoveryBlob[] = [];
    for (const item of items) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(item.blob);
        });
        result.push({ id: item.id, type: item.blob.type, size: item.blob.size, base64 });
      } catch {
        errors.push(`Could not export file ${item.id}.`);
      }
    }
    return result;
  }
  private async write(
    data: OsData,
    change?: MediaChange,
    extraBlobs: BlobRecord[] = [],
  ): Promise<void> {
    // Stage additions before any write. A failure must never destroy the only copy of an import.
    const additions = [
      ...extraBlobs,
      ...(change?.replace ?? []),
      ...(change?.put ? [change.put] : []),
    ];
    for (const item of additions) {
      this.memory.set(item.id, item.blob);
      const meta = data.media.find((media) => media.id === item.id);
      if (meta) this.pendingMetadata.set(item.id, structuredClone(meta));
    }
    if (this.mode() === 'indexeddb') {
      try {
        const db = await this.open();
        const pending =
          change?.replace !== undefined
            ? new Map(change.replace.map((item) => [item.id, item.blob]))
            : new Map(this.memory);
        for (const item of extraBlobs) pending.set(item.id, item.blob);
        if (change?.put) pending.set(change.put.id, change.put.blob);
        // Read bytes before opening the transaction: async Blob reads would make it inactive.
        const encoded: BinaryRecord[] = await Promise.all(
          Array.from(pending, async ([id, blob]) => ({
            id,
            bytes: await blob.arrayBuffer(),
            type: blob.type,
          })),
        );
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(['state', 'media'], 'readwrite');
          let failure: unknown;
          let nextRevision = 0;
          transaction.oncomplete = () => {
            this.revision = nextRevision;
            resolve();
          };
          transaction.onabort = () =>
            reject(failure ?? transaction.error ?? new Error('Storage transaction aborted'));
          transaction.onerror = () => reject(failure ?? transaction.error);
          const state = transaction.objectStore('state');
          const current = state.get('current');
          current.onsuccess = () => {
            try {
              const stored = current.result as StateRecord | undefined;
              let diskRevision: number;
              let repairingRevision = false;
              try {
                diskRevision = revisionOf(stored);
              } catch (error) {
                // Confirmed reset/validated restore can repair otherwise unreadable metadata.
                // An initialized stale tab must still retain the other tab's changes.
                if (this.revision !== undefined || change?.replace === undefined) throw error;
                diskRevision = 0;
                repairingRevision = true;
              }
              if (
                (this.revision === undefined && stored && !repairingRevision) ||
                diskRevision !== (this.revision ?? 0)
              )
                throw new StorageConflictError();
              if (diskRevision === Number.MAX_SAFE_INTEGER)
                throw new Error(
                  'Storage revision limit reached. Export your data before resetting.',
                );
              nextRevision = diskRevision + 1;
              // The revision comparison and all state/media writes share this transaction.
              const media = transaction.objectStore('media');
              if (change?.replace !== undefined) media.clear();
              for (const item of encoded) media.put(item);
              if (change?.delete) media.delete(change.delete);
              state.put({
                key: 'current',
                value: data,
                updatedAt: Date.now(),
                revision: nextRevision,
              });
            } catch (error) {
              failure = error;
              transaction.abort();
            }
          };
        });
        if (change?.replace !== undefined) {
          this.memory.clear();
          this.pendingMetadata.clear();
        } else
          for (const id of pending.keys()) {
            this.memory.delete(id);
            this.pendingMetadata.delete(id);
          }
        if (change?.delete) {
          this.memory.delete(change.delete);
          this.pendingMetadata.delete(change.delete);
        }
        // Explicit reset/restore replacement must never leave a stale fallback to resurrect later.
        if (change?.replace !== undefined)
          try {
            localStorage.removeItem(LOCAL_KEY);
          } catch {
            this.warning.set(
              'Database replaced. A blocked local fallback copy may still exist; retain a recovery export.',
            );
          }
        return;
      } catch (error) {
        this.warning.set(
          error instanceof StorageConflictError
            ? error.message
            : `Changes and pending files remain recoverable in this tab; database save failed (${error instanceof Error ? error.message : 'quota or unavailable'}). Export a backup or recovery copy before closing. Retry saving in Settings.`,
        );
        throw error;
      }
    }
    const nextMemory =
      change?.replace !== undefined
        ? new Map(change.replace.map((item) => [item.id, item.blob]))
        : new Map(this.memory);
    for (const item of extraBlobs) nextMemory.set(item.id, item.blob);
    if (change?.put) nextMemory.set(change.put.id, change.put.blob);
    if (change?.delete) nextMemory.delete(change.delete);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
      this.memory = nextMemory;
      for (const id of this.pendingMetadata.keys())
        if (!nextMemory.has(id)) this.pendingMetadata.delete(id);
      this.mode.set('localStorage');
    } catch {
      this.mode.set('memory');
      this.warning.set(
        'Persistent storage is unavailable. Changes and files exist only in this tab. Export a backup or recovery copy before closing.',
      );
      throw new Error('Storage unavailable; changes remain in this session.');
    }
  }
  private readRecord(db: IDBDatabase): Promise<StateRecord | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('state', 'readonly');
      const request = transaction.objectStore('state').get('current');
      request.onsuccess = () => resolve(request.result as StateRecord | undefined);
      request.onerror = () => reject(request.error);
    });
  }
  ngOnDestroy(): void {
    void this.db?.then(
      (db) => db.close(),
      () => undefined,
    );
  }
  private open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    const pending = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const request = indexedDB.open(this.databaseName, 2);
      let settled = false;
      const timeout = setTimeout(() => {
        settled = true;
        reject(
          new Error('Database is blocked by another tab. Close other Feature OS tabs and reload.'),
        );
      }, 4000);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('state'))
          db.createObjectStore('state', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('media'))
          db.createObjectStore('media', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        clearTimeout(timeout);
        if (settled) {
          request.result.close();
          return;
        }
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.db = undefined;
          this.warning.set('Database updated in another tab. Reload to continue safely.');
        };
        resolve(db);
      };
      request.onerror = () => {
        clearTimeout(timeout);
        reject(request.error);
      };
    });
    this.db = pending;
    void pending.catch(() => {
      if (this.db === pending) this.db = undefined;
    });
    return pending;
  }
}
