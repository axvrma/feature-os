import { expect, test, type Page, type BrowserContext } from '@playwright/test';

const appNames = [
  'Phone',
  'Contacts',
  'Messages',
  'Clock',
  'Calculator',
  'Calendar',
  'Notes',
  'Music',
  'Snake',
  'Gallery',
  'Files',
  'Profiles',
  'Settings',
];
async function home(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'End / home key', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
}
async function open(page: Page, name: string): Promise<void> {
  await home(page);
  await page
    .getByRole('group', { name: 'Apps', exact: true })
    .getByRole('button', { name, exact: true })
    .click();
  await expect(
    page.locator('.application').getByRole('heading', { name, exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('.application')).not.toContainText('Opening ' + name + '…');
}
async function waitSaved(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('feature-phone-os', 2);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const result = await new Promise<unknown>((resolve, reject) => {
          const req = db.transaction('state').objectStore('state').get('current');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        db.close();
        return Boolean(result);
      }),
    )
    .toBe(true);
}

async function offlineReady(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, {
    timeout: 40_000,
  });
  await expect(page.locator('.offline-badge')).toContainText('READY FOR LIFE OFFLINE', {
    timeout: 40_000,
  });
}

const runtimeErrors = new WeakMap<BrowserContext, string[]>();

test.beforeEach(async ({ page, context }) => {
  const errors: string[] = [];
  const observed = new WeakSet<Page>();
  runtimeErrors.set(context, errors);
  const watch = (surface: Page): void => {
    if (observed.has(surface)) return;
    observed.add(surface);
    surface.on('pageerror', (error) => errors.push(`Runtime: ${error.message}`));
    surface.on('console', (message) => {
      if (message.type() === 'error') errors.push(`Console: ${message.text()}`);
    });
  };
  context.on('page', watch);
  for (const surface of context.pages()) watch(surface);
  // Register listeners before navigation so startup CSP and bootstrap errors are included.
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
});

test.afterEach(async ({ context }) => {
  expect(
    runtimeErrors.get(context) || [],
    'All app pages must have a clean startup and runtime console',
  ).toEqual([]);
});

