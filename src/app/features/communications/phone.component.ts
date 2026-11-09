import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { CallLogEntry, Contact, KeypadKey } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsNavigationService } from '../../core/navigation.service';
import { CallSession } from './call-session';
import {
  filterContacts,
  handoffUrl,
  normalizePhone,
  phoneIdentity,
  validPhone,
} from './communication.utils';

@Component({
  selector: 'os-phone',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './communications.scss',
  template: ` <section class="comm" aria-label="Phone application">
    <p class="notice">Local call simulator · No cellular calls are placed here.</p>
    @if (session && session.phase !== 'idle') {
      <div class="detail" aria-live="polite">
        <div class="avatar" aria-hidden="true">☎</div>
        <h2>{{ session.name }}</h2>
        <p>{{ session.phone }}</p>
        <p class="call-state">
          {{ session.phase === 'incoming' ? 'Incoming · simulated' : session.phase }}
        </p>
        @if (session.connectedAt !== null) {
          <p class="number">{{ duration }}</p>
        }
        @if (session.phase === 'ringing') {
          <p class="muted">Simulated contact answers automatically.</p>
        }
        @if (session.phase === 'incoming') {
          <p class="muted">Answer now, or this demo becomes a missed call after 15 seconds.</p>
        }
      </div>
      <div class="actions">
        @if (session.phase === 'incoming') {
          <button type="button" (click)="answer()">Answer simulation</button
          ><button type="button" (click)="endCall('rejected')">Reject</button
          ><button type="button" (click)="endCall('missed')">Miss now</button>
        } @else if (session.active) {
          <button type="button" (click)="endCall()">
            {{ session.phase === 'connected' ? 'End call' : 'Cancel call' }}
          </button>
        } @else {
          <button type="button" (click)="resetCall()">Back to phone</button
          ><button type="button" (click)="startCall()">Call again</button>
        }
      </div>
    } @else {
      <div class="tabs">
        <button type="button" [attr.aria-pressed]="tab === 'dial'" (click)="tab = 'dial'">
          Dial</button
        ><button type="button" [attr.aria-pressed]="tab === 'history'" (click)="tab = 'history'">
          History · {{ history.length }}
        </button>
      </div>
      @if (tab === 'dial') {
        <label
          >Phone number<input
            aria-label="Dial number"
            class="number"
            type="tel"
            [(ngModel)]="number"
            maxlength="40"
            autocomplete="off"
            placeholder="Enter a number"
        /></label>
        <div class="actions">
          <button type="button" (click)="startCall()">Simulate call</button
          ><button type="button" (click)="number = number.slice(0, -1)" [disabled]="!number">
            ⌫ Delete digit</button
          ><button type="button" (click)="number = ''" [disabled]="!number">Clear</button>
        </div>
        @if (deviceUrl) {
          <a [href]="deviceUrl">Open device dialer ↗</a>
        }
        <div class="list" aria-label="Contact suggestions">
          @for (contact of suggestions; track contact.id) {
            <button type="button" (click)="number = contact.phone">
              <span
                ><strong>{{ contact.name }}</strong
                ><small>{{ contact.phone }}</small></span
              >
            </button>
          }
        </div>
        @if (os.data()?.settings?.demoMode) {
          <div class="actions">
            <button type="button" (click)="incoming()">Demo incoming call</button
            ><button type="button" (click)="missed()">Demo missed call</button>
          </div>
        }
      } @else {
        <div class="actions">
          <button type="button" (click)="redial()" [disabled]="!history.length">Redial last</button
          ><button type="button" (click)="clearHistory()" [disabled]="!history.length">
            Clear history
          </button>
        </div>
        <div class="list">
          @for (call of history; track call.id) {
            <article class="notice">
              <strong>{{ identify(call.phone) || call.name }}</strong>
              <p>{{ call.phone }} · {{ call.direction }}</p>
              <small
                >{{ call.at | date: 'MMM d, HH:mm' }} · {{ call.outcome || 'Simulated' }}
                @if (call.duration) {
                  · {{ formatDuration(call.duration) }}
                }
              </small>
              <div class="actions">
                <button type="button" (click)="dialHistory(call)">Redial</button
                ><button type="button" (click)="message(call)">Message</button
                ><button type="button" (click)="deleteCall(call)">Delete</button>
              </div>
            </article>
          } @empty {
            <p class="empty">No call history. Try a simulated call.</p>
          }
        </div>
      }
    }
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
  </section>`,
})
export class PhoneComponent implements FeatureController, OnDestroy {
  number = '';
  tab: 'dial' | 'history' = 'dial';
  error = '';
  session: CallSession | null = null;
  now = Date.now();
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    public readonly os: OsStateService,
    private readonly navigation: OsNavigationService,
  ) {
    this.number = this.navigation.context().phone ?? '';
  }
  get history(): CallLogEntry[] {
    return [...(this.os.data()?.callLog ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  }
  get suggestions(): Contact[] {
    return this.number
      ? filterContacts(this.os.data()?.contacts ?? [], this.number).slice(0, 5)
      : [];
  }
  get deviceUrl(): string {
    return handoffUrl('tel', this.number);
  }
  get duration(): string {
    return this.formatDuration(this.session?.duration(this.now) ?? 0);
  }
  get left(): SoftAction {
    return {
      label:
        this.session?.phase === 'incoming'
          ? 'Answer'
          : this.session?.phase === 'connected'
            ? 'End'
            : this.session?.active
              ? 'Cancel'
              : 'Call',
      run: () => {
        if (this.session?.phase === 'incoming') this.answer();
        else if (this.session?.active) this.endCall();
        else this.startCall();
      },
    };
  }
  get right(): SoftAction {
    return {
      label:
        this.session?.phase === 'incoming'
          ? 'Reject'
          : this.session?.phase === 'connected'
            ? 'End'
            : this.session?.active
              ? 'Cancel'
              : 'Back',
      run: () => {
        if (this.session?.active)
          this.endCall(this.session.phase === 'incoming' ? 'rejected' : undefined);
        else if (this.session) this.resetCall();
        else this.navigation.back();
      },
    };
  }
  key(key: KeypadKey): boolean {
    if (key === 'call') {
      if (this.session?.phase === 'incoming') this.answer();
      else if (!this.session?.active) this.startCall();
      return true;
    }
    if (key === 'back' && this.session) {
      if (this.session.active)
        this.endCall(this.session.phase === 'incoming' ? 'rejected' : undefined);
      else this.resetCall();
      return true;
    }
    if (this.session?.active) return false;
    if (/^\d$/.test(key) || key === 'star' || key === 'hash') {
      if (this.session) {
        this.resetCall();
        this.number = '';
      }
      this.tab = 'dial';
      if (this.number.length < 40) this.number += key === 'star' ? '*' : key === 'hash' ? '#' : key;
      return true;
    }
    if (key === 'back' && this.number) {
      this.number = this.number.slice(0, -1);
      return true;
    }
    return false;
  }
  identify(phone: string): string {
    return (
      this.os
        .data()
        ?.contacts.find((contact) => phoneIdentity(contact.phone) === phoneIdentity(phone))?.name ??
      ''
    );
  }
  startCall(): void {
    if (this.session?.active) return;
    const phone = normalizePhone(this.number);
    if (!validPhone(phone)) {
      this.error = 'Enter a valid number with at least two digits.';
      return;
    }
    this.error = '';
    this.number = phone;
    this.session = new CallSession(phone, this.identify(phone) || phone);
    this.session.start(Date.now());
    this.startTimer();
  }
  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.now = Date.now();
      this.session?.advance(this.now);
      if (this.session?.phase === 'incoming' && this.now - this.session.started >= 15000)
        this.endCall('missed');
    }, 200);
  }
  private stopTimer(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }
  answer(): void {
    this.session?.answer(Date.now());
    this.now = Date.now();
  }
  endCall(reason?: 'missed' | 'rejected'): void {
    const call = this.session;
    const now = Date.now();
    if (!call || !call.finish(now)) return;
    this.stopTimer();
    this.now = now;
    const direction: CallLogEntry['direction'] = call.incoming
      ? (reason ?? (call.connectedAt === null ? 'missed' : 'received'))
      : 'dialled';
    const outcome =
      direction === 'missed'
        ? 'Simulated missed call'
        : direction === 'rejected'
          ? 'Simulated rejected call'
          : call.phase === 'canceled'
            ? 'Simulation canceled'
            : 'Simulated call ended';
    this.os.update((data) => {
      data.callLog.push({
        id: crypto.randomUUID(),
        name: call.name,
        phone: call.phone,
        at: new Date(call.started).toISOString(),
        direction,
        duration: call.duration(now),
        outcome,
      });
    });
    if (direction === 'missed') this.os.notify('Missed call', `${call.name} · local simulation`);
  }
  resetCall(): void {
    if (this.session?.active) this.endCall();
    this.session = null;
    this.error = '';
  }
  incoming(): void {
    if (!this.os.data()?.settings.demoMode || this.session?.active) return;
    const contact = this.os.data()?.contacts[0];
    this.number = contact?.phone ?? '55501001';
    this.session = new CallSession(this.number, contact?.name ?? 'Demo caller');
    this.session.start(Date.now(), true);
    this.os.notify('Incoming simulation', this.session.name);
    this.startTimer();
  }
  missed(): void {
    this.incoming();
    if (this.session?.phase === 'incoming') this.endCall('missed');
  }
  redial(): void {
    const call = this.history[0];
    if (call) this.dialHistory(call);
  }
  dialHistory(call: CallLogEntry): void {
    this.number = call.phone;
    this.tab = 'dial';
    this.startCall();
  }
  message(call: CallLogEntry): void {
    this.navigation.open('messages', {
      phone: call.phone,
      name: this.identify(call.phone) || call.name,
    });
  }
  async deleteCall(call: CallLogEntry): Promise<void> {
    if (!(await this.os.confirm('Delete this call record?'))) return;
    this.os.update((data) => {
      data.callLog = data.callLog.filter((item) => item.id !== call.id);
    });
  }
  async clearHistory(): Promise<void> {
    if (!(await this.os.confirm('Delete all local call history?'))) return;
    this.os.update((data) => {
      data.callLog = [];
    });
    this.os.feedback('Call history cleared');
  }
  formatDuration(seconds: number): string {
    return `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  prepareReload(): boolean {
    this.endCall();
    return true;
  }
  ngOnDestroy(): void {
    this.endCall();
    this.stopTimer();
  }
}
