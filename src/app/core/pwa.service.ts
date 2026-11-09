import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { OsStateService } from './os-state.service';
interface InstallEvent extends Event {
  prompt(): Promise<{ outcome: string }>;
}
@Injectable({ providedIn: 'root' })
export class PwaService implements OnDestroy {
  readonly updateReady = signal(false);
  readonly offlineReady = signal(false);
  readonly online = signal(navigator.onLine);
  readonly installAvailable = signal(false);
  readonly standalone = signal(matchMedia('(display-mode: standalone)').matches);
  private readonly os = inject(OsStateService);
  private readonly sw = inject(SwUpdate);
  private prompt?: InstallEvent;
  private readonly onInstall = (e: Event) => {
    e.preventDefault();
    this.prompt = e as InstallEvent;
    this.installAvailable.set(true);
  };
  private readonly onInstalled = () => {
    this.installAvailable.set(false);
    this.standalone.set(true);
    this.os.feedback('Feature OS installed.');
  };
  private readonly onOnline = () => this.online.set(navigator.onLine);
  private subscription = this.sw.versionUpdates.subscribe((event) => {
    if (event.type === 'VERSION_READY') this.updateReady.set(true);
    if (event.type === 'VERSION_INSTALLATION_FAILED')
      this.os.feedback('Update download failed. Your current version is still available.');
  });
  constructor() {
    window.addEventListener('beforeinstallprompt', this.onInstall);
    window.addEventListener('appinstalled', this.onInstalled);
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOnline);
    if (this.sw.isEnabled && 'serviceWorker' in navigator)
      void navigator.serviceWorker.ready.then(async () => {
        try {
          await this.sw.checkForUpdate();
          this.offlineReady.set(true);
        } catch {
          this.offlineReady.set(Boolean(navigator.serviceWorker.controller));
        }
      });
  }
  async install(): Promise<void> {
    if (this.prompt) {
      await this.prompt.prompt();
      this.prompt = undefined;
      this.installAvailable.set(false);
    } else
      this.os.feedback(
        'Install: Chrome/Edge menu → Install app. On iPhone/iPad: Safari → Share → Add to Home Screen. First load needs internet.',
      );
  }
  async check(): Promise<void> {
    if (!this.sw.isEnabled) {
      this.os.feedback('Updates and offline caching are enabled in the production build.');
      return;
    }
    try {
      const found = await this.sw.checkForUpdate();
      this.os.feedback(found ? 'Update is downloading.' : 'You have the latest available version.');
    } catch {
      this.os.feedback('Could not check updates. Your cached version remains available.');
    }
  }
  async reload(): Promise<void> {
    if (
      !(await this.os.confirm(
        'Save data and reload to install the update? Active calls, playback and games will stop.',
      ))
    )
      return;
    try {
      if (!(await this.os.beforeReload())) {
        this.os.feedback('Finish the highlighted form before updating. Your edits are still here.');
        return;
      }
      await this.os.flush();
      location.reload();
    } catch (e) {
      this.os.feedback(this.os.describe(e));
    }
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    window.removeEventListener('beforeinstallprompt', this.onInstall);
    window.removeEventListener('appinstalled', this.onInstalled);
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOnline);
  }
}
