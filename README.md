# Feature OS 2.0

A private, offline-first feature-phone simulator built with Angular 22. An original phone shell, real keypad navigation, and thirteen connected local applications bring the classic phone experience to a browser. No account, backend, analytics, or cloud database is required.

Calls and messages are **local simulations**. Separate, explicit links can open your device’s dialer or SMS app; Feature OS cannot place cellular calls or send real SMS by itself.

## Applications

- **Phone:** number entry and contact suggestions; dialing, ringing, connected, canceled, and ended simulations; incoming/missed demos, duration, history, deletion, and redial.
- **Contacts:** create, edit, delete, favorite, sort, search by name/number/T9, and import/export vCards.
- **Messages:** local conversations, recipient selection, persisted drafts, read/unread state, search, message/conversation deletion, and optional incoming demos.
- **Clock:** local time, labeled one-shot/repeating alarms, stop/snooze, browser notifications, countdown, stopwatch, and laps.
- **Calculator:** decimals, negative numbers, percentages, arithmetic precedence, clear/backspace, and explicit division-by-zero errors.
- **Calendar:** month navigation, local events and details, upcoming events, and reminders while the browser runs.
- **Notes:** editing, search/sort, deletion confirmation, draft recovery, and text export.
- **Music:** local audio imports, durable blobs, playback/seek/volume, queue order, and deletion. Leaving Music pauses playback; selection/time/volume can recover within the browser session.
- **Snake:** D-pad and numeric steering, pause/resume/restart, difficulty, collision handling, and a persisted best score.
- **Gallery:** local photo import, view/delete/export, and camera/photo-chooser fallback. Image optimization is best effort; animated GIFs remain intact.
- **Files:** imported content, type/size information, safe text/image/audio previews, downloads, deletion, and origin storage estimates.
- **Profiles:** General, Silent, Meeting, and Outdoor apply different **in-app** alert behavior.
- **Settings:** themes, accent/wallpaper, large text, home shortcuts, screen-focused mode, input/sound preferences, notification permissions, storage/recovery, complete backup/restore, reset, installation, and updates.

See [the feature inventory](docs/FEATURE_MATRIX.md), [architecture](docs/ARCHITECTURE.md), [initial audit](docs/PRODUCT_AUDIT.md), [test report](docs/TEST_REPORT.md), and [release notes](docs/RELEASE_NOTES.md).

## Development

Angular 22 requires Node **22.22.3 or newer**. Release verification, CI, and Netlify use Node **24.19.0**; `.nvmrc` provides the local project version. Do not use an older Node 18 shell runtime.

```sh
nvm use
npm ci
npm start
```

Open the localhost URL printed by Angular. Development mode intentionally does not register the production service worker.

```sh
npm run lint
npm run format:check
npm run typecheck
npm run test:unit
npm run build
```

`npm run check` runs those checks in sequence. `npm run format` applies the repository’s Prettier formatting. `npm test` keeps Angular’s interactive unit runner available. Chrome/Chromium must be installed for the Karma suite; set `CHROME_BIN` if it is not discovered automatically.

The production build outputs `dist/ng-os`. Run it locally to exercise the real service worker:

```sh
npm run build
npm run serve:production
```

Open **http://127.0.0.1:4173**. Development `npm start` does not provide production offline caching.

Browser E2E runs against production output, starts its own local test server, and covers desktop and Pixel-sized Chromium viewports. The configuration also uses an installed Google Chrome on macOS when available. Install browser binaries when needed:

```sh
npx playwright install chromium webkit
npm run build
npm run test:e2e
npm run test:e2e:webkit
```

`test:e2e:webkit` selects the optional iPhone-sized WebKit project. `PW_WEBKIT=1 npm run test:e2e` runs all three projects, as CI does. The dedicated E2E server enables a local worker-version test endpoint; the ordinary production server disables it. Screenshots, traces, and reports are retained for failed E2E cases.

Actual results and environment limits belong in [the test report](docs/TEST_REPORT.md). GitHub Actions runs clean install, static checks, unit tests, production build, and browser E2E, then uploads reports/build artifacts; local success does not imply that a hosted CI run has completed.

## Controls

