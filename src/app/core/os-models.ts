export type OsAppId =
  | 'dialer'
  | 'contacts'
  | 'messages'
  | 'clock'
  | 'calculator'
  | 'calendar'
  | 'notes'
  | 'music'
  | 'snake'
  | 'gallery'
  | 'files'
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
  direction: 'dialled' | 'received' | 'missed' | 'rejected' | 'outgoing';
  duration?: number;
  outcome?: string;
}
export interface MessageItem {
  id: string;
  body: string;
  at: string;
  mine: boolean;
  read?: boolean;
}
export interface MessageThread {
  id: string;
  contactName: string;
  phone: string;
  messages: MessageItem[];
  draft?: string;
}
export interface AlarmItem {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  repeat?: number[];
  lastTriggered?: string;
  snoozeUntil?: number;
}
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  details: string;
  reminder: boolean;
  remindedAt?: string;
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
  mediaId?: string;
  blob?: Blob;
  url?: string;
}
export interface MediaItem {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  kind: 'audio' | 'image' | 'file';
}
export interface NoteDraft {
  id: string;
  title: string;
  body: string;
}
export interface OsSettings {
  profile: ProfileId;
  theme: ThemeId;
  colorTheme: ColorThemeId;
  launcherActions: { left: OsAppId; right: OsAppId };
  seeded: boolean;
  fontSize: 'normal' | 'large';
  sound: boolean;
  vibration: boolean;
  multiTap: boolean;
  wallpaper: 'dune' | 'night' | 'plain';
  immersive: boolean;
  demoMode: boolean;
}
export interface OsData {
  schemaVersion: 2;
  settings: OsSettings;
  contacts: Contact[];
  callLog: CallLogEntry[];
  threads: MessageThread[];
  alarms: AlarmItem[];
  notes: NoteItem[];
  tracks: MusicTrack[];
  events: CalendarEvent[];
  media: MediaItem[];
  highScore: number;
  noteDraft?: NoteDraft;
  messageDraft?: { phone: string; body: string };
}
