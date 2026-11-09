import { OS_APPS } from './app-registry';
import { moveGrid, OsNavigationService } from './navigation.service';
describe('Feature OS registry and navigation', () => {
  it('registers exactly the thirteen implemented built-in apps with unique metadata', () => {
    expect(OS_APPS.map((a) => a.id)).toEqual([
      'dialer',
      'contacts',
      'messages',
      'clock',
      'calculator',
      'calendar',
      'notes',
      'music',
      'snake',
      'gallery',
      'files',
      'profiles',
      'settings',
    ]);
    expect(new Set(OS_APPS.map((a) => a.id)).size).toBe(OS_APPS.length);
    expect(OS_APPS.every((a) => a.title && a.icon && /^#[a-f0-9]{6}$/i.test(a.tone))).toBeTrue();
  });
  it('wraps columns correctly on a partial last row', () => {
    expect(moveGrid(12, 'down', 13)).toBe(0);
    expect(moveGrid(1, 'up', 13)).toBe(10);
    expect(moveGrid(11, 'down', 13)).toBe(2);
    expect(moveGrid(12, 'right', 13)).toBe(0);
    expect(moveGrid(0, 'left', 13)).toBe(12);
    expect(moveGrid(0, 'up', 0)).toBe(0);
  });
  it('restores previous screens/context and home clears the stack', () => {
    const nav = new OsNavigationService();
    nav.open('contacts');
    nav.open('messages', { phone: '12345' });
    nav.back();
    expect(nav.screen()).toBe('contacts');
    expect(nav.context()).toEqual({});
    nav.open('dialer', { phone: '999' });
    nav.home();
    nav.back();
    expect(nav.screen()).toBe('home');
    expect(nav.context()).toEqual({});
    expect(nav.lastApp()).toBe('dialer');
  });
});
