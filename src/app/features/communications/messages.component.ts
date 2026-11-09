import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { Contact, KeypadKey, MessageItem, MessageThread } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsNavigationService } from '../../core/navigation.service';
import { handoffUrl, normalizePhone, phoneIdentity, validPhone } from './communication.utils';

@Component({
  selector: 'os-messages',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './communications.scss',
  template: ` <section class="comm" aria-label="Messages application">
    <p class="notice">
      Local message simulator. Messages stay on this device. Use “Device SMS app” for an external
      handoff.
    </p>
    @if (mode === 'list') {
      <label
        >Search conversations<input
          aria-label="Search conversations"
          type="search"
          [(ngModel)]="query"
          maxlength="200"
      /></label>
      <div class="actions">
        <button type="button" (click)="compose()">New message</button>
        @if (os.data()?.messageDraft) {
          <button type="button" (click)="recoverDraft()">Resume draft</button>
        }
        @if (os.data()?.settings?.demoMode) {
          <button type="button" (click)="simulateIncoming()">Demo incoming</button>
        }
      </div>
      <div class="list">
        @for (thread of filtered; track thread.id) {
          <button type="button" (click)="openThread(thread)">
            @if (unread(thread)) {
              <i class="unread" aria-label="Unread messages"></i>
            }
            <span
              ><strong
                >{{ nameFor(thread) }}
                @if (thread.draft) {
                  · Draft
                }</strong
              ><small>{{ thread.messages.at(-1)?.body || 'No messages yet' }}</small
              ><small>{{ thread.messages.at(-1)?.at | date: 'MMM d, HH:mm' }}</small></span
            >
          </button>
        } @empty {
          <p class="empty">
            {{ query ? 'No conversations match.' : 'No messages. Start a local conversation.' }}
          </p>
        }
      </div>
    } @else {
      @if (selected; as thread) {
        <div class="row">
          <strong>{{ nameFor(thread) }}</strong
          ><small>{{ thread.phone }}</small>
        </div>
        <div class="actions">
          <button type="button" (click)="deleteThread(thread)">Delete conversation</button>
          @if (os.data()?.settings?.demoMode) {
            <button type="button" (click)="simulateIncoming(thread)">Demo reply</button>
          }
        </div>
        <div class="list" aria-label="Conversation history">
          @for (item of thread.messages; track item.id) {
            <article class="bubble" [class.mine]="item.mine">
              <p>{{ item.body }}</p>
              <small
                >{{ item.at | date: 'MMM d, HH:mm' }} ·
                {{ item.mine ? 'Local outgoing' : 'Simulated incoming' }}</small
              >
              <button
                type="button"
                [attr.aria-label]="'Delete message from ' + (item.at | date: 'short')"
                (click)="deleteMessage(thread, item)"
              >
                Delete
              </button>
            </article>
          } @empty {
            <p class="empty">This conversation has no messages yet.</p>
          }
        </div>
      } @else {
        <label
          >Choose contact<select
            aria-label="Choose message contact"
            [ngModel]="recipientContact"
            (ngModelChange)="chooseContact($event)"
          >
            <option value="">Enter a number below</option>
            @for (contact of contacts; track contact.id) {
              <option [value]="contact.id">{{ contact.name }} · {{ contact.phone }}</option>
            }
          </select></label
        >
        <label
          >Recipient number<input
            aria-label="Message recipient"
            type="tel"
            [ngModel]="recipient"
            (ngModelChange)="recipientChanged($event)"
            maxlength="40"
        /></label>
      }
      <label
        >Message<textarea
          aria-label="Message body"
          rows="4"
          [ngModel]="body"
          (ngModelChange)="bodyChanged($event)"
          maxlength="5000"
          placeholder="Write a local message…"
        ></textarea>
      </label>
      <small class="muted">{{ body.length }} / 5,000 · Drafts save automatically</small>
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      <div class="actions">
        <button type="button" (click)="send()">Send locally</button>
        @if (smsUrl) {
          <a [href]="smsUrl">Device SMS app ↗</a>
        }
        <button type="button" (click)="discardDraft()" [disabled]="!body">Discard draft</button>
      </div>
    }
  </section>`,
})
export class MessagesComponent implements FeatureController {
  mode: 'list' | 'compose' | 'thread' = 'list';
  selectedId = '';
  query = '';
  recipient = '';
  recipientContact = '';
  body = '';
  error = '';
  constructor(
    public readonly os: OsStateService,
    private readonly navigation: OsNavigationService,
  ) {
    const context = this.navigation.context();
    if (context.phone) {
      const existing = this.threads.find(
        (thread) => phoneIdentity(thread.phone) === phoneIdentity(context.phone!),
      );
      if (existing) this.openThread(existing);
      else this.compose(context.phone);
    }
  }
  get threads(): MessageThread[] {
    return this.os.data()?.threads ?? [];
  }
  get contacts(): Contact[] {
    return [...(this.os.data()?.contacts ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  }
  get selected(): MessageThread | undefined {
    return this.threads.find((thread) => thread.id === this.selectedId);
  }
  get filtered(): MessageThread[] {
    const query = this.query.trim().toLocaleLowerCase();
    return this.threads
      .filter(
        (thread) =>
          !query ||
          `${this.nameFor(thread)} ${thread.phone} ${thread.messages.map((item) => item.body).join(' ')}`
            .toLocaleLowerCase()
            .includes(query),
      )
      .sort((a, b) => (b.messages.at(-1)?.at ?? '').localeCompare(a.messages.at(-1)?.at ?? ''));
  }
  get smsUrl(): string {
    return handoffUrl('sms', this.selected?.phone ?? this.recipient, this.body);
  }
  get left(): SoftAction {
    return {
      label: this.mode === 'list' ? 'New' : 'Send',
      run: () => (this.mode === 'list' ? this.compose() : this.send()),
    };
  }
  get right(): SoftAction {
    return {
      label: 'Back',
      run: () => {
        if (this.mode === 'list') this.navigation.back();
        else {
          this.saveDraft();
          this.mode = 'list';
          this.selectedId = '';
          this.error = '';
        }
      },
    };
  }
  key(key: KeypadKey): boolean {
    if (key === 'back' && this.mode !== 'list') {
      this.right.run();
      return true;
    }
    if (key === 'call' && (this.selected?.phone || validPhone(this.recipient))) {
      this.navigation.open('dialer', { phone: this.selected?.phone ?? this.recipient });
      return true;
    }
    return false;
  }
  prepareReload(): boolean {
    this.saveDraft();
    return true;
  }
  nameFor(thread: MessageThread): string {
    return (
      this.contacts.find((contact) => phoneIdentity(contact.phone) === phoneIdentity(thread.phone))
        ?.name ||
      thread.contactName ||
      thread.phone
    );
  }
  unread(thread: MessageThread): boolean {
    return thread.messages.some((item) => !item.mine && !item.read);
  }
  async compose(phone = ''): Promise<void> {
    const previous = this.os.data()?.messageDraft;
    if (
      phone &&
      previous &&
      phoneIdentity(previous.phone) !== phoneIdentity(phone) &&
      (previous.body || previous.phone)
    ) {
      if (
        !(await this.os.confirm(
          'Replace your existing unsent draft to compose to this number? Cancel to keep the draft.',
        ))
      )
        return;
      this.os.update((data) => {
        data.messageDraft = undefined;
      });
    }
    this.selectedId = '';
    this.recipient = phone;
    this.recipientContact = '';
    this.body = '';
    this.error = '';
    this.mode = 'compose';
    const draft = this.os.data()?.messageDraft;
    if (draft && (!phone || phoneIdentity(draft.phone) === phoneIdentity(phone))) {
      this.recipient = draft.phone;
      this.body = draft.body;
    }
  }
  recoverDraft(): void {
    void this.compose();
  }
  openThread(thread: MessageThread): void {
    this.selectedId = thread.id;
    this.mode = 'thread';
    this.recipient = thread.phone;
    this.body = thread.draft ?? '';
    this.error = '';
    this.os.update((data) => {
      data.threads
        .find((item) => item.id === thread.id)
        ?.messages.forEach((item) => {
          if (!item.mine) item.read = true;
        });
    });
  }
  chooseContact(id: string): void {
    this.recipientContact = id;
    this.recipient = this.contacts.find((contact) => contact.id === id)?.phone ?? '';
    this.saveDraft();
  }
  recipientChanged(value: string): void {
    this.recipient = value;
    this.recipientContact = '';
    this.saveDraft();
  }
  bodyChanged(value: string): void {
    this.body = value;
    this.saveDraft();
  }
  saveDraft(): void {
    if (this.mode === 'list') return;
    const selectedId = this.selectedId;
    const body = this.body;
    const phone = this.recipient;
    this.os.update((data) => {
      if (selectedId) {
        const thread = data.threads.find((item) => item.id === selectedId);
        if (thread) thread.draft = body;
      } else data.messageDraft = body || phone ? { phone, body } : undefined;
    });
  }
  send(): void {
    const phone = normalizePhone(this.selected?.phone ?? this.recipient);
    const body = this.body.trim();
    if (!validPhone(phone)) {
      this.error = 'Choose a contact or enter a valid recipient number.';
      return;
    }
    if (!body || body.length > 5000) {
      this.error = 'Write a message of 1–5,000 characters.';
      return;
    }
    let selectedId = '';
    this.os.update((data) => {
      let thread = data.threads.find((item) => phoneIdentity(item.phone) === phoneIdentity(phone));
      if (!thread) {
        thread = {
          id: crypto.randomUUID(),
          phone,
          contactName:
            data.contacts.find((contact) => phoneIdentity(contact.phone) === phoneIdentity(phone))
              ?.name ?? phone,
          messages: [],
        };
        data.threads.push(thread);
      }
      thread.messages.push({
        id: crypto.randomUUID(),
        body,
        at: new Date().toISOString(),
        mine: true,
        read: true,
      });
      thread.draft = '';
      selectedId = thread.id;
      if (data.messageDraft && phoneIdentity(data.messageDraft.phone) === phoneIdentity(phone))
        data.messageDraft = undefined;
    });
    this.selectedId = selectedId;
    this.recipient = phone;
    this.body = '';
    this.mode = 'thread';
    this.error = '';
    this.os.feedback('Message saved locally. No SMS was sent.');
  }
  async discardDraft(): Promise<void> {
    if (!(await this.os.confirm('Discard this message draft?'))) return;
    this.body = '';
    this.recipient = this.selected?.phone ?? '';
    this.saveDraft();
    this.os.feedback('Draft discarded');
  }
  async deleteThread(thread: MessageThread): Promise<void> {
    if (!(await this.os.confirm('Delete this conversation and its draft?'))) return;
    this.os.update((data) => {
      data.threads = data.threads.filter((item) => item.id !== thread.id);
    });
    this.selectedId = '';
    this.body = '';
    this.mode = 'list';
    this.os.feedback('Conversation deleted');
  }
  async deleteMessage(thread: MessageThread, message: MessageItem): Promise<void> {
    if (!(await this.os.confirm('Delete this local message?'))) return;
    this.os.update((data) => {
      const target = data.threads.find((item) => item.id === thread.id);
      if (target) target.messages = target.messages.filter((item) => item.id !== message.id);
    });
  }
  simulateIncoming(existing?: MessageThread): void {
    if (!this.os.data()?.settings.demoMode) return;
    const phone = existing?.phone ?? this.contacts[0]?.phone ?? '55501001';
    let title = 'Demo message';
    this.os.update((data) => {
      let thread = data.threads.find((item) => phoneIdentity(item.phone) === phoneIdentity(phone));
      if (!thread) {
        thread = {
          id: crypto.randomUUID(),
          phone,
          contactName:
            data.contacts.find((contact) => phoneIdentity(contact.phone) === phoneIdentity(phone))
              ?.name ?? phone,
          messages: [],
        };
        data.threads.push(thread);
      }
      title = thread.contactName;
      thread.messages.push({
        id: crypto.randomUUID(),
        body: 'Hello from the local simulator. This is a demo incoming message.',
        at: new Date().toISOString(),
        mine: false,
        read: this.selectedId === thread.id && this.mode === 'thread',
      });
    });
    this.os.notify(title, 'Simulated incoming message');
  }
}
