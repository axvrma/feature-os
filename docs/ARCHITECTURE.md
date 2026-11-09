# Feature OS 2.0 architecture

## Composition and ownership

The application remains Angular 22 and TypeScript. `main.ts` bootstraps a standalone `AppComponent`, whose only responsibility is composing `DeviceShellComponent`. The previous monolithic OS and disconnected routed implementation are replaced by one active component tree.

- `core/os-models.ts` defines typed app, record, media, and preference contracts.
- `core/app-registry.ts` is the launcher’s application inventory.
- `core/navigation.service.ts` owns the active screen, launch context, back stack, selected launcher index, and last-used app.
- `core/os-state.service.ts` owns the durable state signal, serialized persistence requests, feedback, confirmation, in-app notifications, and active-session alarm/event checks.
- `core/os-storage.service.ts` owns schema migration, IndexedDB transactions, the separate media store, fallback warnings, recovery copies, and the write queue.
- `core/keypad.service.ts` maps hardware keys and carries on-screen key events; `core/input/multi-tap.ts` implements focused text edits independently of contact T9 matching.
- `core/pwa.service.ts` owns connectivity, install-prompt availability, offline readiness, update detection, and controlled reload.
- `shell/device-shell.component.*` renders the original device, status, launcher, contextual softkeys, keypad, confirmation/ringing overlays, and desktop guide.
- `features/communications/` contains independent Phone, Contacts, and Messages components plus pure contact/vCard/call-lifecycle logic.
- `features/productivity/` contains Clock, Calculator, Calendar, Notes, and Snake, with independent arithmetic/game engines. The session clock-tools service lives in `core/clock-tools.service.ts` and is initialized with the shell so an active countdown can recover before the Clock application is opened.
- `features/media/` contains Music, Gallery, and Files; they share the persisted media catalogue and blob store.
- `features/system/` contains Profiles and Settings.

The shell dynamically imports four feature groups. Angular’s worker prefetches the resulting production chunks, allowing secondary apps to open offline after first caching. Features do not depend on shell internals.

## State and lifecycle

`OsStateService.data` is the single durable source of truth. A feature submits an `update` callback; the service clones the previous state, applies the change, publishes a new signal value, and queues a storage snapshot. Views derive their lists from the current state rather than maintaining competing mutable copies. Shared state uses Angular signals; the shell and active features explicitly use Default change detection under zone-based, event-coalesced execution so ordinary form fields, timers, and async browser callbacks update reliably. Only the active application is mounted, while feature bundles remain lazy loaded.

Editor fields and other transient presentation state remain local to their components. Notes and message drafts write durable draft records as input changes. Contact, event, and alarm forms require saving during normal navigation. A controlled-update `prepareReload` hook saves valid active forms and blocks reload for invalid fields. Phone logs/stops a current simulation and Messages flushes its draft through the same hook. Clock timer/stopwatch services survive navigation within the session. Their frequent monotonic-clock tick is registered outside Angular’s zone; clock signals and the OS’s regular local-time tick update the active display without making every timer tick traverse the app. Music pauses/releases resources on exit; call exit ends and logs an active simulation. Snake clears its loop and stores an improved best score on exit or game over. Destroy hooks and async request counters prevent stale media responses from creating resources after a view has closed.

`FeatureController` is intentionally small: optional contextual soft actions, a key handler returning whether it consumed the event, and a preparation hook for a safe update reload. The shell centralizes ordinary focus navigation, text entry, home, confirmations, and app fallback behavior. Destructive mutations use the shared confirmation UI.

## Navigation and input

Opening an application pushes the previous screen and optional phone/name context. Back restores the previous route context; Home clears the stack. Contacts can launch Phone or Messages with a selected recipient. Returning home restores launcher selection. Applications with nested editors/details handle their own Back before leaving.

The input dispatcher gives modal/ringing UI priority, then global Home and contextual softkeys. Numeric keys edit the current native text control, use multi-tap only for text composition, or reach an application handler such as Snake/Calculator/Dialer. Contact numeric search is marked separately for T9 lookup. Normal hardware input in text fields/selects is preserved; F1/F2 remain available as softkeys during editing.

Launcher movement uses three columns; horizontal movement wraps through all apps, and vertical movement wraps within the active column. Application focus traversal uses visible, enabled native controls. Native browser fields retain date/time, range, select, file-picker, and text-editing behavior.

## Persistence and migration

