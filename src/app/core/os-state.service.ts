import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { OsStorageService } from './os-storage.service';
import { MediaItem, OsData } from './os-models';
import { alarmDue, localMinuteKey, eventTimestamp } from './time-utils';
import { downloadText, seedData, validateData } from './data';
export interface Ringing {
  id: string;
  label: string;
  kind: 'alarm' | 'event';
}
@Injectable({ providedIn: 'root' })
export class OsStateService implements OnDestroy {
  readonly storage = inject(OsStorageService);
  readonly data = signal<OsData | null>(null);
  readonly now = signal(new Date());
  readonly message = signal('');
  readonly error = signal('');
  readonly saving = signal(false);
  readonly importing = signal(0);
  readonly ringing = signal<Ringing | null>(null);
  beforeReload: () => boolean | Promise<boolean> = () => true;
  readonly confirmation = signal<{ text: string; resolve: (answer: boolean) => void } | null>(null);
  readonly notifications = signal<Array<{ id: string; title: string; body: string; at: Date }>>([]);
  private timer?: ReturnType<typeof setInterval>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private audio?: AudioContext;
  private lastTick = Date.now();
  private saveFailures = false;
  async initialize(): Promise<void> {
    try {
      this.data.set(await this.storage.load());
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
    } catch (e) {
      this.error.set(this.describe(e));
    }
  }
  update(mutate: (data: OsData) => void): void {
    const old = this.data();
    if (!old) return;
    const next = structuredClone(old);
    mutate(next);
    this.data.set(next);
    this.persist(next);
  }
  private persist(next: OsData): void {
    this.saving.set(true);
    void this.storage
      .save(next)
      .then(
        () => {
          this.saveFailures = false;
        },
        (e) => {
          this.saveFailures = true;
          this.feedback(this.describe(e));
        },
      )
      .finally(() => this.saving.set(false));
  }
  feedback(text: string): void {
    this.message.set(text);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.message.set(''), 5500);
  }
  confirm(text: string): Promise<boolean> {
    this.confirmation()?.resolve(false);
    return new Promise((resolve) => this.confirmation.set({ text, resolve }));
  }
  answer(value: boolean): void {
    const pending = this.confirmation();
    this.confirmation.set(null);
    pending?.resolve(value);
  }
  notify(title: string, body: string): void {
    this.notifications.update((n) =>
      [{ id: crypto.randomUUID(), title, body, at: new Date() }, ...n].slice(0, 30),
    );
    this.feedback(`${title}: ${body}`);
    this.beep();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator)
        void navigator.serviceWorker
          .getRegistration()
          .then((r) => {
            if (r)
              void r
                .showNotification(title, { body, icon: 'assets/icons/icon-192.png' })
                .catch(() => undefined);
            else
              try {
                new Notification(title, { body });
              } catch {
                /* platform does not support constructors */
              }
          })
          .catch(() => undefined);
      else
        try {
          new Notification(title, { body });
        } catch {
          /* in-app notification remains */
        }
    }
  }
  async requestNotifications(): Promise<void> {
    if (typeof Notification === 'undefined') {
      this.feedback('Browser notifications are unsupported. In-app alerts still work.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      this.feedback(`Notifications: ${result}. Alarms require an open browser.`);
    } catch {
      this.feedback('Notification permission is unavailable in this browser.');
    }
  }
  unlockAudio(): void {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
    } catch {
      /* unsupported audio; visual alerts remain */
    }
  }
  private beep(): void {
    const s = this.data()?.settings;
    if (!s) return;
    if (s.vibration && s.profile !== 'Silent' && 'vibrate' in navigator)
      navigator.vibrate(s.profile === 'Meeting' ? [150, 100, 150] : 200);
    if (
      !s.sound ||
      s.profile === 'Silent' ||
      s.profile === 'Meeting' ||
      this.audio?.state !== 'running'
    )
      return;
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 740;
    gain.gain.value = s.profile === 'Outdoor' ? 0.24 : 0.08;
    oscillator.connect(gain);
    gain.connect(this.audio.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.5);
    oscillator.stop(this.audio.currentTime + 0.6);
  }
  checkAlarms(now: Date): void {
    const data = this.data();
    if (!data) return;
    const key = localMinuteKey(now);
    for (const alarm of data.alarms) {
      const due = alarmDue(alarm, now);
      if (due && alarm.lastTriggered !== key) {
        this.update((d) => {
          const a = d.alarms.find((item) => item.id === alarm.id)!;
          a.lastTriggered = key;
          delete a.snoozeUntil;
          if (!a.repeat?.length) a.enabled = false;
        });
        if (!this.ringing()) this.ringing.set({ id: alarm.id, label: alarm.label, kind: 'alarm' });
        this.notify('Alarm', alarm.label);
      }
    }
    for (const event of data.events) {
      const due = eventTimestamp(event);
      if (
        event.reminder &&
        !event.remindedAt &&
        due <= now.getTime() &&
        due > this.lastTick - 1000 &&
        now.getTime() - due < 300000
      ) {
        this.update((d) => {
          const item = d.events.find((e) => e.id === event.id);
          if (item) item.remindedAt = now.toISOString();
        });
        this.notify('Calendar reminder', event.title);
      }
    }
  }
  stopAlarm(): void {
    this.ringing.set(null);
  }
  snooze(): void {
    const current = this.ringing();
    if (current?.kind === 'alarm')
      this.update((d) => {
        const alarm = d.alarms.find((a) => a.id === current.id);
        if (alarm) {
          alarm.enabled = true;
          alarm.snoozeUntil = Date.now() + 5 * 60000;
        }
      });
    this.ringing.set(null);
    this.feedback('Snoozed for 5 minutes. Keep the browser open.');
  }
  private tick(): void {
    const now = new Date();
    this.now.set(now);
    this.checkAlarms(now);
    this.lastTick = now.getTime();
  }
  async flush(): Promise<void> {
    if (this.importing())
      throw new Error('An import is still finishing. Wait before reloading or updating.');
    await this.storage.flush();
    if (this.saveFailures)
      throw new Error('Some changes are not saved. Export a backup before reloading.');
  }
  async retrySave(): Promise<void> {
    const d = this.data();
    if (d) {
      try {
        await this.storage.save(d);
        this.saveFailures = false;
        this.storage.warning.set('');
        this.feedback('Saved successfully.');
      } catch (e) {
        this.feedback(this.describe(e));
      }
    }
  }
  async importMedia(meta: MediaItem, blob: Blob): Promise<void> {
    this.importing.update((count) => count + 1);
    try {
      await this.storeImportedMedia(meta, blob);
    } finally {
      this.importing.update((count) => count - 1);
    }
  }
  private async storeImportedMedia(meta: MediaItem, blob: Blob): Promise<void> {
    // Detach file-system-backed File objects before IndexedDB (notably WebKit).
    // Use the catalogue MIME so unknown-type files also round-trip through backups.
    const storedBlob = new Blob([await blob.arrayBuffer()], { type: meta.type });
    const old = this.data();
    if (!old) throw new Error('Storage is not ready.');
    const next = structuredClone(old);
    next.media.push(meta);
    this.data.set(next);
    try {
      await this.storage.save(next, { put: { id: meta.id, blob: storedBlob } });
    } catch (e) {
      this.feedback(
        'File retained in this session. Export a backup or retry saving before closing.',
      );
      throw e;
    }
  }
  async deleteMedia(id: string): Promise<void> {
    const old = this.data();
    if (!old) return;
    const next = structuredClone(old);
    next.media = next.media.filter((m) => m.id !== id);
    next.tracks = next.tracks.filter((t) => (t.mediaId ?? t.id) !== id);
    this.data.set(next);
    try {
      await this.storage.save(next, { delete: id });
    } catch (e) {
      this.update((current) => {
        for (const media of old.media.filter((m) => m.id === id))
          if (!current.media.some((m) => m.id === id)) current.media.push(media);
        for (const track of old.tracks.filter((t) => (t.mediaId ?? t.id) === id))
          if (!current.tracks.some((t) => t.id === track.id)) current.tracks.push(track);
      });
      this.feedback(this.describe(e));
      throw e;
    }
  }
  async exportBackup(): Promise<void> {
    if (this.importing())
      throw new Error('Wait for the active file import to finish before exporting a backup.');
    const data = this.data();
    if (!data) return;
    const estimatedSize =
      JSON.stringify(data).length +
      data.media.reduce((size, item) => size + Math.ceil((item.size * 4) / 3) + 500, 0);
    if (estimatedSize > 150 * 1024 * 1024)
      throw new Error(
        'This library exceeds the 150 MB backup limit. Export large files individually from Files, then create a smaller backup.',
      );
    await this.storage.flush().catch(() => undefined);
    const blobs = [];
    for (const m of data.media) {
      const blob = await this.storage.getBlob(m.id);
      if (!blob)
        throw new Error(
          `Cannot back up missing file: ${m.name}. Keep the original installation and recover files before resetting.`,
        );
      blobs.push({ id: m.id, type: m.type, base64: await blobBase64(blob) });
    }
    downloadText(
      JSON.stringify({ format: 'feature-os', version: 2, data, blobs }),
      `feature-os-${localDate(new Date())}.json`,
      'application/json',
    );
    this.feedback('Backup exported, including imported files.');
  }
  async restoreBackup(text: string): Promise<void> {
    if (text.length > 150 * 1024 * 1024) throw new Error('Backup exceeds the 150 MB import limit.');
    const backup: unknown = JSON.parse(text);
    if (
      !backup ||
      typeof backup !== 'object' ||
      !('format' in backup) ||
      backup.format !== 'feature-os' ||
      !('version' in backup) ||
      backup.version !== 2 ||
      !('data' in backup) ||
      !('blobs' in backup) ||
      !Array.isArray(backup.blobs)
    )
      throw new Error('Not a supported Feature OS 2 backup.');
    const data = validateData(backup.data);
    const blobs: Array<{ id: string; blob: Blob }> = [];
    const ids = new Set<string>();
    for (const value of backup.blobs) {
      if (
        !value ||
        typeof value !== 'object' ||
        typeof value.id !== 'string' ||
        typeof value.base64 !== 'string' ||
        typeof value.type !== 'string' ||
        ids.has(value.id) ||
        !data.media.some((m) => m.id === value.id)
      )
        throw new Error('Invalid backup file entry.');
      const bytes = Uint8Array.from(atob(value.base64), (c) => c.charCodeAt(0));
      const meta = data.media.find((m) => m.id === value.id)!;
      if (
        bytes.length !== meta.size ||
        bytes.length > 150 * 1024 * 1024 ||
        value.type !== meta.type
      )
        throw new Error('Backup file size does not match.');
      ids.add(value.id);
      blobs.push({ id: value.id, blob: new Blob([bytes], { type: value.type }) });
    }
    if (
      data.media.some((m) => !ids.has(m.id)) ||
      data.tracks.some((t) => !ids.has(t.mediaId ?? t.id))
    )
      throw new Error('Backup is missing imported files.');
    if (
      !(await this.confirm(
        'Replace all local data with this validated backup? Export your current data first.',
      ))
    )
      return;
    await this.storage.save(data, { replace: blobs });
    this.data.set(data);
    this.feedback('Backup restored.');
  }
  async reset(): Promise<void> {
    if (
      !(await this.confirm(
        'Erase contacts, messages, notes, events and imported files? This cannot be undone. Export a backup first.',
      ))
    )
      return;
    const data = seedData();
    await this.storage.save(data, { replace: [] });
    try {
      localStorage.removeItem('feature-phone-os:current');
    } catch {
      /* unavailable */
    }
    this.data.set(data);
    this.error.set('');
    this.feedback('Local data reset to samples.');
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1000);
  }
  describe(e: unknown): string {
    return e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
      ? e.message
      : 'The operation failed. Your existing data has been retained.';
  }
  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearTimeout(this.toastTimer);
    void this.audio?.close();
    this.confirmation()?.resolve(false);
  }
}
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
async function blobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
