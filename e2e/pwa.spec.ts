import { chromium, expect, test, type Page, type BrowserContext } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, {
    timeout: 40_000,
  });
  await expect(page.locator('.offline-badge')).toContainText('READY FOR LIFE OFFLINE', {
    timeout: 40_000,
  });
}

async function iconCaches(page: Page): Promise<Array<{ name: string; urls: string[] }>> {
  return page.evaluate(async () => {
    const summary: Array<{ name: string; urls: string[] }> = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      summary.push({ name, urls: (await cache.keys()).map((request) => request.url) });
    }
    return summary;
  });
}

test('Chromium reports a valid installable manifest in a regular browser profile', async ({
  browserName,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'CDP installability is available in Chromium only.');
  test.setTimeout(90_000);
  const directory = await mkdtemp(join(tmpdir(), 'feature-os-install-'));
  const use = testInfo.project.use;
  let context: BrowserContext | undefined;
  try {
    context = await chromium.launchPersistentContext(directory, {
      ...use.launchOptions,
      headless: true,
      baseURL: use.baseURL,
      viewport: use.viewport,
      userAgent: use.userAgent,
      isMobile: use.isMobile,
      hasTouch: use.hasTouch,
      deviceScaleFactor: use.deviceScaleFactor,
    });
    const page = context.pages()[0] || (await context.newPage());
    await page.goto('/');
    await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
    await ready(page);
    const session = await context.newCDPSession(page);
    try {
      const manifest = await session.send('Page.getAppManifest');
      expect(manifest.errors).toEqual([]);
      expect(JSON.parse(manifest.data || '{}').name).toBe('Feature OS 2.0');
      const result = await session.send('Page.getInstallabilityErrors');
      await testInfo.attach('chromium-regular-profile-installability', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      });
      expect(result.installabilityErrors).toEqual([]);
    } finally {
      await session.detach();
    }
  } finally {
    try {
      await context?.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test('service worker repairs a missing cached icon then serves it offline', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await ready(page);
  try {
    await expect
      .poll(
        async () =>
          (await iconCaches(page))
            .flatMap((cache) => cache.urls)
            .filter((url) => new URL(url).pathname === '/assets/icons/icon-192.png').length,
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);
  } finally {
    await test.info().attach('cache-before-recovery', {
      body: JSON.stringify(await iconCaches(page), null, 2),
      contentType: 'application/json',
    });
    await test.info().attach('worker-state-before-recovery', {
      body: await page.evaluate(async () => await (await fetch('/ngsw/state')).text()),
      contentType: 'text/plain',
    });
  }
  const removed = await page.evaluate(async () => {
    let count = 0;
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys())
        if (new URL(request.url).pathname === '/assets/icons/icon-192.png')
          if (await cache.delete(request)) count++;
    }
    return count;
  });
  expect(removed).toBeGreaterThan(0);
  expect(
    await page.evaluate(async () => {
      const response = await fetch('/assets/icons/icon-192.png', { cache: 'reload' });
      return response.ok && (await response.blob()).size > 0;
    }),
  ).toBe(true);
  await context.setOffline(true);
  expect(
    await page.evaluate(async () => {
      const response = await fetch('/assets/icons/icon-192.png', { cache: 'reload' });
      return response.ok && (await response.blob()).size > 0;
    }),
  ).toBe(true);
  await context.setOffline(false);
});

test('controlled worker update preserves a locally autosaved draft', async ({ page, request }) => {
  test.setTimeout(90_000);
  const control = await request.get('/__e2e/version');
  expect(control.ok(), 'Start the local test server using npm run serve:e2e').toBe(true);
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
  await ready(page);
  await page
    .getByRole('group', { name: 'Apps' })
    .getByRole('button', { name: 'Notes', exact: true })
    .click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note title' }).fill('Update-safe draft');
  await page
    .getByRole('textbox', { name: 'Note body' })
    .fill('Keep this thought through an app update.');
  await page.getByRole('button', { name: 'End / home key', exact: true }).click();
  await page
    .getByRole('group', { name: 'Apps' })
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  try {
    expect((await request.post('/__e2e/version')).ok()).toBe(true);
    await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save & update', exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Save & update', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Please confirm' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
    await page
      .getByRole('group', { name: 'Apps' })
      .getByRole('button', { name: 'Notes', exact: true })
      .click();
    await page.getByRole('button', { name: /Recover draft · Update-safe draft/ }).click();
    await expect(page.getByRole('textbox', { name: 'Note body' })).toHaveValue(
      'Keep this thought through an app update.',
    );
  } finally {
    await request.delete('/__e2e/version');
  }
});