The existing database name, `feature-phone-os`, and `state/current` record are retained. Schema version 2 adds a `media` store keyed by media ID. Ordinary state contains media metadata and references; object URLs never become durable records. Media entries persist `{id, bytes: ArrayBuffer, type}` for portable WebKit support, while reads retain compatibility with earlier `{id, blob}` entries. Byte conversion finishes before the transaction begins. A revision comparison inside that transaction rejects stale saves from another tab and retains the losing session for recovery; explicit confirmed replacement can repair damaged revision metadata. Old embedded track blobs are moved into the media store during migration. Existing records receive defaults for new fields without refilling deleted samples.

A promise queue serializes writes. IndexedDB commits a state snapshot and any associated media insertion/deletion/replacement in one transaction; completion waits for the transaction, not just an individual request. Media URLs are created only for active previews/playback and revoked when removed or destroyed.

A fresh installation receives sample content. Invalid stored data triggers a recovery experience instead of an automatic reset. Database and localStorage copies, durable binaries, staged session imports, and pending file metadata are available through recovery export. An incomplete read records errors explicitly instead of claiming a complete recovery. When database access is unavailable, explicit fallback warnings explain that text can use localStorage while files remain in memory. Save failures retain the current session state and expose retry/export paths. New blobs stage in memory before writing; a synchronous state/media request error aborts the transaction, and a later retry includes staged files atomically. Successful explicit reset/restore replacement removes stale fallback data so it cannot repopulate a reset installation.

Backup export produces a versioned Feature OS JSON envelope with state and encoded media. Export/restore use a 150 MB envelope limit, including base64 content. Restore validates the envelope, record/draft types, collection limits, impossible dates, duplicate entity IDs, media references, MIME agreement, and blob sizes before confirmation and replacement. New file imports enforce smaller per-file limits while existing oversized audio remains migratable. Reset is explicit and confirmed. vCards are separate contact-only interchange, and individual content exports are local downloads.

## Scheduling and communications

Calls are a local state machine: dialing → ringing → connected → ended, with cancellation before connection and a separate incoming/answer/missed/rejected flow. No browser capability is represented as a native cellular call. `tel:` and `sms:` links validate and encode the recipient and only open following explicit user action. Local outgoing messages have no fabricated network delivery receipt.

Alarm schedules use the browser’s local calendar/time and repeat weekdays. A triggered occurrence records its local date/minute to avoid replaying it repeatedly. Stop/snooze is in-app. Calendar reminders use local event timestamps. Countdown and stopwatch elapsed calculations use a monotonic clock within the running session; a saved countdown deadline can recover a reload within the same browser session.

Browser throttling, device sleep, and termination can prevent alerts. Optional notifications, audio unlocked by a gesture, and supported vibration supplement visible feedback. Profiles only control these in-app effects.

## Offline, accessibility, and security

Production uses Angular’s service worker with prefetch caching for the shell, JS/CSS, icons, and assets. The manifest has standalone launch, root scope/start URL, PNG application icons, and a maskable icon. Critical typography uses system fonts and local symbols. Install/update controls expose platform limitations; update reload runs active-app preparation and waits for pending durable writes. Invalid forms or unresolved persistence failures block reload.

The device and screen-focused layout adapt to small viewports. Native semantic controls, labels, focus indicators, status announcements, high-contrast/classic themes, large text, and reduced-motion styles support accessible interaction. The tiny phone screen remains intentionally scrollable; native controls can also be used directly with keyboard/touch.

User content is rendered through text interpolation. Files do not execute imported HTML; text preview is capped. Imports are validated and sized. No mandatory backend, analytics, geolocation, microphone, or remote font requests are introduced. Netlify headers define a same-origin CSP, disable embedding, and provide MIME/cache controls. Critical-CSS inlining is disabled so the build does not inject a script that violates that CSP. Browser sandboxed storage is never presented as unrestricted filesystem access.

See TEST_REPORT.md for actual validation evidence rather than treating this design description as a deployment or browser-certification claim.

## Repeatable checks

`npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:unit`, and `npm run build` form the `npm run check` gate. `npm run serve:production` serves built output on localhost with production MIME/security/cache behavior. Playwright’s `test:e2e` uses its own production-output server and optional test-only worker version changes; desktop/mobile Chromium run by default, with an iPhone-sized WebKit project enabled by `PW_WEBKIT=1` or selected through `test:e2e:webkit`.

GitHub Actions installs from the lockfile and runs static/unit/build/browser checks with Node 24.19.0. It uploads test evidence and production artifacts. Script presence and CI configuration do not constitute proof of a successful hosted run; see TEST_REPORT.md for actual results.
