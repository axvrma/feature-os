import { Contact } from '../../core/os-models';

export function normalizePhone(value: string): string {
  return value.replace(/[\s().-]/g, '');
}
export function validPhone(value: string): boolean {
  return /^\+?[\d*#]{2,32}$/.test(normalizePhone(value));
}
export function phoneIdentity(value: string): string {
  return normalizePhone(value).replace(/^\+/, '');
}
export function t9(value: string): string {
  const groups = ['abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
  return value
    .toLocaleLowerCase()
    .split('')
    .map((letter) => {
      const index = groups.findIndex((group) => group.includes(letter));
      return index < 0 ? '' : String(index + 2);
    })
    .join('');
}
export function filterContacts(contacts: Contact[], query: string): Contact[] {
  const search = query.trim().toLocaleLowerCase();
  return contacts.filter(
    (contact) =>
      !search ||
      contact.name.toLocaleLowerCase().includes(search) ||
      normalizePhone(contact.phone).includes(normalizePhone(search)) ||
      (/^\d+$/.test(search) && t9(contact.name).includes(search)),
  );
}
export function handoffUrl(kind: 'tel' | 'sms', phone: string, body = ''): string {
  if (!validPhone(phone)) return '';
  const number = encodeURIComponent(normalizePhone(phone));
  return `${kind}:${number}${kind === 'sms' && body ? `?body=${encodeURIComponent(body)}` : ''}`;
}
function escapeVcard(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}
function unescapeVcard(text: string): string {
  return text.replace(/\\([nN,;\\])/g, (_, character: string) =>
    /n/i.test(character) ? '\n' : character,
  );
}
export function exportVcard(contacts: Contact[]): string {
  return contacts
    .map((contact) =>
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVcard(contact.name)}`,
        `TEL;TYPE=CELL:${normalizePhone(contact.phone)}`,
        'END:VCARD',
      ].join('\r\n'),
    )
    .join('\r\n');
}
export function parseVcard(text: string): Pick<Contact, 'name' | 'phone'>[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const cards = unfolded.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi);
  if (!cards) throw new Error('No vCard contacts found. Choose a .vcf file.');
  const result: Pick<Contact, 'name' | 'phone'>[] = [];
  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    let name = '';
    let phone = '';
    for (const line of lines) {
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const field = line.slice(0, colon).split(';')[0].toUpperCase();
      const value = line.slice(colon + 1);
      if (field === 'FN') name = unescapeVcard(value).trim();
      if (field === 'N' && !name)
        name = value.split(';').map(unescapeVcard).filter(Boolean).reverse().join(' ').trim();
      if (field === 'TEL' && !phone && validPhone(value)) phone = normalizePhone(value);
    }
    if (name && name.length <= 100 && phone) result.push({ name, phone });
  }
  if (!result.length) throw new Error('No valid names and phone numbers found in this vCard.');
  if (result.length > 5000) throw new Error('Import at most 5,000 contacts at a time.');
  return result;
}
export function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
