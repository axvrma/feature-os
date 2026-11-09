import { CommonModule, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Type,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClockToolsService } from '../core/clock-tools.service';
import { downloadText } from '../core/data';
import { OS_APPS } from '../core/app-registry';
import { FeatureController, SoftAction } from '../core/feature-contract';
import { localDateKey } from '../core/time-utils';
import { MultiTapEditor, previousGrapheme } from '../core/input/multi-tap';
import { KeypadService } from '../core/keypad.service';
import { moveGrid, OsNavigationService } from '../core/navigation.service';
import { KeypadKey, OsAppId } from '../core/os-models';
import { OsStateService } from '../core/os-state.service';
import { PwaService } from '../core/pwa.service';
@Component({
  selector: 'os-device-shell',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  templateUrl: './device-shell.component.html',
  styleUrl: './device-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class DeviceShellComponent {
  readonly clockTools = inject(ClockToolsService);
  readonly os = inject(OsStateService);
  readonly nav = inject(OsNavigationService);
  readonly keypad = inject(KeypadService);
  readonly pwa = inject(PwaService);
  readonly apps = OS_APPS;
  readonly component = signal<Type<unknown> | null>(null);
  readonly appLoading = signal(false);
  readonly appError = signal('');
  readonly showNotifications = signal(false);
  readonly keys: Array<{ key: KeypadKey; digit: string; letters: string }> = [
    { key: '1', digit: '1', letters: '.,?!' },
    { key: '2', digit: '2', letters: 'abc' },
    { key: '3', digit: '3', letters: 'def' },
    { key: '4', digit: '4', letters: 'ghi' },
    { key: '5', digit: '5', letters: 'jkl' },
    { key: '6', digit: '6', letters: 'mno' },
    { key: '7', digit: '7', letters: 'pqrs' },
    { key: '8', digit: '8', letters: 'tuv' },
    { key: '9', digit: '9', letters: 'wxyz' },
    { key: 'star', digit: '*', letters: 'symbols' },
    { key: '0', digit: '0', letters: 'space' },
    { key: 'hash', digit: '#', letters: 'case' },
  ];
  @ViewChild(NgComponentOutlet) outlet?: NgComponentOutlet;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly editor = new MultiTapEditor();
  private lastControl?: HTMLElement;
  private activeInput?: HTMLInputElement | HTMLTextAreaElement;
  private loadToken = 0;
  constructor() {
    this.os.beforeReload = () => this.feature?.prepareReload?.() ?? true;
    void this.os.initialize();
    this.keypad.keys$.pipe(takeUntilDestroyed()).subscribe((key) => this.dispatch(key));
    effect(() => {
      const screen = this.nav.screen();
      this.editor.reset();
      this.lastControl = undefined;
      this.activeInput = undefined;
      this.showNotifications.set(false);
      if (screen === 'home') {
        this.component.set(null);
        queueMicrotask(() => this.focusLauncher());
      } else void this.load(screen);
    });
    effect(() => {
      if (this.os.confirmation() || this.os.ringing())
        queueMicrotask(() =>
          this.host.nativeElement
            .querySelector<HTMLElement>('[role=dialog] button,[role=alertdialog] button')
            ?.focus(),
        );
    });
    effect(() => {
      const settings = this.os.data()?.settings;
      if (settings) {
        document.body.dataset['theme'] = settings.theme;
        document.body.dataset['colorTheme'] = settings.colorTheme;
      }
    });
    inject(DestroyRef).onDestroy(() => {
      void this.os.storage.flush().catch(() => undefined);
    });
  }
  get feature(): FeatureController | undefined {
    return this.outlet?.componentInstance as FeatureController | undefined;
  }
  get title(): string {
    return this.apps.find((app) => app.id === this.nav.screen())?.title ?? 'Feature OS';
  }
  get left(): SoftAction {
    return this.nav.screen() === 'home'
      ? {
          label: this.shortcutTitle('left'),
          run: () => this.open(this.os.data()!.settings.launcherActions.left),
        }
      : (this.feature?.left ?? { label: 'Select', run: () => this.activate() });
  }
  get center(): SoftAction {
    if (this.nav.screen() === 'home') return { label: 'Open', run: () => this.launch() };
    const control = this.validControl();
    if (control)
      return {
        label: control.matches('input,textarea,select') ? 'Edit' : 'Select',
        run: () => this.activate(),
      };
    return this.feature?.center ?? { label: 'Select', run: () => this.activate() };
  }
  get right(): SoftAction {
    return this.nav.screen() === 'home'
      ? {
          label: this.shortcutTitle('right'),
          run: () => this.open(this.os.data()!.settings.launcherActions.right),
        }
      : (this.feature?.right ?? { label: 'Back', run: () => this.back() });
  }
  shortcutTitle(side: 'left' | 'right'): string {
    return (
      this.apps.find((a) => a.id === this.os.data()?.settings.launcherActions[side])?.title ??
      'Open'
    );
  }
  open(app: OsAppId): void {
    this.nav.launcherIndex.set(this.apps.findIndex((a) => a.id === app));
    this.nav.open(app);
  }
  launch(): void {
    this.open(this.apps[this.nav.launcherIndex()]?.id ?? 'dialer');
  }
  press(key: KeypadKey): void {
    this.os.unlockAudio();
    this.keypad.press(key);
  }
  @HostListener('window:keydown', ['$event']) keyboard(event: KeyboardEvent): void {
    if (event.key === 'Tab' && (this.os.confirmation() || this.os.ringing())) {
      const buttons = Array.from(
        this.host.nativeElement.querySelectorAll<HTMLButtonElement>(
          '[role=dialog] button,[role=alertdialog] button',
        ),
      );
      if (buttons.length) {
        event.preventDefault();
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
      return;
    }
    const key = this.keypad.mapKeyboard(event);
    if (!key) return;
    event.preventDefault();
    this.press(key);
  }
  @HostListener('window:pagehide') pagehide(): void {
    void this.os.storage.flush().catch(() => undefined);
  }
  @HostListener('focusin', ['$event']) focused(event: FocusEvent): void {
    const el = event.target;
    if (el instanceof HTMLElement && el.closest('.app-viewport')) {
      this.lastControl = el;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (this.activeInput !== el) this.editor.reset();
        this.activeInput = el;
      }
    }
  }
  private dispatch(key: KeypadKey): void {
    if (this.os.confirmation()) {
      if (key === 'end' || key === 'back' || key === 'soft-right') this.os.answer(false);
      else if (key === 'center' || key === 'soft-left') this.os.answer(true);
      else if (['up', 'down', 'left', 'right'].includes(key))
        this.moveFocus(key === 'up' || key === 'left' ? -1 : 1, '.confirm-dialog');
      return;
    }
    if (this.os.ringing()) {
      if (key === 'soft-left') this.os.snooze();
      else if (['center', 'soft-right', 'end', 'back'].includes(key)) this.os.stopAlarm();
      return;
    }
    if (key === 'end') {
      this.nav.home();
      return;
    }
    if (this.showNotifications()) {
      if (['back', 'soft-right'].includes(key)) {
        this.showNotifications.set(false);
        return;
      }
      if (key === 'center') {
        this.activate();
        return;
      }
      if (['up', 'down', 'left', 'right'].includes(key)) {
        this.moveFocus(key === 'up' || key === 'left' ? -1 : 1, '.notification-list');
        return;
      }
    }
    if (key === 'soft-left') {
      if (this.showNotifications()) this.showNotifications.set(false);
      else this.left.run();
      return;
    }
    if (key === 'soft-right') {
      if (this.showNotifications()) this.showNotifications.set(false);
      else this.right.run();
      return;
    }
    if (this.nav.screen() === 'home') {
      if (['up', 'down', 'left', 'right'].includes(key)) {
        this.nav.launcherIndex.set(
          moveGrid(
            this.nav.launcherIndex(),
            key as 'up' | 'down' | 'left' | 'right',
            this.apps.length,
          ),
        );
        this.focusLauncher();
      } else if (key === 'center') this.launch();
      else if (key === 'call') this.open('dialer');
      else if (/^\d$/.test(key)) {
        this.nav.open('dialer', { phone: key });
      }
      return;
    }
    const control = this.validControl();
    if (
      (/^\d$/.test(key) || ['star', 'hash', 'back'].includes(key)) &&
      control &&
      (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) &&
      !['checkbox', 'range', 'file', 'date', 'time', 'number'].includes(control.type)
    ) {
      const numeric =
        control.type === 'tel' ||
        control.hasAttribute('data-keypad-numeric') ||
        control.inputMode === 'numeric' ||
        !this.os.data()?.settings.multiTap;
      const start = control.selectionStart ?? control.value.length;
      const end = control.selectionEnd ?? start;
      const edit = this.editor.apply(control.value, start, end, key, Date.now(), numeric);
      control.value = edit.value;
      try {
        control.setSelectionRange(edit.cursor, edit.cursor);
      } catch {
        /* type restrictions */
      }
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.focus();
      return;
    }
    if (control instanceof HTMLSelectElement && ['up', 'down'].includes(key)) {
      control.selectedIndex =
        (control.selectedIndex + (key === 'up' ? -1 : 1) + control.options.length) %
        control.options.length;
      control.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (
      control instanceof HTMLInputElement &&
      control.type === 'number' &&
      ['up', 'down'].includes(key)
    ) {
      if (key === 'up') control.stepUp();
      else control.stepDown();
      control.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (
      control instanceof HTMLInputElement &&
      control.type === 'range' &&
      ['left', 'right'].includes(key)
    ) {
      if (key === 'right') control.stepUp();
      else control.stepDown();
      control.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (
      control instanceof HTMLInputElement &&
      ['date', 'time'].includes(control.type) &&
      ['up', 'down'].includes(key)
    ) {
      const delta = key === 'up' ? 1 : -1;
      if (control.type === 'time') {
        const [hour, minute] = (control.value || '00:00').split(':').map(Number);
        const total = (hour * 60 + minute + delta + 1440) % 1440;
        control.value = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      } else {
        const date = new Date(`${control.value || localDateKey(new Date())}T12:00`);
        date.setDate(date.getDate() + delta);
        control.value = localDateKey(date);
      }
      control.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (
      (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) &&
      control.selectionStart !== null &&
      ['left', 'right'].includes(key)
    ) {
      const cursor = control.selectionStart ?? 0;
      this.editor.reset();
      const next =
        key === 'left'
          ? previousGrapheme(control.value, cursor)
          : Math.min(
              control.value.length,
              cursor + (Array.from(control.value.slice(cursor))[0]?.length ?? 1),
            );
      control.setSelectionRange(next, next);
      control.focus();
      return;
    }
    if (key === 'center' && control) {
      this.activate();
      return;
    }
    if (this.feature?.key?.(key)) return;
    if (key === 'center') {
      if (this.feature?.center) this.feature.center.run();
      else this.activate();
      return;
    }
    if (['up', 'down', 'left', 'right'].includes(key)) {
      this.editor.reset();
      this.moveFocus(key === 'up' || key === 'left' ? -1 : 1);
      return;
    }
    if (key === 'back') this.nav.back();
  }
  private validControl(): HTMLElement | undefined {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active.closest('.app-viewport') &&
      active.offsetParent !== null &&
      !active.hasAttribute('disabled')
    )
      return active;
    if (
      this.lastControl?.isConnected &&
      this.lastControl.offsetParent !== null &&
      !this.lastControl.hasAttribute('disabled')
    )
      return this.lastControl;
    return undefined;
  }
  private activate(): void {
    const control = this.validControl() ?? this.controls()[0];
    if (!control) return;
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement
    ) {
      control.focus();
      if (
        (control instanceof HTMLSelectElement ||
          (control instanceof HTMLInputElement && ['date', 'time'].includes(control.type))) &&
        'showPicker' in control
      ) {
        try {
          control.showPicker();
        } catch {
          /* D-pad changes selects; native editing remains available */
        }
      }
      if (
        control instanceof HTMLInputElement &&
        ['checkbox', 'radio', 'file'].includes(control.type)
      )
        control.click();
    } else control.click();
  }
  private controls(scope = '.app-viewport'): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        `${scope} button,${scope} input,${scope} textarea,${scope} select,${scope} a[href],[role="dialog"] button`,
      ),
    ).filter((e) => !e.hasAttribute('disabled') && e.offsetParent !== null && e.tabIndex !== -1);
  }
  private moveFocus(delta: number, scope = '.app-viewport'): void {
    const controls = this.controls(scope);
    if (!controls.length) return;
    const active = this.validControl() ?? document.activeElement;
    const index = controls.indexOf(active as HTMLElement);
    const next =
      controls[(index + (index < 0 && delta < 0 ? 0 : delta) + controls.length) % controls.length];
    this.lastControl = next;
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  private back(): void {
    if (!this.feature?.key?.('back')) this.nav.back();
  }
  private focusLauncher(): void {
    this.host.nativeElement
      .querySelector<HTMLElement>(`[data-app-index="${this.nav.launcherIndex()}"]`)
      ?.focus({ preventScroll: true });
    this.host.nativeElement
      .querySelector<HTMLElement>(`[data-app-index="${this.nav.launcherIndex()}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  private async load(id: OsAppId): Promise<void> {
    const token = ++this.loadToken;
    this.component.set(null);
    this.appError.set('');
    this.appLoading.set(true);
    try {
      let component: Type<unknown>;
      switch (id) {
        case 'dialer':
        case 'contacts':
        case 'messages': {
          const m = await import('../features/communications');
          component =
            id === 'dialer'
              ? m.PhoneComponent
              : id === 'contacts'
                ? m.ContactsComponent
                : m.MessagesComponent;
          break;
        }
        case 'clock':
        case 'calculator':
        case 'calendar':
        case 'notes':
        case 'snake': {
          const m = await import('../features/productivity');
          component = {
            clock: m.ClockComponent,
            calculator: m.CalculatorComponent,
            calendar: m.CalendarComponent,
            notes: m.NotesComponent,
            snake: m.SnakeComponent,
          }[id];
          break;
        }
        case 'music':
        case 'gallery':
        case 'files': {
          const m = await import('../features/media');
          component = {
            music: m.MusicComponent,
            gallery: m.GalleryComponent,
            files: m.FilesComponent,
          }[id];
          break;
        }
        case 'profiles':
        case 'settings': {
          const m = await import('../features/system');
          component = id === 'profiles' ? m.ProfilesComponent : m.SettingsComponent;
          break;
        }
      }
      if (token === this.loadToken && this.nav.screen() === id) this.component.set(component);
    } catch (e) {
      if (token === this.loadToken)
        this.appError.set(`Could not open this application. ${this.os.describe(e)}`);
    } finally {
      if (token === this.loadToken) this.appLoading.set(false);
    }
  }
  unread(): number {
    return (
      this.os
        .data()
        ?.threads.reduce(
          (count, t) => count + t.messages.filter((m) => !m.mine && !m.read).length,
          0,
        ) ?? 0
    );
  }
  async recoveryExport(): Promise<void> {
    downloadText(await this.os.storage.recovery(), 'feature-os-recovery.json', 'application/json');
  }
  retry(): void {
    const id = this.nav.screen();
    if (id !== 'home') void this.load(id);
  }
}
