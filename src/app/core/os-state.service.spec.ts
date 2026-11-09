import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { emptyData } from './data';
import { OsData } from './os-models';
import { OsStateService } from './os-state.service';
import { OsStorageService } from './os-storage.service';
describe('Shared OS state', () => {
  let service: OsStateService;
  let current: OsData;
  const storage = {
    mode: signal('indexeddb'),
    warning: signal(''),
    load: async () => emptyData(),
    save: jasmine.createSpy('save').and.callFake(async (d: OsData) => {
      current = structuredClone(d);
    }),
    flush: async () => undefined,
    getBlob: async () => undefined,
  };
  beforeEach(() => {
    storage.save.calls.reset();
    TestBed.configureTestingModule({
      providers: [{ provide: OsStorageService, useValue: storage }],
    });
    service = TestBed.inject(OsStateService);
    service.data.set(emptyData());
  });
  afterEach(() => service.ngOnDestroy());
  it('detaches imported Files and normalizes missing MIME for durable backup', async () => {
    const meta = {
      id: 'unknown',
      name: 'local.data',
      kind: 'file' as const,
      type: 'application/octet-stream',
      size: 3,
      createdAt: new Date().toISOString(),
    };
    await service.importMedia(meta, new File(['abc'], 'local.data'));
    const change = storage.save.calls.mostRecent().args[1] as { put: { blob: Blob } };
    expect(service.importing()).toBe(0);
    expect(change.put.blob instanceof File).toBeFalse();
    expect(change.put.blob.type).toBe(meta.type);
    expect(await change.put.blob.text()).toBe('abc');
  });
  it('updates immutable state and persists profiles/preferences', async () => {
    const previous = service.data();
    service.update((d) => {
      d.settings.profile = 'Meeting';
      d.settings.theme = 'dark';
    });
    await service.flush();
    expect(service.data()).not.toBe(previous);
    expect(previous?.settings.profile).toBe('General');
    expect(current.settings.profile).toBe('Meeting');
    expect(current.settings.theme).toBe('dark');
  });
  it('triggers a one-shot alarm once, disables it and supports snooze', fakeAsync(() => {
    const date = new Date(2026, 10, 9, 7, 30, 0);
    service.update((d) => d.alarms.push({ id: 'a', time: '07:30', label: 'Tea', enabled: true }));
    service.checkAlarms(date);
    expect(service.ringing()?.label).toBe('Tea');
    expect(service.data()?.alarms[0].enabled).toBeFalse();
    const count = service.notifications().length;
    service.checkAlarms(date);
    expect(service.notifications().length).toBe(count);
    service.snooze();
    expect(service.ringing()).toBeNull();
    expect(service.data()?.alarms[0].snoozeUntil).toBeGreaterThan(Date.now());
    tick(6000);
  }));
  it('does not ring a weekday alarm on another day', fakeAsync(() => {
    service.update((d) =>
      d.alarms.push({ id: 'a', time: '07:30', label: 'Weekday', enabled: true, repeat: [2] }),
    );
    service.checkAlarms(new Date(2026, 10, 9, 7, 30));
    expect(service.ringing()).toBeNull();
    tick(6000);
  }));
  it('requires a concrete answer for destructive confirmation', async () => {
    const pending = service.confirm('Delete?');
    expect(service.confirmation()?.text).toBe('Delete?');
    service.answer(false);
    expect(await pending).toBeFalse();
    expect(service.confirmation()).toBeNull();
  });
  it('rejects an invalid backup before any state replacement', async () => {
    const before = service.data();
    await expectAsync(
      service.restoreBackup('{"format":"feature-os","version":999}'),
    ).toBeRejected();
    expect(service.data()).toBe(before);
    expect(storage.save).not.toHaveBeenCalled();
  });
  it('validates backup records and replaces only after confirmation', async () => {
    const d = emptyData();
    d.settings.theme = 'classic';
    const pending = service.restoreBackup(
      JSON.stringify({ format: 'feature-os', version: 2, data: d, blobs: [] }),
    );
    await Promise.resolve();
    service.answer(true);
    await pending;
    expect(service.data()?.settings.theme).toBe('classic');
  });
  it('restores validated binary content with matching metadata atomically', async () => {
    const d = emptyData();
    d.media = [
      {
        id: 'file',
        name: 'test.txt',
        kind: 'file',
        type: 'text/plain',
        size: 3,
        createdAt: new Date().toISOString(),
      },
    ];
    const pending = service.restoreBackup(
      JSON.stringify({
        format: 'feature-os',
        version: 2,
        data: d,
        blobs: [{ id: 'file', type: 'text/plain', base64: 'YWJj' }],
      }),
    );
    await Promise.resolve();
    service.answer(true);
    await pending;
    const change = storage.save.calls.mostRecent().args[1] as {
      replace: Array<{ id: string; blob: Blob }>;
    };
    expect(await change.replace[0].blob.text()).toBe('abc');
    expect(current.media[0].id).toBe('file');
  });
  it('rejects binary metadata mismatches before asking to replace data', async () => {
    const d = emptyData();
    d.media = [
      {
        id: 'file',
        name: 'test.txt',
        kind: 'file',
        type: 'text/plain',
        size: 3,
        createdAt: new Date().toISOString(),
      },
    ];
    await expectAsync(
      service.restoreBackup(
        JSON.stringify({
          format: 'feature-os',
          version: 2,
          data: d,
          blobs: [{ id: 'file', type: 'image/svg+xml', base64: 'YWJj' }],
        }),
      ),
    ).toBeRejected();
    expect(service.confirmation()).toBeNull();
  });
  it('does not replace data when restore confirmation is canceled', async () => {
    const before = service.data();
    const pending = service.restoreBackup(
      JSON.stringify({ format: 'feature-os', version: 2, data: emptyData(), blobs: [] }),
    );
    await Promise.resolve();
    service.answer(false);
    await pending;
    expect(service.data()).toBe(before);
  });
});
