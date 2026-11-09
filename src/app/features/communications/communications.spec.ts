import { signal } from '@angular/core';
import { seedData } from '../../core/data';
import { OsData } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsNavigationService } from '../../core/navigation.service';
import { CallSession } from './call-session';
import { ContactsComponent } from './contacts.component';
import { MessagesComponent } from './messages.component';
import { PhoneComponent } from './phone.component';
import {
  exportVcard,
  filterContacts,
  handoffUrl,
  parseVcard,
  validPhone,
} from './communication.utils';

function fixture(): { os: OsStateService; navigation: OsNavigationService } {
  const data = signal<OsData | null>(seedData());
  const os = {
    data,
    update: (mutate: (value: OsData) => void) => {
      const next = structuredClone(data()!);
      mutate(next);
      data.set(next);
    },
    feedback: jasmine.createSpy('feedback'),
    notify: jasmine.createSpy('notify'),
    confirm: jasmine.createSpy('confirm').and.resolveTo(true),
  } as unknown as OsStateService;
  return { os, navigation: new OsNavigationService() };
}
describe('Communication data utilities', () => {
  it('finds contacts independently by name, phone and T9 digits', () => {
    const contacts = [
      { id: 'a', name: 'Maya Rao', phone: '+91 8884400300' },
      { id: 'b', name: 'Sam', phone: '7771204560' },
    ];
    expect(filterContacts(contacts, 'maya').map((item) => item.id)).toEqual(['a']);
    expect(filterContacts(contacts, '6292').map((item) => item.id)).toEqual(['a']);
    expect(filterContacts(contacts, '88844').length).toBe(1);
    expect(filterContacts(contacts, '99999')).toEqual([]);
  });
  it('round trips vCard punctuation, unicode and folded lines', () => {
    const contacts = [{ id: 'a', name: 'Zoë; Smith, A\\B', phone: '+911234567890' }];
    expect(parseVcard(exportVcard(contacts))).toEqual([
      { name: contacts[0].name, phone: contacts[0].phone },
    ]);
    expect(parseVcard('BEGIN:VCARD\r\nFN:Long\r\n name\r\nTEL:12345\r\nEND:VCARD')[0].name).toBe(
      'Longname',
    );
  });
  it('rejects unsafe handoff numbers and escapes SMS content', () => {
    expect(validPhone('javascript:alert(1)')).toBeFalse();
    expect(handoffUrl('tel', 'javascript:alert(1)')).toBe('');
    expect(handoffUrl('sms', '+1234', 'A&B #1')).toBe('sms:%2B1234?body=A%26B%20%231');
    expect(() => parseVcard('{}')).toThrowError();
  });
});
describe('Simulated call lifecycle', () => {
  it('runs dialing, ringing, connected and ended with an elapsed duration', () => {
    const session = new CallSession('1234', 'Caller');
    session.start(1000);
    expect(session.phase).toBe('dialing');
    session.advance(1700);
    expect(session.phase).toBe('ringing');
    session.advance(3500);
    expect(session.phase).toBe('connected');
    expect(session.duration(6600)).toBe(3);
    expect(session.finish(7600)).toBeTrue();
    expect(session.duration(20000)).toBe(4);
    expect(session.phase).toBe('ended');
    expect(session.finish(8000)).toBeFalse();
  });
  it('distinguishes canceled outgoing and unanswered incoming calls', () => {
    const outgoing = new CallSession('1234', 'Caller');
    outgoing.start(0);
    outgoing.finish(300);
    expect(outgoing.phase).toBe('canceled');
    const incoming = new CallSession('1234', 'Caller');
    incoming.start(0, true);
    incoming.finish(1000);
    expect(incoming.phase).toBe('ended');
    expect(incoming.connectedAt).toBeNull();
  });
});
describe('Contacts operations', () => {
  it('creates, updates and favorites a contact while rejecting duplicate numbers', () => {
    const { os, navigation } = fixture();
    const app = new ContactsComponent(os, navigation);
    app.edit();
    app.name = 'Ada';
    app.phone = '+1 (222) 333-4444';
    app.save();
    expect(app.selected?.phone).toBe('+12223334444');
    const id = app.selected!.id;
    app.edit(app.selected);
    app.name = 'Ada Lovelace';
    app.favorite = true;
    app.save();
    expect(os.data()!.contacts.find((contact) => contact.id === id)?.favorite).toBeTrue();
    app.edit();
    app.name = 'Duplicate';
    app.phone = '12223334444';
    app.save();
    expect(app.error).toContain('already exists');
  });
  it('blocks update reload for invalid contact edits and saves valid edits', () => {
    const { os, navigation } = fixture();
    const app = new ContactsComponent(os, navigation);
    app.edit();
    expect(app.prepareReload()).toBeFalse();
    app.name = 'Before update';
    app.phone = '123456';
    expect(app.prepareReload()).toBeTrue();
    expect(app.selected?.name).toBe('Before update');
  });
  it('backs out of nested contact views before leaving the app', () => {
    const { os, navigation } = fixture();
    const app = new ContactsComponent(os, navigation);
    app.selectedId = app.contacts[0].id;
    app.edit(app.selected);
    expect(app.key('back')).toBeTrue();
    expect(app.mode).toBe('list');
    expect(app.key('back')).toBeTrue();
    expect(app.selectedId).toBe('');
    expect(app.key('back')).toBeFalse();
  });
  it('deletes only a confirmed contact and preserves other app data', async () => {
    const { os, navigation } = fixture();
    const app = new ContactsComponent(os, navigation);
    const contact = app.contacts[0];
    const threads = os.data()!.threads.length;
    await app.remove(contact);
    expect(app.contacts.some((item) => item.id === contact.id)).toBeFalse();
    expect(os.data()!.threads.length).toBe(threads);
  });
});
describe('Messages local simulation', () => {
  it('recovers drafts and appends messages to a number’s existing conversation', () => {
    const { os, navigation } = fixture();
    const app = new MessagesComponent(os, navigation);
    app.compose('123456');
    app.bodyChanged('Draft text');
    const reopened = new MessagesComponent(os, navigation);
    reopened.recoverDraft();
    expect(reopened.body).toBe('Draft text');
    reopened.send();
    expect(os.data()!.messageDraft).toBeUndefined();
    expect(reopened.selected?.messages[0].body).toBe('Draft text');
    expect(reopened.selected?.messages[0].mine).toBeTrue();
    app.compose('123456');
    app.bodyChanged('Second');
    app.send();
    expect(app.selected?.messages.length).toBe(2);
  });
  it('marks incoming messages read on open and deletes individual messages', async () => {
    const { os, navigation } = fixture();
    const app = new MessagesComponent(os, navigation);
    const thread = app.threads[0];
    expect(app.unread(thread)).toBeTrue();
    app.openThread(thread);
    expect(app.unread(app.selected!)).toBeFalse();
    const message = app.selected!.messages[0];
    await app.deleteMessage(app.selected!, message);
    expect(app.selected!.messages.some((item) => item.id === message.id)).toBeFalse();
  });
  it('keeps a different unsent draft when replacement is canceled', async () => {
    const { os, navigation } = fixture();
    os.update((data) => (data.messageDraft = { phone: '12345', body: 'Keep this draft' }));
    (os.confirm as jasmine.Spy).and.resolveTo(false);
    const app = new MessagesComponent(os, navigation);
    await app.compose('98765');
    expect(os.data()!.messageDraft?.body).toBe('Keep this draft');
    expect(app.mode).toBe('list');
  });
  it('rejects empty and invalid sends without fabricating a delivery', () => {
    const { os, navigation } = fixture();
    const app = new MessagesComponent(os, navigation);
    const before = app.threads.length;
    app.compose('bad');
    app.body = 'Hello';
    app.send();
    expect(app.error).toContain('valid');
    expect(app.threads.length).toBe(before);
  });
});
describe('Phone integration', () => {
  it('records a canceled call exactly once when exiting', () => {
    const { os, navigation } = fixture();
    const app = new PhoneComponent(os, navigation);
    const count = app.history.length;
    app.number = '123456';
    app.startCall();
    app.ngOnDestroy();
    app.ngOnDestroy();
    expect(app.history.length).toBe(count + 1);
    expect(app.history[0].outcome).toBe('Simulation canceled');
  });
  it('records simulated missed calls only with demo mode enabled', () => {
    const { os, navigation } = fixture();
    os.update((data) => (data.settings.demoMode = true));
    const app = new PhoneComponent(os, navigation);
    app.missed();
    expect(app.history[0].direction).toBe('missed');
    expect(app.history[0].duration).toBe(0);
    app.ngOnDestroy();
  });
});
