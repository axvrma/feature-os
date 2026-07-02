import { Injectable } from '@angular/core';
import { AlarmItem, Contact, MessageThread, NoteItem, OsData } from './os-models';

const DB_NAME = 'feature-phone-os';
const STORE_NAME = 'state';
const STATE_KEY = 'current';
const LOCAL_STORAGE_KEY = `${DB_NAME}:${STATE_KEY}`;
const STORAGE_TIMEOUT_MS = 1500;

@Injectable({ providedIn: 'root' })
export class OsStorageService {
  private dbPromise?: Promise<IDBDatabase>;

  async load(): Promise<OsData> {
    const stored = await this.readState();
    if (stored?.settings?.seeded) {
      stored.settings.launcherActions ??= { left: 'profiles', right: 'settings' };
      stored.settings.colorTheme ??= 'cherry';
      await this.save(stored);
      return stored;
    }

    const seeded = this.seedData();
    await this.save(seeded);
    return seeded;
  }

  async save(data: OsData): Promise<void> {
    await this.writeState(data);
  }

  async clear(): Promise<OsData> {
    const seeded = this.seedData();
    await this.save(seeded);
    return seeded;
  }

  private seedData(): OsData {
    const now = new Date().toISOString();
    const contacts: Contact[] = [
      { id: crypto.randomUUID(), name: 'Asha Kumar', phone: '9876501001', favorite: true },
      { id: crypto.randomUUID(), name: 'Tony Stark', phone: '5550102002', favorite: true },
      { id: crypto.randomUUID(), name: 'Maya Rao', phone: '8884400300' },
      { id: crypto.randomUUID(), name: 'Sam Wilson', phone: '7771204560' },
    ];
    const threads: MessageThread[] = [
      {
        id: crypto.randomUUID(),
        contactName: 'Asha Kumar',
        phone: '9876501001',
        messages: [
          { id: crypto.randomUUID(), body: 'Lunch at 1?', at: now, mine: false },
          { id: crypto.randomUUID(), body: 'Yes, see you there.', at: now, mine: true },
        ],
      },
      {
        id: crypto.randomUUID(),
        contactName: 'Tony Stark',
        phone: '5550102002',
        messages: [{ id: crypto.randomUUID(), body: 'Bring the tiny phone OS online.', at: now, mine: false }],
      },
    ];
    const alarms: AlarmItem[] = [
      { id: crypto.randomUUID(), label: 'Wake up', time: '07:00', enabled: true },
      { id: crypto.randomUUID(), label: 'Tea break', time: '16:30', enabled: false },
    ];
    const notes: NoteItem[] = [
      { id: crypto.randomUUID(), title: 'Groceries', body: 'Milk, coffee, rice', updatedAt: now },
      { id: crypto.randomUUID(), title: 'Idea', body: 'Make keypad navigation feel instant.', updatedAt: now },
    ];

    return {
      settings: {
        profile: 'General',
        theme: 'light',
        colorTheme: 'cherry',
        launcherActions: { left: 'profiles', right: 'settings' },
        seeded: true,
      },
      contacts,
      callLog: [],
      threads,
      alarms,
      notes,
      tracks: [],
      highScore: 0,
    };
  }

  private async get<T>(key: string): Promise<T | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result?.value as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  private async set(key: string, value: unknown): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private open(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async readState(): Promise<OsData | undefined> {
    try {
      return await this.withTimeout(this.get<OsData>(STATE_KEY), STORAGE_TIMEOUT_MS);
    } catch {
      return this.readLocalState();
    }
  }

  private async writeState(data: OsData): Promise<void> {
    try {
      await this.withTimeout(this.set(STATE_KEY, data), STORAGE_TIMEOUT_MS);
    } catch {
      this.writeLocalState(data);
    }
  }

  private readLocalState(): OsData | undefined {
    try {
      const value = localStorage.getItem(LOCAL_STORAGE_KEY);
      return value ? (JSON.parse(value) as OsData) : undefined;
    } catch {
      return undefined;
    }
  }

  private writeLocalState(data: OsData): void {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(data, (key, value) => (key === 'blob' || key === 'url' ? undefined : value)),
      );
    } catch {
      // If both persistent stores are unavailable, keep the in-memory state usable for this session.
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Storage timed out')), timeoutMs);
      promise
        .then(resolve, reject)
        .finally(() => window.clearTimeout(timeout));
    });
  }
}