- Click/tap phone keys or application controls.
- Arrow keys move launcher focus; vertical navigation wraps within a launcher column, and horizontal navigation wraps through the app list.
- Enter activates the focused control. Native form fields keep normal text entry and selection behavior.
- Q / E invoke the left/right contextual softkey outside text fields. F1 / F2 also work while editing.
- C invokes the call key outside text fields.
- Escape / H return home; H is ordinary text while a field is being edited.
- Backspace deletes from a focused editor, or performs the app’s back action outside an editor.
- The phone keypad edits a focused field. With multi-tap enabled, 2–9 cycle letters, 0 inserts space, 1 cycles punctuation, * cycles symbols, and # toggles case. Pause 900 ms to commit a character. Phone-number and contact T9-search fields use numeric input.
- Snake also accepts 2 / 4 / 6 / 8 for steering. Calculator uses * to cycle operators and # to calculate.

Visible softkey labels change with application context. Native dropdowns, date/time fields, file pickers, and sliders retain browser keyboard/touch behavior.

## Local data and backups

Application data lives in the versioned `feature-phone-os` IndexedDB database. Version 2 separates ordinary state from media blobs, migrates the previous version’s state and embedded audio, and avoids reseeding an existing installation. Sample content is created only for a new installation or an explicit reset.

Use **Settings → Export complete backup** before clearing browser data, changing devices, or resetting. JSON backups include imported files. Restore validates format, record fields, and file sizes before asking to replace local data. Contacts also support `.vcf`; notes and imported content can be exported individually.

IndexedDB revision checks prevent one open tab from silently replacing another tab’s saved edits. A conflict keeps the losing session available for export and asks you to reload; edits are not automatically merged. If IndexedDB is unavailable, text falls back to localStorage and imported files remain session-only. If persistent storage fails, the UI warns you; export a complete backup before closing. Recovery export preserves original database/fallback copies, available binary content, and pending session files for diagnosis; it is distinct from a normal restore backup. It reports unreadable records explicitly, so retain the original installation when recovery is incomplete. Browser quota, private browsing, clearing site data, or storage eviction can remove local content. A durable-storage request is available in Settings where supported.

New imports have practical limits: vCards 2 MB/5,000 contacts, audio and ordinary files 25 MB each, and gallery images 10 MB each. Complete JSON backup export and restore are limited to a 150 MB envelope including encoded file content; export large libraries individually through Files before creating a smaller backup. Existing oversized audio is preserved during migration and can restore when it fits that backup envelope. Supported audio/image codecs depend on the browser. Text previews show the first 100 KB without executing HTML.

## Install and use offline

Serve the **production build** over HTTPS or localhost. Load once online and wait for the offline-ready indicator in the guide or Settings; the worker prefetches the application shell, lazy application chunks, and bundled assets. Reload to ensure the service worker controls the page before testing offline.

- **Chrome / Edge on desktop or Android:** use the install button when offered, or the browser menu’s install option.
- **iPhone / iPad:** open in Safari, then **Share → Add to Home Screen**. The browser may not expose an install prompt.
- Other browsers can use the normal website; install UI and background behavior vary.

After successful caching, the core applications and imported local media work without an internet connection. External `tel:` / `sms:` handoffs depend on the device and installed applications. New releases show an update action rather than forcing a reload. Before an update reload, the active app saves supported editors/drafts and blocks reload when a contact, event, or alarm form is invalid. Pending durable writes finish first; an unresolved save failure prevents reload. Active calls, playback, and games stop on reload.

## Browser limitations

- Alarms, countdown notifications, and event reminders are best effort while the browser can execute. Closing or suspending it can prevent alerts. This is not a dependable wake-up alarm.
- Browser audio usually requires a user gesture. Notification permission is requested only through an explicit action. Denial leaves in-app feedback available.
- Profiles affect Feature OS alerts only, not your device’s system sound settings. Vibration is optional and often unavailable.
- Camera capture uses an explicit file/photo chooser; unsupported devices can import an existing image.
- Files lists only content imported into this app, not unrestricted device storage.
- Online/offline status reflects browser connectivity, not cellular reception. Battery percentages and mobile signal are not fabricated.

## Netlify

The default configuration uses a clean npm install and production build, publishes `dist/ng-os`, and includes SPA fallback, manifest/service-worker content types, controlled cache headers, CSP, and security headers. Deploy from the desired branch with the checked-in `netlify.toml`. HTTPS is required outside localhost for service workers.

A local build does not prove that Netlify deployment, real-device installation, or Safari/iOS standalone launch succeeded. Consult [the test report](docs/TEST_REPORT.md) for verified results and remaining checks.
