import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DeviceShellComponent } from './device-shell.component';
import { OsStateService } from '../core/os-state.service';
import { OsStorageService } from '../core/os-storage.service';
import { PwaService } from '../core/pwa.service';
import { emptyData } from '../core/data';
import { FeatureController } from '../core/feature-contract';
describe('Device input and contextual actions', () => {
  let shell: DeviceShellComponent;
  let os: OsStateService;
  const storage = {
    mode: signal('indexeddb'),
    warning: signal(''),
    load: async () => emptyData(),
    save: async () => undefined,
    flush: async () => undefined,
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeviceShellComponent],
      providers: [
        { provide: OsStorageService, useValue: storage },
        {
          provide: PwaService,
          useValue: {
            offlineReady: signal(false),
            online: signal(true),
            installAvailable: signal(false),
            updateReady: signal(false),
            install: async () => undefined,
          },
        },
      ],
    });
    os = TestBed.inject(OsStateService);
    os.data.set(emptyData());
    spyOn(os, 'initialize').and.resolveTo();
    spyOn(os, 'unlockAudio');
    const fixture = TestBed.createComponent(DeviceShellComponent);
    shell = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('wraps launcher navigation and restores launcher selection after home', () => {
    shell.press('left');
    expect(shell.nav.launcherIndex()).toBe(12);
    shell.press('center');
    expect(shell.nav.screen()).toBe('settings');
    shell.press('end');
    expect(shell.nav.screen()).toBe('home');
    expect(shell.nav.launcherIndex()).toBe(12);
  });
  it('dispatches the advertised soft action rather than a generic option', () => {
    const action = jasmine.createSpy('action');
    const feature: FeatureController = { left: { label: 'Save', run: action } };
    spyOnProperty(shell, 'feature', 'get').and.returnValue(feature);
    shell.nav.screen.set('notes');
    expect(shell.left.label).toBe('Save');
    shell.press('soft-left');
    expect(action).toHaveBeenCalledTimes(1);
  });
  it('answers confirmations with keypad keys without invoking app actions', async () => {
    const pending = os.confirm('Delete?');
    shell.press('soft-right');
    expect(await pending).toBeFalse();
    expect(os.confirmation()).toBeNull();
  });
  it('keeps native editing keys and browser shortcuts unclaimed', () => {
    const field = document.createElement('textarea');
    document.body.append(field);
    const event = new KeyboardEvent('keydown', { key: '2', cancelable: true, bubbles: true });
    field.addEventListener('keydown', (e) => shell.keyboard(e));
    field.dispatchEvent(event);
    expect(event.defaultPrevented).toBeFalse();
    field.remove();
  });
  it('lets End stop an alarm before navigating away', () => {
    shell.nav.screen.set('notes');
    os.ringing.set({ id: 'a', kind: 'alarm', label: 'Wake' });
    shell.press('end');
    expect(os.ringing()).toBeNull();
    expect(shell.nav.screen()).toBe('notes');
  });
});
