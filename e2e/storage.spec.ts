import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'End / home key', exact: true }).click();
  await page
    .getByRole('group', { name: 'Apps', exact: true })
    .getByRole('button', { name, exact: true })
    .click();
}
async function note(page: Page, title: string): Promise<void> {
  await open(page, 'Notes');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note title' }).fill(title);
  await page.getByRole('textbox', { name: 'Note body' }).fill('A locally saved thought.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
}

test('denied IndexedDB uses an explained text fallback that survives reload', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      get() {
        throw new DOMException('Storage denied for test', 'SecurityError');
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
  await open(page, 'Settings');
  await expect(page.locator('os-settings')).toContainText('IndexedDB unavailable');
  await expect(page.locator('os-settings')).toContainText('imported files are session-only');
  await note(page, 'Fallback note');
  await page.reload();
  await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
  await open(page, 'Notes');
  await expect(page.locator('os-notes')).toContainText('Fallback note');
});

test('validated backup, confirmed reset, and restore retain saved content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('group', { name: 'Apps', exact: true })).toBeVisible();
  await note(page, 'Backup round trip');
  await open(page, 'Settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export complete backup', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const buffer = await readFile(path!);
  const backup = JSON.parse(buffer.toString()) as {
    format: string;
    version: number;
    data: { notes: Array<{ title: string }> };
  };
  expect(backup.format).toBe('feature-os');
  expect(backup.version).toBe(2);
  expect(backup.data.notes.some((item) => item.title === 'Backup round trip')).toBe(true);
  await page.getByRole('button', { name: 'Reset all data…', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Please confirm' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await open(page, 'Notes');
  await expect(page.locator('os-notes')).toContainText('Backup round trip');
  await open(page, 'Settings');
  await page.getByRole('button', { name: 'Reset all data…', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await open(page, 'Notes');
  await expect(page.locator('os-notes')).not.toContainText('Backup round trip');
  await open(page, 'Settings');
  await page
    .locator('os-settings input[type=file]')
    .setInputFiles({ name: 'feature-os-backup.json', mimeType: 'application/json', buffer });
  await expect(page.getByRole('dialog', { name: 'Please confirm' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await open(page, 'Notes');
  await expect(page.locator('os-notes')).toContainText('Backup round trip');
});
