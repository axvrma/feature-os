import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { OS_APPS } from './core/app-registry';
import { KeypadService } from './core/keypad.service';
import { OsStorageService } from './core/os-storage.service';
import {
  AlarmItem,
  ColorThemeId,
  Contact,
  KeypadKey,
  MessageThread,
  MusicTrack,
  NoteItem,
  OsAppDefinition,
  OsAppId,
  OsData,
  ProfileId,
  ThemeId,
} from './core/os-models';
import { Subscription } from 'rxjs';

type ScreenId = 'home' | OsAppId;
type ListApp = 'contacts' | 'messages' | 'clock' | 'notes' | 'music' | 'profiles' | 'settings';
type SettingsView = 'main' | 'theme' | 'theme-color' | 'launcher' | 'launcher-left' | 'launcher-right';
type LauncherSide = 'left' | 'right';
type PhoneView = 'dialer' | 'logs';
type ScreenTransition = 'idle' | 'opening' | 'closing';

interface SnakeState {
  running: boolean;
  paused: boolean;
  direction: 'up' | 'down' | 'left' | 'right';
  nextDirection: 'up' | 'down' | 'left' | 'right';
  body: Array<{ x: number; y: number }>;
  food: { x: number; y: number };
  score: number;
}

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('snakeCanvas') snakeCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('audioPlayer') audioPlayer?: ElementRef<HTMLAudioElement>;

  readonly apps = OS_APPS;
  readonly profiles: ProfileId[] = ['General', 'Silent', 'Meeting', 'Outdoor'];
  readonly themes: Array<{ id: ThemeId; label: string }> = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'contrast', label: 'High contrast' },
  ];
  readonly colorThemes: Array<{ id: ColorThemeId; label: string; icon: string }> = [
    { id: 'cherry', label: 'Cherry', icon: 'favorite' },
    { id: 'azure', label: 'Azure', icon: 'water_drop' },
    { id: 'violet', label: 'Violet', icon: 'auto_awesome' },
    { id: 'green', label: 'Green', icon: 'eco' },
  ];
  readonly settingsRows = [
    { id: 'theme', title: 'Theme', icon: 'format_paint', subTitle: 'Choose light, dark, or contrast' },
    { id: 'theme-color', title: 'Theme color', icon: 'palette', subTitle: 'Choose Cherry, Azure, Violet, or Green' },
    { id: 'launcher', title: 'Launcher icons', icon: 'tune', subTitle: 'Set left and right home actions' },
  ];
  readonly keypadNumbers: Array<{ key: KeypadKey; digit: string; label: string }> = [
    { key: '1', digit: '1', label: '.,?!' },
    { key: '2', digit: '2', label: 'abc' },
    { key: '3', digit: '3', label: 'def' },
    { key: '4', digit: '4', label: 'ghi' },
    { key: '5', digit: '5', label: 'jkl' },
    { key: '6', digit: '6', label: 'mno' },
    { key: '7', digit: '7', label: 'pqrs' },
    { key: '8', digit: '8', label: 'tuv' },
    { key: '9', digit: '9', label: 'wxyz' },
    { key: 'star', digit: '*', label: '+' },
    { key: '0', digit: '0', label: 'space' },
    { key: 'hash', digit: '#', label: 'shift' },
  ];

  data?: OsData;
  activeScreen: ScreenId = 'home';
  focusIndex = 0;
  listIndex: Record<ListApp, number> = {
    contacts: 0,
    messages: 0,
    clock: 0,
    notes: 0,
    music: 0,
    profiles: 0,
    settings: 0,
  };
  now = new Date();
  loading = true;
  alertText = '';

  dialNumber = '';
  callingNumber = '';
  contactsQuery = '';
  selectedContact?: Contact;
  selectedThread?: MessageThread;
  draftMessage = '';
  selectedNote?: NoteItem;
  noteDraftTitle = '';
  noteDraftBody = '';
  newAlarmTime = '07:30';
  newAlarmLabel = 'Alarm';
  selectedTrack?: MusicTrack;
  musicError = '';
  installPrompt?: { prompt: () => Promise<void> };
  settingsView: SettingsView = 'main';
  phoneView: PhoneView = 'dialer';
  phoneLogIndex = 0;
  controlFocusIndex = 0;
  screenTransition: ScreenTransition = 'idle';
  private lastT9Key?: KeypadKey;
  private lastT9At = 0;
  private lastT9Target?: string;
  private t9CycleIndex = 0;

  snake: SnakeState = this.createSnake();

  private readonly subs = new Subscription();
  private readonly trackUrls = new Map<string, string>();
  private clockTimer?: number;
  private snakeTimer?: number;
  private saveTimer?: number;
  private transitionTimer?: number;
  private activeScrollTimer?: number;
  private lastFocusedControl?: HTMLElement;

  constructor(
    private readonly storage: OsStorageService,
    public readonly keypad: KeypadService,
    private readonly host: ElementRef<HTMLElement>,
  ) {}

  async ngOnInit(): Promise<void> {
    this.data = await this.storage.load();
    this.prepareTrackUrls();
    this.applyTheme();
    this.loading = false;
    this.subs.add(this.keypad.keys$.subscribe((key) => this.handleKey(key)));
    this.clockTimer = window.setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.clearInterval(this.clockTimer);
    window.clearInterval(this.snakeTimer);
    window.clearTimeout(this.saveTimer);
    window.clearTimeout(this.transitionTimer);
    window.clearTimeout(this.activeScrollTimer);
    this.trackUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  @HostListener('window:keydown', ['$event'])
  onKeyboard(event: KeyboardEvent): void {
    const key = this.keypad.mapKeyboard(event);
    if (this.isTextEditing(event.target) && (!key || !this.isTextEditingKey(key, event.key))) {
      return;
    }
    if (key) {
      event.preventDefault();
      this.keypad.press(key);
    }
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.installPrompt = event as unknown as { prompt: () => Promise<void> };
  }

  get activeApp(): OsAppDefinition | undefined {
    return this.apps.find((app) => app.id === this.activeScreen);
  }

  get screenTitle(): string {
    return this.activeScreen === 'home' ? 'Feature OS' : this.activeApp?.title ?? 'App';
  }

  get profile(): ProfileId {
    return this.data?.settings.profile ?? 'General';
  }

  get theme(): ThemeId {
    return this.data?.settings.theme ?? 'light';
  }

  get colorTheme(): ColorThemeId {
    return this.data?.settings.colorTheme ?? 'cherry';
  }

  get softLeft(): string {
    if (this.activeScreen === 'home') return this.launcherActionLabel('left');
    if (this.activeScreen === 'dialer') return this.phoneView === 'dialer' ? 'Logs' : 'Dial';
    if (this.activeScreen === 'contacts') return 'Options';
    if (this.activeScreen === 'clock') return 'Add';
    if (this.activeScreen === 'notes') return this.selectedNote ? 'Save' : 'New';
    if (this.activeScreen === 'music') return 'Import';
    if (this.activeScreen === 'settings') return this.settingsView === 'main' ? 'Reset' : 'Back';
    return 'Options';
  }

  get softCenter(): string {
    if (this.activeScreen === 'home') return 'Open';
    if (this.activeScreen === 'dialer') return 'Call';
    if (this.activeScreen === 'snake') return this.snake.running ? 'Pause' : 'Start';
    return 'Select';
  }

  get softRight(): string {
    if (this.activeScreen === 'home') return this.launcherActionLabel('right');
    if (this.activeScreen === 'dialer') return this.phoneView === 'dialer' ? 'Delete' : 'Back';
    if (this.activeScreen === 'clock') return 'Delete';
    return 'Back';
  }

  get launcherOptions(): OsAppDefinition[] {
    return this.apps;
  }

  appTrackBy(_: number, app: OsAppDefinition): OsAppId {
    return app.id;
  }

  idTrackBy(_: number, item: { id: string }): string {
    return item.id;
  }

  press(key: KeypadKey): void {
    this.keypad.press(key);
  }

  openApp(app: OsAppId): void {
    window.clearTimeout(this.transitionTimer);
    this.activeScreen = app;
    this.screenTransition = 'opening';
    this.alertText = '';
    this.controlFocusIndex = 0;
    this.focusIndex = this.apps.findIndex((entry) => entry.id === app);
    if (app === 'settings') {
      this.settingsView = 'main';
      this.listIndex.settings = 0;
    }
    if (app === 'dialer') {
      this.phoneView = 'logs';
      this.dialNumber = '';
      this.phoneLogIndex = 0;
    }
    if (app === 'snake') {
      this.resetSnake();
      window.setTimeout(() => this.paintSnake(), 0);
    }
    if (app === 'music') {
      this.selectedTrack = this.data?.tracks[this.listIndex.music];
    }
    this.transitionTimer = window.setTimeout(() => {
      this.screenTransition = 'idle';
    }, 360);
  }

  goHome(): void {
    if (this.activeScreen === 'home') return;
    window.clearTimeout(this.transitionTimer);
    this.screenTransition = 'closing';
    this.activeScreen = 'home';
    this.alertText = '';
    this.controlFocusIndex = 0;
    this.selectedContact = undefined;
    this.selectedThread = undefined;
    this.selectedNote = undefined;
    this.stopSnake();
    this.transitionTimer = window.setTimeout(() => {
      this.screenTransition = 'idle';
    }, 280);
  }

  filteredContacts(): Contact[] {
    const contacts = this.data?.contacts ?? [];
    const query = this.contactsQuery.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) => {
      const name = contact.name.toLowerCase();
      return contact.phone.includes(query) || name.includes(query) || this.toT9(name).includes(query);
    });
  }

  latestMessage(thread: MessageThread): string {
    return thread.messages.at(-1)?.body ?? 'No messages yet';
  }

  openPhoneDialer(initialNumber = ''): void {
    this.openApp('dialer');
    this.phoneView = 'dialer';
    this.dialNumber = initialNumber;
  }

  callDirectionIcon(direction: string): string {
    const icons: Record<string, string> = {
      dialled: 'call_made',
      outgoing: 'call_made',
      received: 'call_received',
      missed: 'phone_missed',
      rejected: 'call_end',
    };
    return icons[direction] ?? 'call';
  }

  callDirectionLabel(direction: string): string {
    const labels: Record<string, string> = {
      dialled: 'Dialled call',
      outgoing: 'Dialled call',
      received: 'Received call',
      missed: 'Missed call',
      rejected: 'Rejected call',
    };
    return labels[direction] ?? 'Call';
  }

  addTrack(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.data) return;
    if (!file.type.startsWith('audio/')) {
      this.musicError = 'Choose an audio file.';
      return;
    }
    const track: MusicTrack = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, ''),
      artist: 'Local file',
      blob: file,
      url: URL.createObjectURL(file),
    };
    this.data.tracks.push(track);
    this.selectedTrack = track;
    this.listIndex.music = this.data.tracks.length - 1;
    this.musicError = '';
    this.queueSave();
  }

  playTrack(track: MusicTrack): void {
    this.selectedTrack = track;
    window.setTimeout(() => {
      const player = this.audioPlayer?.nativeElement;
      if (player) {
        player.src = this.trackUrl(track);
        player.play().catch(() => {
          this.musicError = 'Playback needs one tap/click in this browser.';
        });
      }
    }, 0);
  }

  trackUrl(track: MusicTrack): string {
    if (track.url) return track.url;
    if (track.blob) {
      const existing = this.trackUrls.get(track.id);
      if (existing) return existing;
      const url = URL.createObjectURL(track.blob);
      this.trackUrls.set(track.id, url);
      track.url = url;
      return url;
    }
    return '';
  }

  async installPwa(): Promise<void> {
    if (!this.installPrompt) {
      this.alertText = 'Install is available from the browser menu after production deployment.';
      return;
    }
    await this.installPrompt.prompt();
    this.installPrompt = undefined;
  }

  async resetStorage(): Promise<void> {
    this.data = await this.storage.clear();
    this.prepareTrackUrls();
    this.applyTheme();
    this.alertText = 'Storage reset and demo data restored.';
  }

  private handleKey(key: KeypadKey): void {
    if (!this.data) return;
    if (key === 'center' && this.activateFocusedControl()) {
      return;
    }
    if (key === 'end') {
      this.goHome();
      return;
    }
    if (this.isNumeric(key)) {
      this.handleNumber(key);
      this.scheduleActiveScroll();
      return;
    }

    switch (this.activeScreen) {
      case 'home':
        this.handleHomeKey(key);
        break;
      case 'dialer':
        this.handleDialerKey(key);
        break;
      case 'contacts':
        this.handleContactsKey(key);
        break;
      case 'messages':
        this.handleMessagesKey(key);
        break;
      case 'clock':
        this.handleClockKey(key);
        break;
      case 'notes':
        this.handleNotesKey(key);
        break;
      case 'music':
        this.handleMusicKey(key);
        break;
      case 'snake':
        this.handleSnakeKey(key);
        break;
      case 'profiles':
        this.handleProfilesKey(key);
        break;
      case 'settings':
        this.handleSettingsKey(key);
        break;
    }
    this.scheduleActiveScroll();
  }

  private scheduleActiveScroll(): void {
    window.clearTimeout(this.activeScrollTimer);
    this.activeScrollTimer = window.setTimeout(() => {
      const screenBody = this.host.nativeElement.querySelector<HTMLElement>('.screen-body');
      const target =
        screenBody?.querySelector<HTMLElement>('.active') ??
        (screenBody?.contains(document.activeElement) ? (document.activeElement as HTMLElement) : undefined);

      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, 0);
  }

  private handleHomeKey(key: KeypadKey): void {
    if (key === 'left') this.focusIndex = this.wrap(this.focusIndex - 1, this.apps.length);
    if (key === 'right') this.focusIndex = this.wrap(this.focusIndex + 1, this.apps.length);
    if (key === 'up') this.focusIndex = this.wrap(this.focusIndex - 3, this.apps.length);
    if (key === 'down') this.focusIndex = this.wrap(this.focusIndex + 3, this.apps.length);
    if (key === 'center') this.openApp(this.apps[this.focusIndex].id);
    if (key === 'call') this.openApp('dialer');
    if (key === 'soft-left') this.openApp(this.data?.settings.launcherActions.left ?? 'profiles');
    if (key === 'soft-right') this.openApp(this.data?.settings.launcherActions.right ?? 'settings');
  }

  private handleDialerKey(key: KeypadKey): void {
    if (key === 'soft-left') {
      this.phoneView = this.phoneView === 'dialer' ? 'logs' : 'dialer';
      return;
    }
    if (this.phoneView === 'logs') {
      const logs = this.data?.callLog ?? [];
      if (key === 'up') this.phoneLogIndex = this.wrap(this.phoneLogIndex - 1, logs.length);
      if (key === 'down') this.phoneLogIndex = this.wrap(this.phoneLogIndex + 1, logs.length);
      if ((key === 'center' || key === 'call') && logs.length) {
        const log = logs[this.phoneLogIndex];
        this.dialNumber = log.phone;
        this.startCall(log.phone, log.name);
      }
      if (key === 'back' || key === 'soft-right') {
        this.goHome();
      }
      return;
    }
    if (key === 'back' || key === 'soft-right') {
      if (this.dialNumber) {
        this.dialNumber = this.dialNumber.slice(0, -1);
      } else {
        this.goHome();
      }
    }
    if (key === 'star') this.dialNumber += '*';
    if (key === 'hash') this.dialNumber += '#';
    if (key === 'center' || key === 'call') this.startCall(this.dialNumber);
  }

  private handleContactsKey(key: KeypadKey): void {
    const contacts = this.filteredContacts();
    if (key === 'soft-left') {
      const contact = this.selectedContact ?? contacts[this.listIndex.contacts];
      if (contact) {
        this.openPhoneDialer(contact.phone);
        this.alertText = `Ready to call ${contact.name}`;
      } else {
        this.alertText = 'No contact selected.';
      }
      return;
    }
    if (this.selectedContact) {
      if (key === 'up' || key === 'down' || key === 'left' || key === 'right') {
        this.moveControlFocus(key === 'up' || key === 'left' ? -1 : 1);
        return;
      }
      if (key === 'call' || key === 'center') this.startCall(this.selectedContact.phone, this.selectedContact.name);
      if (key === 'back' || key === 'soft-right') {
        this.selectedContact = undefined;
        this.controlFocusIndex = 0;
      }
      return;
    }
    if (key === 'up') this.listIndex.contacts = this.wrap(this.listIndex.contacts - 1, contacts.length);
    if (key === 'down') this.listIndex.contacts = this.wrap(this.listIndex.contacts + 1, contacts.length);
    if (key === 'back' || key === 'soft-right') {
      if (this.contactsQuery) {
        this.contactsQuery = this.contactsQuery.slice(0, -1);
      } else {
        this.goHome();
      }
    }
    if (key === 'center' && contacts.length) this.selectedContact = contacts[this.listIndex.contacts];
    if (key === 'call' && contacts.length) this.startCall(contacts[this.listIndex.contacts].phone, contacts[this.listIndex.contacts].name);
  }

  private handleMessagesKey(key: KeypadKey): void {
    const threads = this.data?.threads ?? [];
    if (this.selectedThread) {
      if (key === 'up' || key === 'down' || key === 'left' || key === 'right') {
        this.moveControlFocus(key === 'up' || key === 'left' ? -1 : 1);
        return;
      }
      if (key === 'center') this.activateFocusedControl();
      if (key === 'soft-left') this.sendMessage();
      if (key === 'back') {
        if (this.draftMessage) {
          this.draftMessage = this.draftMessage.slice(0, -1);
        } else {
          this.closeThread();
        }
      }
      if (key === 'soft-right') this.closeThread();
      if (this.isTextKey(key)) this.insertT9Text(key, 'message');
      return;
    }
    if (key === 'up') this.listIndex.messages = this.wrap(this.listIndex.messages - 1, threads.length);
    if (key === 'down') this.listIndex.messages = this.wrap(this.listIndex.messages + 1, threads.length);
    if (key === 'center' && threads.length) {
      this.selectedThread = threads[this.listIndex.messages];
      this.draftMessage = '';
      this.controlFocusIndex = 0;
      this.focusCurrentControl();
    }
    if (key === 'back' || key === 'soft-right') this.goHome();
  }

  private handleClockKey(key: KeypadKey): void {
    const alarms = this.data?.alarms ?? [];
    if (key === 'left' || key === 'right') {
      this.moveControlFocus(key === 'left' ? -1 : 1);
      return;
    }
    if (key === 'up') this.listIndex.clock = this.wrap(this.listIndex.clock - 1, alarms.length);
    if (key === 'down') this.listIndex.clock = this.wrap(this.listIndex.clock + 1, alarms.length);
    if (key === 'center' && alarms.length) {
      alarms[this.listIndex.clock].enabled = !alarms[this.listIndex.clock].enabled;
      this.queueSave();
    }
    if (key === 'soft-left') this.addAlarm();
    if (key === 'hash' || key === 'soft-right') this.deleteAlarm();
    if (key === 'back') {
      if (document.activeElement?.matches('[data-dpad-focus]')) {
        this.clearDomFocus();
      } else {
        this.goHome();
      }
    }
  }

  private handleNotesKey(key: KeypadKey): void {
    const notes = this.data?.notes ?? [];
    if (this.selectedNote) {
      if (key === 'up' || key === 'down' || key === 'left' || key === 'right') {
        this.moveControlFocus(key === 'up' || key === 'left' ? -1 : 1);
        return;
      }
      if (key === 'center') this.activateFocusedControl();
      if (key === 'soft-left') this.saveNote();
      if (key === 'back') {
        if (this.noteDraftBody) {
          this.noteDraftBody = this.noteDraftBody.slice(0, -1);
        } else {
          this.selectedNote = undefined;
          this.controlFocusIndex = 0;
        }
      }
      if (key === 'soft-right') {
        this.selectedNote = undefined;
        this.controlFocusIndex = 0;
      }
      if (this.isTextKey(key)) this.insertT9Text(key, 'note-body');
      return;
    }
    if (key === 'up') this.listIndex.notes = this.wrap(this.listIndex.notes - 1, notes.length);
    if (key === 'down') this.listIndex.notes = this.wrap(this.listIndex.notes + 1, notes.length);
    if (key === 'left' || key === 'right') this.moveControlFocus(key === 'left' ? -1 : 1);
    if (key === 'center' && notes.length) this.editNote(notes[this.listIndex.notes]);
    if (key === 'soft-left') this.createNote();
    if (key === 'back' || key === 'soft-right') this.goHome();
  }

  private handleMusicKey(key: KeypadKey): void {
    const tracks = this.data?.tracks ?? [];
    if (key === 'up') this.listIndex.music = this.wrap(this.listIndex.music - 1, tracks.length);
    if (key === 'down') this.listIndex.music = this.wrap(this.listIndex.music + 1, tracks.length);
    if (key === 'left' || key === 'right') this.moveControlFocus(key === 'left' ? -1 : 1);
    if (key === 'center' && tracks.length) this.playTrack(tracks[this.listIndex.music]);
    if (key === 'back' || key === 'soft-right') this.goHome();
  }

  private handleSnakeKey(key: KeypadKey): void {
    const nextMap: Partial<Record<KeypadKey, SnakeState['direction']>> = {
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right',
    };
    const next = nextMap[key];
    if (next && !this.isOpposite(next, this.snake.direction)) this.snake.nextDirection = next;
    if (key === 'center') this.toggleSnake();
    if (key === 'back' || key === 'soft-right') this.goHome();
  }

  private handleProfilesKey(key: KeypadKey): void {
    if (key === 'up') this.listIndex.profiles = this.wrap(this.listIndex.profiles - 1, this.profiles.length);
    if (key === 'down') this.listIndex.profiles = this.wrap(this.listIndex.profiles + 1, this.profiles.length);
    if (key === 'center') this.setProfile(this.profiles[this.listIndex.profiles]);
    if (key === 'back' || key === 'soft-right') this.goHome();
  }

  private handleSettingsKey(key: KeypadKey): void {
    const itemCount = this.currentSettingsItemCount();
    if (key === 'up') this.listIndex.settings = this.wrap(this.listIndex.settings - 1, itemCount);
    if (key === 'down') this.listIndex.settings = this.wrap(this.listIndex.settings + 1, itemCount);
    if (key === 'center') this.selectSettingsItem();
    if (key === 'soft-left') {
      if (this.settingsView === 'main') {
        void this.resetStorage();
      } else {
        this.settingsView = this.settingsView === 'launcher-left' || this.settingsView === 'launcher-right' ? 'launcher' : 'main';
        this.listIndex.settings = 0;
      }
    }
    if (key === 'soft-right' || key === 'back') {
      if (this.settingsView === 'main') {
        this.goHome();
      } else {
        this.settingsView = this.settingsView === 'launcher-left' || this.settingsView === 'launcher-right' ? 'launcher' : 'main';
        this.listIndex.settings = 0;
      }
    }
  }

  private handleNumber(key: KeypadKey): void {
    if (this.activeScreen === 'home') {
      this.openPhoneDialer(key);
      return;
    }
    if (this.activeScreen === 'dialer') {
      if (this.phoneView === 'logs') {
        this.phoneView = 'dialer';
        this.dialNumber = key;
      } else {
        this.dialNumber += key;
      }
      return;
    }
    if (this.activeScreen === 'contacts' && this.isNumeric(key)) {
      this.contactsQuery += key;
      this.listIndex.contacts = 0;
    }
    if (this.activeScreen === 'messages' && this.selectedThread) this.insertT9Text(key, 'message');
    if (this.activeScreen === 'notes' && this.selectedNote) this.insertT9Text(key, 'note-body');
    if (this.activeScreen === 'clock' && document.activeElement instanceof HTMLInputElement) this.insertT9Text(key, 'focused');
  }

  private startCall(phone: string, name = 'Unknown'): void {
    if (!phone.trim() || !this.data) {
      this.alertText = 'Enter a number first.';
      return;
    }
    const contact = this.data.contacts.find((item) => item.phone === phone);
    const displayName = contact?.name ?? name;
    this.callingNumber = `${displayName} - ${phone}`;
    this.data.callLog.unshift({
      id: crypto.randomUUID(),
      name: displayName,
      phone,
      at: new Date().toISOString(),
      direction: 'dialled',
    });
    this.alertText = `Calling ${this.callingNumber}`;
    this.queueSave();
  }

  sendMessage(): void {
    if (!this.selectedThread || !this.draftMessage.trim()) return;
    this.selectedThread.messages.push({
      id: crypto.randomUUID(),
      body: this.draftMessage.trim(),
      at: new Date().toISOString(),
      mine: true,
    });
    this.draftMessage = '';
    this.queueSave();
  }

  closeThread(): void {
    this.selectedThread = undefined;
    this.controlFocusIndex = 0;
  }

  private addAlarm(): void {
    if (!this.data) return;
    this.data.alarms.push({
      id: crypto.randomUUID(),
      label: this.newAlarmLabel || 'Alarm',
      time: this.newAlarmTime,
      enabled: true,
    });
    this.listIndex.clock = this.data.alarms.length - 1;
    this.queueSave();
  }

  private deleteAlarm(): void {
    if (!this.data?.alarms.length) return;
    this.data.alarms.splice(this.listIndex.clock, 1);
    this.listIndex.clock = this.wrap(this.listIndex.clock, this.data.alarms.length);
    this.queueSave();
  }

  private createNote(): void {
    this.selectedNote = { id: crypto.randomUUID(), title: 'New note', body: '', updatedAt: new Date().toISOString() };
    this.noteDraftTitle = this.selectedNote.title;
    this.noteDraftBody = this.selectedNote.body;
    this.controlFocusIndex = 0;
    this.focusCurrentControl();
  }

  private editNote(note: NoteItem): void {
    this.selectedNote = note;
    this.noteDraftTitle = note.title;
    this.noteDraftBody = note.body;
    this.controlFocusIndex = 0;
    this.focusCurrentControl();
  }

  private saveNote(): void {
    if (!this.data || !this.selectedNote) return;
    this.selectedNote.title = this.noteDraftTitle.trim() || 'Untitled note';
    this.selectedNote.body = this.noteDraftBody;
    this.selectedNote.updatedAt = new Date().toISOString();
    const existing = this.data.notes.findIndex((note) => note.id === this.selectedNote?.id);
    if (existing === -1) {
      this.data.notes.unshift(this.selectedNote);
      this.listIndex.notes = 0;
    }
    this.queueSave();
    this.selectedNote = undefined;
  }

  private setProfile(profile: ProfileId): void {
    if (!this.data) return;
    this.data.settings.profile = profile;
    this.alertText = `${profile} profile enabled.`;
    this.queueSave();
  }

  private setTheme(theme: ThemeId): void {
    if (!this.data) return;
    this.data.settings.theme = theme;
    this.applyTheme();
    this.queueSave();
  }

  private setColorTheme(colorTheme: ColorThemeId): void {
    if (!this.data) return;
    this.data.settings.colorTheme = colorTheme;
    this.applyTheme();
    this.queueSave();
  }

  private setLauncherAction(side: LauncherSide, appId: OsAppId): void {
    if (!this.data) return;
    this.data.settings.launcherActions[side] = appId;
    this.alertText = `${this.sideLabel(side)} launcher action set to ${this.appTitle(appId)}.`;
    this.settingsView = 'launcher';
    this.listIndex.settings = side === 'left' ? 0 : 1;
    this.queueSave();
  }

  private selectSettingsItem(): void {
    if (this.settingsView === 'main') {
      this.settingsView = this.listIndex.settings === 0 ? 'theme' : this.listIndex.settings === 1 ? 'theme-color' : 'launcher';
      this.listIndex.settings = 0;
      return;
    }
    if (this.settingsView === 'theme') {
      this.setTheme(this.themes[this.listIndex.settings].id);
      return;
    }
    if (this.settingsView === 'theme-color') {
      this.setColorTheme(this.colorThemes[this.listIndex.settings].id);
      return;
    }
    if (this.settingsView === 'launcher') {
      this.settingsView = this.listIndex.settings === 0 ? 'launcher-left' : 'launcher-right';
      this.listIndex.settings = 0;
      return;
    }
    const side: LauncherSide = this.settingsView === 'launcher-left' ? 'left' : 'right';
    this.setLauncherAction(side, this.launcherOptions[this.listIndex.settings].id);
  }

  private currentSettingsItemCount(): number {
    if (this.settingsView === 'theme') return this.themes.length;
    if (this.settingsView === 'theme-color') return this.colorThemes.length;
    if (this.settingsView === 'launcher-left' || this.settingsView === 'launcher-right') return this.launcherOptions.length;
    return this.settingsRows.length;
  }

  launcherActionLabel(side: LauncherSide): string {
    const appId = this.data?.settings.launcherActions[side] ?? (side === 'left' ? 'profiles' : 'settings');
    return appId === 'profiles' ? 'Profile' : this.appTitle(appId);
  }

  appTitle(appId: OsAppId): string {
    return this.apps.find((app) => app.id === appId)?.title ?? appId;
  }

  appIcon(appId: OsAppId): string {
    return this.apps.find((app) => app.id === appId)?.icon ?? 'apps';
  }

  sideLabel(side: LauncherSide): string {
    return side === 'left' ? 'Left' : 'Right';
  }

  focusControl(index: number): void {
    this.controlFocusIndex = index;
    this.focusCurrentControl();
  }

  private focusedControls(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('.screen-body [data-dpad-focus]')).filter(
      (element) => !element.hasAttribute('disabled') && element.offsetParent !== null,
    );
  }

  private moveControlFocus(delta: number): void {
    const controls = this.focusedControls();
    if (!controls.length) return;
    const activeIndex = controls.findIndex((element) => element === document.activeElement);
    const current = activeIndex >= 0 ? activeIndex : this.controlFocusIndex;
    this.controlFocusIndex = this.wrap(current + delta, controls.length);
    this.focusCurrentControl();
  }

  private focusCurrentControl(): void {
    window.setTimeout(() => {
      const controls = this.focusedControls();
      if (!controls.length) return;
      this.controlFocusIndex = this.wrap(this.controlFocusIndex, controls.length);
      const control = controls[this.controlFocusIndex];
      this.lastFocusedControl = control;
      control.focus({ preventScroll: false });
      control.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }

  private activateFocusedControl(): boolean {
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest('.screen-body') && this.activateControl(active)) return true;

    if (active?.closest('.hardware-keypad') && this.lastFocusedControl && this.lastFocusedControl.isConnected) {
      return this.activateControl(this.lastFocusedControl);
    }

    return false;
  }

  private activateControl(control: HTMLElement): boolean {
    if (!control.closest('.screen-body')) return false;
    if (!control.matches('[data-dpad-focus], button, input, textarea, label, [role="button"]')) return false;
    if (control.hasAttribute('disabled') || control.offsetParent === null) return false;
    if (control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement) {
      control.focus();
      return true;
    }
    control.click();
    return true;
  }

  private clearDomFocus(): void {
    (document.activeElement as HTMLElement | null)?.blur();
  }

  private tick(): void {
    this.now = new Date();
    const minuteKey = this.now.toISOString().slice(0, 16);
    this.data?.alarms.forEach((alarm) => {
      const currentTime = this.now.toTimeString().slice(0, 5);
      if (alarm.enabled && alarm.time === currentTime && alarm.lastTriggered !== minuteKey) {
        alarm.lastTriggered = minuteKey;
        this.alertText = `${alarm.label} alarm`;
        this.queueSave();
      }
    });
  }

  private createSnake(): SnakeState {
    return {
      running: false,
      paused: false,
      direction: 'right',
      nextDirection: 'right',
      body: [
        { x: 6, y: 8 },
        { x: 5, y: 8 },
        { x: 4, y: 8 },
      ],
      food: { x: 12, y: 8 },
      score: 0,
    };
  }

  private resetSnake(): void {
    this.stopSnake();
    this.snake = this.createSnake();
    this.paintSnake();
  }

  private toggleSnake(): void {
    if (!this.snake.running) {
      this.snake.running = true;
      this.snake.paused = false;
      this.snakeTimer = window.setInterval(() => this.stepSnake(), 130);
      return;
    }
    this.snake.paused = !this.snake.paused;
  }

  private stopSnake(): void {
    window.clearInterval(this.snakeTimer);
    this.snake.running = false;
  }

  private stepSnake(): void {
    if (!this.snake.running || this.snake.paused) return;
    this.snake.direction = this.snake.nextDirection;
    const head = { ...this.snake.body[0] };
    if (this.snake.direction === 'up') head.y -= 1;
    if (this.snake.direction === 'down') head.y += 1;
    if (this.snake.direction === 'left') head.x -= 1;
    if (this.snake.direction === 'right') head.x += 1;
    head.x = this.wrap(head.x, 18);
    head.y = this.wrap(head.y, 18);
    if (this.snake.body.some((part) => part.x === head.x && part.y === head.y)) {
      this.data!.highScore = Math.max(this.data!.highScore, this.snake.score);
      this.alertText = `Snake over. Score ${this.snake.score}`;
      this.queueSave();
      this.resetSnake();
      return;
    }
    this.snake.body.unshift(head);
    if (head.x === this.snake.food.x && head.y === this.snake.food.y) {
      this.snake.score += 10;
      this.snake.food = { x: Math.floor(Math.random() * 18), y: Math.floor(Math.random() * 18) };
    } else {
      this.snake.body.pop();
    }
    this.paintSnake();
  }

  private paintSnake(): void {
    const canvas = this.snakeCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cell = canvas.width / 18;
    ctx.fillStyle = '#07130a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#a3e635';
    this.snake.body.forEach((part) => ctx.fillRect(part.x * cell + 1, part.y * cell + 1, cell - 2, cell - 2));
    ctx.fillStyle = '#f97316';
    ctx.fillRect(this.snake.food.x * cell + 1, this.snake.food.y * cell + 1, cell - 2, cell - 2);
  }

  private isOpposite(next: SnakeState['direction'], current: SnakeState['direction']): boolean {
    return (
      (next === 'up' && current === 'down') ||
      (next === 'down' && current === 'up') ||
      (next === 'left' && current === 'right') ||
      (next === 'right' && current === 'left')
    );
  }

  private applyTheme(): void {
    document.body.dataset['theme'] = this.theme;
    document.body.dataset['colorTheme'] = this.colorTheme;
  }

  private prepareTrackUrls(): void {
    this.trackUrls.forEach((url) => URL.revokeObjectURL(url));
    this.trackUrls.clear();
    this.data?.tracks.forEach((track) => {
      if (track.blob) track.url = URL.createObjectURL(track.blob);
    });
  }

  private queueSave(): void {
    if (!this.data) return;
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      if (this.data) void this.storage.save(this.data);
    }, 150);
  }

  private wrap(index: number, length: number): number {
    if (length <= 0) return 0;
    return ((index % length) + length) % length;
  }

  private toT9(value: string): string {
    const map: Record<string, string> = {
      a: '2',
      b: '2',
      c: '2',
      d: '3',
      e: '3',
      f: '3',
      g: '4',
      h: '4',
      i: '4',
      j: '5',
      k: '5',
      l: '5',
      m: '6',
      n: '6',
      o: '6',
      p: '7',
      q: '7',
      r: '7',
      s: '7',
      t: '8',
      u: '8',
      v: '8',
      w: '9',
      x: '9',
      y: '9',
      z: '9',
    };
    return value.replace(/[a-z]/g, (char) => map[char] ?? '');
  }

  private textForKey(key: KeypadKey): string {
    const chars = this.t9Chars(key);
    return chars[0] ?? '';
  }

  private t9Chars(key: KeypadKey): string {
    const textMap: Partial<Record<KeypadKey, string>> = {
      '0': ' ',
      '1': '.,?!1',
      '2': 'abc2',
      '3': 'def3',
      '4': 'ghi4',
      '5': 'jkl5',
      '6': 'mno6',
      '7': 'pqrs7',
      '8': 'tuv8',
      '9': 'wxyz9',
      star: '*+',
      hash: '#',
    };
    return textMap[key] ?? '';
  }

  private insertT9Text(key: KeypadKey, target: string): void {
    const chars = this.t9Chars(key);
    if (!chars) return;
    const now = Date.now();
    const sameCycle = this.lastT9Key === key && this.lastT9Target === target && now - this.lastT9At < 900;
    this.t9CycleIndex = sameCycle ? this.wrap(this.t9CycleIndex + 1, chars.length) : 0;
    const char = chars[this.t9CycleIndex];
    this.lastT9Key = key;
    this.lastT9At = now;
    this.lastT9Target = target;

    const input = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement
      ? document.activeElement
      : undefined;
    if (input && input.closest('.screen-body')) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const replaceStart = sameCycle && start === end && start > 0 ? start - 1 : start;
      input.value = input.value.slice(0, replaceStart) + char + input.value.slice(end);
      input.selectionStart = input.selectionEnd = replaceStart + 1;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    const replaceLast = (value: string) => sameCycle && value ? value.slice(0, -1) + char : value + char;
    if (target === 'message') this.draftMessage = replaceLast(this.draftMessage);
    if (target === 'note-body') this.noteDraftBody = replaceLast(this.noteDraftBody);
  }

  private isNumeric(key: KeypadKey): key is Extract<KeypadKey, '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'> {
    return /^[0-9]$/.test(key);
  }

  private isTextKey(key: KeypadKey): boolean {
    return this.isNumeric(key) || key === 'star' || key === 'hash';
  }

  private isTextEditing(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return !!element && ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
  }

  private isTextEditingKey(key: KeypadKey, rawKey: string): boolean {
    if (['q', 'e', 'c', 'h'].includes(rawKey.toLowerCase())) return false;
    return this.isTextKey(key) || ['up', 'down', 'left', 'right', 'center', 'back', 'end'].includes(key);
  }
}
