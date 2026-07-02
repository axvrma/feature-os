import { OS_APPS } from './app-registry';

describe('OS_APPS', () => {
  it('exposes the expected 3x3 launcher surface', () => {
    expect(OS_APPS.length).toBe(9);
    expect(OS_APPS.map((app) => app.id)).toEqual([
      'dialer',
      'contacts',
      'messages',
      'clock',
      'notes',
      'music',
      'snake',
      'profiles',
      'settings',
    ]);
  });

  it('has complete launcher metadata', () => {
    expect(OS_APPS.every((app) => app.title && app.icon && app.tone)).toBeTrue();
  });
});
