import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatureController, SoftAction } from '../../core/feature-contract';
import { Contact, KeypadKey } from '../../core/os-models';
import { OsStateService } from '../../core/os-state.service';
import { OsNavigationService } from '../../core/navigation.service';
import {
  downloadText,
  exportVcard,
  filterContacts,
  normalizePhone,
  parseVcard,
  phoneIdentity,
  validPhone,
} from './communication.utils';

@Component({
  selector: 'os-contacts',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: ` <section class="comm" aria-label="Contacts application">
    @if (mode === 'edit') {
      <h2>{{ editingId ? 'Edit contact' : 'New contact' }}</h2>
      <form class="comm" (ngSubmit)="save()">
        <label
          >Name<input
            name="contactName"
            [(ngModel)]="name"
            maxlength="100"
            autocomplete="name"
            required
        /></label>
        <label
          >Phone number<input
            name="contactPhone"
            [(ngModel)]="phone"
            maxlength="40"
            type="tel"
            autocomplete="tel"
            required
        /></label>
        <label class="check"
          ><input name="favorite" type="checkbox" [(ngModel)]="favorite" />Favorite</label
        >
        @if (error) {
          <p class="error" role="alert">{{ error }}</p>
        }
        <div class="actions">
          <button type="submit">Save contact</button
          ><button type="button" (click)="cancelEdit()">Cancel</button>
        </div>
      </form>
    } @else if (selected; as contact) {
      <div class="detail">
        <div class="avatar" aria-hidden="true">{{ contact.name.charAt(0).toUpperCase() }}</div>
        <h2>{{ contact.name }}</h2>
        <p>{{ contact.phone }}</p>
        <p>{{ contact.favorite ? '★ Favorite' : 'Contact' }}</p>
      </div>
      <div class="actions">
        <button type="button" (click)="call(contact)">Simulate call</button>
        <button type="button" (click)="message(contact)">Message</button>
        <button type="button" (click)="edit(contact)">Edit</button>
        <button type="button" (click)="toggleFavorite(contact)">
          {{ contact.favorite ? 'Unfavorite' : 'Favorite' }}
        </button>
        <button type="button" (click)="remove(contact)">Delete contact</button>
        <button type="button" (click)="exportOne(contact)">Export vCard</button>
      </div>
    } @else {
      <label
        >Search name, number or T9<input
          aria-label="Search contacts"
          data-keypad-numeric
          name="searchContacts"
          [(ngModel)]="query"
          maxlength="100"
          type="search"
      /></label>
      <div class="row">
        <label class="check"><input type="checkbox" [(ngModel)]="favoritesOnly" />Favorites</label>
        <label
          >Sort<select aria-label="Contact sort order" [(ngModel)]="sort">
            <option value="name">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="favorite">Favorites first</option>
          </select></label
        >
      </div>
      <div class="actions">
        <button type="button" (click)="edit()">New contact</button
        ><button type="button" (click)="exportAll()" [disabled]="!contacts.length">
          Export all
        </button>
      </div>
      <div class="list">
        @for (contact of filtered; track contact.id) {
          <button type="button" (click)="selectedId = contact.id">
            <span
              ><strong>{{ contact.name }} {{ contact.favorite ? '★' : '' }}</strong
              ><small>{{ contact.phone }}</small></span
            ><span aria-hidden="true">›</span>
          </button>
        } @empty {
          <p class="empty">
            {{
              contacts.length
                ? 'No contacts match this search.'
                : 'No contacts yet. Add your first contact.'
            }}
          </p>
        }
      </div>
      <label class="import"
        >Import contacts (.vcf)<input
          type="file"
          accept=".vcf,text/vcard,text/x-vcard"
          (change)="importContacts($event)"
      /></label>
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
    }
  </section>`,
  styleUrl: './communications.scss',
})
export class ContactsComponent implements FeatureController {
  query = '';
  favoritesOnly = false;
  sort = 'name';
  selectedId = '';
  mode: 'list' | 'edit' = 'list';
  editingId = '';
  name = '';
  phone = '';
  favorite = false;
  error = '';
  constructor(
    public readonly os: OsStateService,
    private readonly navigation: OsNavigationService,
  ) {}
  get contacts(): Contact[] {
    return this.os.data()?.contacts ?? [];
  }
  get selected(): Contact | undefined {
    return this.contacts.find((contact) => contact.id === this.selectedId);
  }
  get filtered(): Contact[] {
    return filterContacts(this.contacts, this.query)
      .filter((contact) => !this.favoritesOnly || contact.favorite)
      .sort((a, b) =>
        this.sort === 'favorite' && Boolean(a.favorite) !== Boolean(b.favorite)
          ? Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
          : a.name.localeCompare(b.name) * (this.sort === 'name-desc' ? -1 : 1),
      );
  }
  get left(): SoftAction {
    return {
      label: this.mode === 'edit' ? 'Save' : this.selected ? 'Edit' : 'New',
      run: () => (this.mode === 'edit' ? this.save() : this.edit(this.selected)),
    };
  }
  get right(): SoftAction {
    return {
      label: this.mode === 'edit' ? 'Cancel' : 'Back',
      run: () => {
        if (this.mode === 'edit') this.cancelEdit();
        else if (this.selectedId) this.selectedId = '';
        else this.navigation.back();
      },
    };
  }
  key(key: KeypadKey): boolean {
    if (key === 'back' && (this.mode === 'edit' || this.selectedId)) {
      this.right.run();
      return true;
    }
    if (key === 'call' && this.selected) {
      this.call(this.selected);
      return true;
    }
    return false;
  }
  prepareReload(): boolean {
    if (this.mode !== 'edit') return true;
    this.save();
    if (this.error) this.os.feedback(this.error);
    return !this.error;
  }
  edit(contact?: Contact): void {
    this.editingId = contact?.id ?? '';
    this.name = contact?.name ?? '';
    this.phone = contact?.phone ?? '';
    this.favorite = contact?.favorite ?? false;
    this.error = '';
    this.mode = 'edit';
  }
  cancelEdit(): void {
    this.mode = 'list';
    this.error = '';
  }
  save(): void {
    const name = this.name.trim();
    const phone = normalizePhone(this.phone);
    if (!name || name.length > 100) {
      this.error = 'Enter a name of 1–100 characters.';
      return;
    }
    if (!validPhone(phone)) {
      this.error = 'Enter a valid phone number, with at least two digits.';
      return;
    }
    if (
      this.contacts.some(
        (contact) =>
          contact.id !== this.editingId && phoneIdentity(contact.phone) === phoneIdentity(phone),
      )
    ) {
      this.error = 'A contact with that number already exists.';
      return;
    }
    const contact: Contact = {
      id: this.editingId || crypto.randomUUID(),
      name,
      phone,
      favorite: this.favorite,
    };
    this.os.update((data) => {
      const index = data.contacts.findIndex((item) => item.id === contact.id);
      if (index < 0) data.contacts.push(contact);
      else data.contacts[index] = contact;
      data.threads
        .filter((thread) => phoneIdentity(thread.phone) === phoneIdentity(phone))
        .forEach((thread) => (thread.contactName = name));
    });
    this.selectedId = contact.id;
    this.mode = 'list';
    this.error = '';
    this.os.feedback('Contact saved');
  }
  toggleFavorite(contact: Contact): void {
    this.os.update((data) => {
      const item = data.contacts.find((item) => item.id === contact.id);
      if (item) item.favorite = !item.favorite;
    });
  }
  async remove(contact: Contact): Promise<void> {
    if (!(await this.os.confirm(`Delete ${contact.name}? Calls and messages will be kept.`)))
      return;
    this.os.update((data) => {
      data.contacts = data.contacts.filter((item) => item.id !== contact.id);
    });
    this.selectedId = '';
    this.os.feedback('Contact deleted');
  }
  call(contact: Contact): void {
    this.navigation.open('dialer', { phone: contact.phone, name: contact.name });
  }
  message(contact: Contact): void {
    this.navigation.open('messages', { phone: contact.phone, name: contact.name });
  }
  exportOne(contact: Contact): void {
    downloadText('contact.vcf', exportVcard([contact]), 'text/vcard');
  }
  exportAll(): void {
    downloadText('feature-os-contacts.vcf', exportVcard(this.contacts), 'text/vcard');
  }
  async importContacts(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error = '';
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose a vCard smaller than 2 MB.');
      const incoming = parseVcard(await file.text());
      let count = 0;
      this.os.update((data) => {
        const seen = new Set(data.contacts.map((contact) => phoneIdentity(contact.phone)));
        for (const item of incoming) {
          if (!seen.has(phoneIdentity(item.phone))) {
            data.contacts.push({ ...item, id: crypto.randomUUID(), favorite: false });
            seen.add(phoneIdentity(item.phone));
            count++;
          }
        }
      });
      this.os.feedback(
        `Imported ${count} contacts; ${incoming.length - count} duplicate numbers skipped`,
      );
    } catch (error: unknown) {
      this.error = error instanceof Error ? error.message : 'Could not import this vCard.';
    } finally {
      input.value = '';
    }
  }
}
