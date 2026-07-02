export type OsAppId =
  | 'dialer'
  | 'contacts'
  | 'messages'
  | 'clock'
  | 'notes'
  | 'music'
  | 'snake'
  | 'profiles'
  | 'settings';

export type KeypadKey =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'center'
  | 'soft-left'
  | 'soft-right'
  | 'call'
  | 'end'
  | 'back'
  | 'star'
  | 'hash'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9';

export type ProfileId = 'General' | 'Silent' | 'Meeting' | 'Outdoor';
export type ThemeId = 'light' | 'dark' | 'contrast' | 'classic';
export type ColorThemeId = 'cherry' | 'azure' | 'violet' | 'green';

export interface OsAppDefinition {
  id: OsAppId;
  title: string;
  icon: string;
  tone: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  favorite?: boolean;
}

export interface CallLogEntry {
  id: string;
  name: string;
  phone: string;
  at: string;
  direction: 'outgoing' | 'missed';
}

export interface MessageThread {
  id: string;
  contactName: string;
  phone: string;
  messages: MessageItem[];
}

export interface MessageItem {
  id: string;
  body: string;
  at: string;
  mine: boolean;
}

export interface AlarmItem {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  lastTriggered?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  url?: string;
  blob?: Blob;
}

export interface OsSettings {
  profile: ProfileId;
  theme: ThemeId;
  colorTheme: ColorThemeId;
  launcherActions: {
    left: OsAppId;
    right: OsAppId;
  };
  seeded: boolean;
}

export interface OsData {
  settings: OsSettings;
  contacts: Contact[];
  callLog: CallLogEntry[];
  threads: MessageThread[];
  alarms: AlarmItem[];
  notes: NoteItem[];
  tracks: MusicTrack[];
  highScore: number;
}