test('every launcher app opens and the mobile device fits the viewport', async ({ page }) => {
  await page.screenshot({
    path: `test-results/showcase-${test.info().project.name}.png`,
    fullPage: true,
  });
  for (const name of appNames) {
    await open(page, name);
    await expect(page.locator('.application')).not.toContainText('Could not open this application');
  }
  await home(page);
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

test('hardware arrows wrap focus, native editing stays native, and physical multi-tap composes text', async ({
  page,
}) => {
  await page
    .getByRole('group', { name: 'Apps' })
    .getByRole('button', { name: 'Phone', exact: true })
    .focus();
  await page.keyboard.press('ArrowLeft');
  await expect(
    page
      .getByRole('group', { name: 'Apps' })
      .getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
  await open(page, 'Notes');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  const title = page.getByRole('textbox', { name: 'Note title' });
  await title.fill('qe ch 123');
  await title.press('ArrowLeft');
  await title.press('Backspace');
  await expect(title).toHaveValue('qe ch 13');
  await title.fill('');
  await page.getByRole('button', { name: 'Key 2 abc', exact: true }).click();
  await page.getByRole('button', { name: 'Key 2 abc', exact: true }).click();
  await page.getByRole('button', { name: 'Key 2 abc', exact: true }).click();
  await expect(title).toHaveValue('c');
  await page.getByRole('button', { name: 'Key # case', exact: true }).click();
  await page.getByRole('button', { name: 'Key 3 def', exact: true }).click();
  await expect(title).toHaveValue('cD');
});

test('contact, conversation, and call lifecycle work together', async ({ page }) => {
  await open(page, 'Contacts');
  await page.getByRole('button', { name: 'New contact', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Offline Friend');
  await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill('+15550123456');
  await page.getByRole('button', { name: 'Save contact', exact: true }).click();
  await expect(page.locator('os-contacts')).toContainText('Offline Friend');
  await page.getByRole('button', { name: 'Right soft key', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('6335463');
  await expect(page.locator('os-contacts')).toContainText('Offline Friend');
  await page
    .locator('os-contacts')
    .getByRole('button', { name: /Offline Friend/ })
    .click();
  await page.locator('os-contacts').getByRole('button', { name: 'Message', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message body' })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Message body' })
    .fill('Saved locally, with a little nostalgia.');
  await page.getByRole('button', { name: 'Send locally', exact: true }).click();
  await expect(page.locator('os-messages')).toContainText(
    'Saved locally, with a little nostalgia.',
  );
  await expect(page.locator('os-messages')).toContainText('Local outgoing');
  await open(page, 'Phone');
  await page.getByRole('textbox', { name: 'Dial number' }).fill('+15550123456');
  await page.getByRole('button', { name: 'Simulate call', exact: true }).click();
  await expect(page.locator('.call-state')).toHaveText('dialing');
  await expect(page.locator('.call-state')).toHaveText('ringing');
  await expect(page.locator('.call-state')).toHaveText('connected');
  await page.getByRole('button', { name: 'End call', exact: true }).click();
  await expect(page.locator('.call-state')).toHaveText('ended');
  await page.getByRole('button', { name: 'Back to phone', exact: true }).click();
  await page.getByRole('button', { name: /^History ·/ }).click();
  await expect(page.locator('os-phone')).toContainText('Offline Friend');
  await expect(page.locator('os-phone')).toContainText('Simulated call ended');
  await page.reload();
  await open(page, 'Contacts');
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('Offline Friend');
  await expect(page.locator('os-contacts')).toContainText('+15550123456');
});

test('calculator, notes recovery, calendar, clock and snake perform real actions', async ({
  page,
}) => {
  await open(page, 'Calculator');
  for (const name of ['2', '+', '3', 'Multiply', '4', 'Equals'])
    await page.locator('os-calculator').getByRole('button', { name, exact: true }).click();
  await expect(page.locator('os-calculator output')).toHaveText('14');
  await open(page, 'Notes');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note title' }).fill('Recovered thought');
  await page.getByRole('textbox', { name: 'Note body' }).fill('Draft recovery survives refresh.');
  await page.reload();
  await open(page, 'Notes');
  await page.getByRole('button', { name: /Recover draft · Recovered thought/ }).click();
  await expect(page.getByRole('textbox', { name: 'Note body' })).toHaveValue(
    'Draft recovery survives refresh.',
  );
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.locator('os-notes')).toContainText('Recovered thought');
  await open(page, 'Calendar');
  await page.getByRole('button', { name: 'Add event', exact: true }).click();
  await page.getByRole('textbox', { name: 'Event title' }).fill('Local gathering');
  await page.getByLabel('Event time', { exact: true }).fill('18:30');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.locator('os-calendar')).toContainText('Local gathering');
  await open(page, 'Clock');
  await page.getByRole('button', { name: 'New alarm', exact: true }).click();
  await page.getByLabel('Alarm time', { exact: true }).fill('23:59');
  await page.getByRole('textbox', { name: 'Alarm label' }).fill('Browser open reminder');
  await page.getByRole('button', { name: 'Save alarm', exact: true }).click();
  await expect(page.locator('os-clock')).toContainText('Browser open reminder');
  await page.getByRole('button', { name: 'Timer', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Timer minutes' }).fill('0');
  await page.getByRole('spinbutton', { name: 'Timer seconds' }).fill('1');
  await page.getByRole('button', { name: 'Start timer', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /Timer/ })).toBeVisible();
  await open(page, 'Snake');
  await page.locator('os-snake').getByRole('button', { name: 'Start', exact: true }).click();
  await expect(
    page.locator('os-snake').getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await page.locator('os-snake').getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.locator('os-snake').getByRole('button', { name: 'Resume', exact: true }),
  ).toBeVisible();
});

function wavFixture(): Buffer {
  const sampleRate = 8000;
  const samples = sampleRate;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples * 2, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(
      Math.round(Math.sin((i * 2 * Math.PI * 220) / sampleRate) * 100),
      44 + i * 2,
    );
  return bytes;
}
const pngFixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZQAAAABJRU5ErkJggg==',
  'base64',
);

test('local audio, photos and files survive reload and remain playable offline', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await open(page, 'Music');
  await page
    .locator('os-music input[type=file]')
    .setInputFiles({ name: 'local-tone.wav', mimeType: 'audio/wav', buffer: wavFixture() });
  await expect(page.locator('os-music')).toContainText('local-tone');
  await page.locator('os-music').getByRole('button', { name: 'Play', exact: true }).click();
  await expect(
    page.locator('os-music').getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await open(page, 'Gallery');
  await page
    .locator('os-gallery input[type=file]')
    .first()
    .setInputFiles({ name: 'tiny-photo.png', mimeType: 'image/png', buffer: pngFixture });
  await expect(page.locator('os-gallery .photo-thumb')).toHaveCount(1);
  await open(page, 'Files');
  await page.locator('os-files input[type=file]').setInputFiles({
    name: 'offline-note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Offline files stay on this device.'),
  });
  await expect(page.locator('os-files')).toContainText('offline-note.txt');
  await waitSaved(page);
  await offlineReady(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await open(page, 'Music');
  await expect(page.locator('os-music')).toContainText('local-tone');
  await page.locator('os-music').getByRole('button', { name: 'Play', exact: true }).click();
  await expect(
    page.locator('os-music').getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await open(page, 'Gallery');
  await expect(page.locator('os-gallery .photo-thumb img')).toBeVisible();
  await open(page, 'Files');
  await page
    .locator('os-files')
    .getByRole('button', { name: /offline-note.txt/ })
    .click();
  await expect(page.locator('os-files pre')).toHaveText('Offline files stay on this device.');
  await context.setOffline(false);
});

test('production manifest, security headers, offline navigation and CRUD survive reopening', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120_000);
  const response = await request.get('/');
  expect(response.headers()['content-security-policy']).toContain("object-src 'none'");
  const manifest = (await (await request.get('/manifest.webmanifest')).json()) as {
    display: string;
    icons: Array<{ src: string; type: string; sizes: string }>;
  };
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png')).toBe(
    true,
  );
  expect(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.type === 'image/png')).toBe(
    true,
  );
  for (const icon of manifest.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
  await offlineReady(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  for (const name of appNames) await open(page, name);
  await open(page, 'Notes');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note title' }).fill('Airplane mode note');
  await page.getByRole('textbox', { name: 'Note body' }).fill('Created without a network.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.locator('os-notes')).toContainText('Airplane mode note');
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/', { waitUntil: 'domcontentloaded' });
  await open(reopened, 'Notes');
  await expect(reopened.locator('os-notes')).toContainText('Created without a network.');
  await context.setOffline(false);
});
