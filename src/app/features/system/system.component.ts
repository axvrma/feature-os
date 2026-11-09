import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OS_APPS } from '../../core/app-registry';
import { downloadText } from '../../core/data';
import { OsStateService } from '../../core/os-state.service';
import { OsSettings, ProfileId } from '../../core/os-models';
import { PwaService } from '../../core/pwa.service';
@Component({
  selector: 'os-profiles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule],
  template: ` <div class="stack">
    <p class="hint">
      Controls Feature OS alerts only. Your device’s system volume stays under your control.
    </p>
    @for (profile of profiles; track profile.id) {
      <button
        class="row"
        [class.selected]="os.data()!.settings.profile === profile.id"
        (click)="select(profile.id)"
      >
        <strong>{{ profile.id }}</strong
        ><small>{{ profile.description }}</small
        ><span aria-hidden="true">{{
          os.data()!.settings.profile === profile.id ? '●' : '○'
        }}</span>
      </button>
    }
    <p class="hint">
      Sound starts after a user interaction, when the browser permits playback. Vibration requires
      supported hardware and permission.
    </p>
  </div>`,
})
export class ProfilesComponent {
  readonly os = inject(OsStateService);
  readonly profiles: Array<{ id: ProfileId; description: string }> = [
    { id: 'General', description: 'Gentle audible alerts' },
    { id: 'Silent', description: 'Visual alerts only' },
    { id: 'Meeting', description: 'Visual alerts and optional vibration' },
    { id: 'Outdoor', description: 'Louder alerts and optional vibration' },
  ];
  select(profile: ProfileId): void {
    this.os.update((d) => (d.settings.profile = profile));
    this.os.feedback(`${profile} profile selected.`);
  }
}
@Component({
  selector: 'os-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule],
  template: ` <div class="stack">
    <section class="card stack">
      <h3>Make it yours</h3>
      <label
        >Appearance<select [ngModel]="settings.theme" (ngModelChange)="set('theme', $event)">
          <option value="light">Warm light</option>
          <option value="dark">Midnight</option>
          <option value="contrast">High contrast</option>
          <option value="classic">Classic monochrome</option>
        </select></label
      >
      <label
        >Accent<select [ngModel]="settings.colorTheme" (ngModelChange)="set('colorTheme', $event)">
          <option value="green">Juniper</option>
          <option value="cherry">Cherry</option>
          <option value="azure">Azure</option>
          <option value="violet">Violet</option>
        </select></label
      >
      <label
        >Wallpaper<select [ngModel]="settings.wallpaper" (ngModelChange)="set('wallpaper', $event)">
          <option value="dune">Quiet dunes</option>
          <option value="night">Night sky</option>
          <option value="plain">Plain</option>
        </select></label
      >
      <label
        >Text size<select [ngModel]="settings.fontSize" (ngModelChange)="set('fontSize', $event)">
          <option value="normal">Standard</option>
          <option value="large">Large</option>
        </select></label
      >
      <label class="check"
        ><input
          type="checkbox"
          [ngModel]="settings.immersive"
          (ngModelChange)="set('immersive', $event)"
        />Screen-focused mode</label
      >
      @for (side of sides; track side) {
        <label
          >{{ side === 'left' ? 'Left' : 'Right' }} home shortcut<select
            [ngModel]="settings.launcherActions[side]"
            (ngModelChange)="shortcut(side, $event)"
          >
            @for (app of apps; track app.id) {
              <option [value]="app.id">{{ app.title }}</option>
            }
          </select></label
        >
      }
    </section>
    <section class="card stack">
      <h3>Input & alerts</h3>
      <label class="check"
        ><input
          type="checkbox"
          [ngModel]="settings.multiTap"
          (ngModelChange)="set('multiTap', $event)"
        />Multi-tap on phone keypad</label
      >
      <p class="hint">
        2–9 cycle letters, 0 adds a space, 1 punctuation, * symbols, # changes case. Pause 900 ms to
        accept. Hardware text entry works normally.
      </p>
      <label class="check"
        ><input
          type="checkbox"
          [ngModel]="settings.sound"
          (ngModelChange)="set('sound', $event)"
        />In-app alert sounds</label
      >
      <label class="check"
        ><input
          type="checkbox"
          [ngModel]="settings.vibration"
          (ngModelChange)="set('vibration', $event)"
        />Simulated vibration, if supported</label
      >
      <label class="check"
        ><input
          type="checkbox"
          [ngModel]="settings.demoMode"
          (ngModelChange)="set('demoMode', $event)"
        />Enable local incoming call/message demos</label
      >
      <button (click)="os.requestNotifications()">Allow browser notifications</button>
      <p class="hint">
        Alarms and reminders require an open browser. They cannot wake a closed app.
      </p>
    </section>
    <section class="card stack">
      <h3>Local data</h3>
      <p class="hint">
        Saved using {{ os.storage.mode() }}. Contacts and imported content stay in this browser.
      </p>
      <p class="hint">{{ usage }}</p>
      <p class="error" *ngIf="os.storage.warning()">{{ os.storage.warning() }}</p>
      <button (click)="run(os.retrySave())">Retry saving</button
      ><button (click)="run(os.exportBackup())">Export complete backup</button>
      <label class="file-button"
        >Restore backup<input
          type="file"
          accept=".json,application/json"
          (change)="restore($event)"
      /></label>
      <button (click)="recovery()">Export recovery copies</button
      ><button (click)="persist()">Request durable storage</button>
      <button class="danger" (click)="run(os.reset())">Reset all data…</button>
      <p class="hint">
        Backups include imported files. Restore validates every record before requesting
        replacement.
      </p>
    </section>
    <section class="card stack">
      <h3>Install & updates</h3>
      <p>
        {{
          pwa.offlineReady()
            ? 'Offline app shell is ready.'
            : 'Load the production app online to prepare offline use.'
        }}
      </p>
      <button (click)="pwa.install()">
        {{ pwa.installAvailable() ? 'Install Feature OS' : 'Installation instructions' }}</button
      ><button (click)="pwa.check()">Check for updates</button
      ><button *ngIf="pwa.updateReady()" (click)="pwa.reload()">Save & update</button>
      <p class="hint">
        iPhone/iPad: Safari → Share → Add to Home Screen. Chrome/Edge: browser menu → Install app.
      </p>
    </section>
    <section class="card stack">
      <h3>Feature OS 2.0.0</h3>
      <p>A little more present.</p>
      <p class="hint">
        Original browser-based keypad phone. Calls and messages are local simulations. Device
        handoff opens your phone/SMS app only when requested. No sign-in, tracking or cloud account.
      </p>
    </section>
  </div>`,
})
export class SettingsComponent {
  readonly os = inject(OsStateService);
  readonly pwa = inject(PwaService);
  readonly apps = OS_APPS;
  readonly sides = ['left', 'right'] as const;
  usage = '';
  get settings(): OsSettings {
    return this.os.data()!.settings;
  }
  constructor() {
    if (navigator.storage?.estimate)
      void navigator.storage
        .estimate()
        .then(
          (e) =>
            (this.usage = `Origin storage: ${((e.usage ?? 0) / 1048576).toFixed(1)} MB used, ${((e.quota ?? 0) / 1048576).toFixed(0)} MB quota (shared with this site).`),
        )
        .catch(() => (this.usage = 'Storage estimate unavailable.'));
  }
  set<K extends keyof OsSettings>(key: K, value: OsSettings[K]): void {
    this.os.update((d) => (d.settings[key] = value));
  }
  shortcut(side: 'left' | 'right', value: OsSettings['launcherActions']['left']): void {
    this.os.update((d) => (d.settings.launcherActions[side] = value));
  }
  async run(task: Promise<void>): Promise<void> {
    try {
      await task;
    } catch (e) {
      this.os.feedback(this.os.describe(e));
    }
  }
  async restore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 150 * 1048576) {
      this.os.feedback('Backup exceeds 150 MB.');
      return;
    }
    await this.run(file.text().then((text) => this.os.restoreBackup(text)));
    input.value = '';
  }
  async recovery(): Promise<void> {
    try {
      downloadText(
        await this.os.storage.recovery(),
        'feature-os-recovery.json',
        'application/json',
      );
    } catch (e) {
      this.os.feedback(this.os.describe(e));
    }
  }
  async persist(): Promise<void> {
    const granted = await navigator.storage?.persist?.().catch(() => false);
    this.os.feedback(
      granted
        ? 'Durable storage granted. Keep backups for safety.'
        : 'Browser did not grant durable storage. Export backups regularly.',
    );
  }
}
