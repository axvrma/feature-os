# Feature OS 2.0.0 release notes

Release candidate prepared on 2026-11-09 from the previous `master` baseline, `cd0efa9`. This document records implemented behavior; TEST_REPORT.md is the authority for execution results and platform checks.

## One coherent local operating environment

The Angular application now has a thin composition root, a shared signal-backed OS state, a predictable navigation stack, a centralized keypad/focus dispatcher, and independent application components loaded in feature groups. The original device shell provides desktop and mobile presentations, contextual softkeys, original branding, native focus/keyboard access, reduced motion, and light/dark/high-contrast/classic appearances.

## Applications

Phone now has a truthful local call lifecycle, incoming/missed demos, elapsed duration, history management, and explicit dialer handoff. Contacts now supports CRUD, favorites, T9/name/number search, sorting, validation, and vCards. Messages supports recipients, persistent local conversations/drafts, search, read/unread state, deletion, optional incoming demos, and separate SMS handoff.

Clock adds editable repeat schedules, ringing/stop/snooze, optional notifications, countdown, stopwatch, and laps. Calculator and Calendar are active applications rather than legacy placeholders. Notes adds deletion, search/sort, draft recovery, and export. Snake gains a separate tested engine, difficulty, valid food generation, reliable collision/game-over handling, and timer cleanup.

Music imports persistent audio blobs and provides playback/seek/volume, queue management, deletion, session position recovery, and resource cleanup. Gallery imports/views/deletes/exports photos with a camera/chooser fallback. Files provides a sandboxed imported-content catalogue with safe previews and downloads. Profiles apply meaningful in-app alert differences. Settings connects customization, accessibility, input, permissions, storage, backup/restore, reset, install, and updates.

## Data preservation and offline preparation

The existing `feature-phone-os` database identity is retained. Version 2 adds a separate media store, migrates older state and embedded audio, serializes transaction completion, prevents sample data from repopulating deleted history, and reports storage failure/fallback honestly. Complete backups include imported files; restore validates data before a confirmed replacement. Recovery copies include available binary content and remain exportable when normal state loading fails. Corrupt collection/draft fields, impossible dates, duplicate IDs, and unsupported future schemas are rejected without replacing the original records. Quota failures retain new files in session memory for export or an atomic retry.

The production manifest includes PNG/maskable branding and standalone launch. Angular’s worker prefetches the app shell, feature chunks, and local assets. Critical rendering no longer relies on remote font CSS. Update controls prepare valid active editors/drafts, block invalid forms, wait for durable writes, and preserve the running version when saving cannot finish. Netlify configuration includes cache/MIME/security headers and SPA fallback.

## Build and verification tooling

The repository provides `lint`, `format:check`, `typecheck`, `test:unit`, `build`, and combined `check` scripts; `format` applies consistent formatting. `serve:production` serves the built PWA for real worker checks. Playwright supplies desktop/mobile Chromium projects and optional mobile WebKit through `test:e2e` and `test:e2e:webkit`. GitHub Actions uses a clean Node 24.19.0 install and uploads reports/build artifacts.

New media imports are limited to 25 MB for audio/ordinary files and 10 MB for gallery images. Complete backup export/restore has a 150 MB envelope limit including encoded media; migrated older audio can exceed the new-upload limit when it fits that envelope.

## Browser boundaries

- All calls and in-app messages are simulations. Real cellular/SMS activity is an explicit external-device handoff only.
- Alarms and reminders depend on a running browser. Closed or suspended apps cannot guarantee wake-up alerts.
- Browser notification permission, audio gestures, vibration support, camera choosers, installation UI, codecs, and storage quotas vary by platform.
- Music intentionally pauses when its application closes. Embedded audio-tag extraction and background audio service behavior are not provided.
- Browser storage is local to this origin/profile; clearing or eviction can remove content. Export a backup before reset, moving devices, or clearing site data.

## Review and release status

Automated checks, production-browser smoke/offline testing, and any blocked checks are recorded in TEST_REPORT.md with exact commands and results. A production build alone does not establish real-device installation, standalone Safari/iOS behavior, or successful Netlify deployment. These must remain explicitly unverified until actually exercised.

## Release engineering

- Aligned local/CI/Netlify Node configuration to 24.19.0 and retained Angular major 22 with compatible security updates.
- Added ESLint, formatting, strict browser-test type checks, Playwright production tests and GitHub Actions artifacts.
- Tightened initial bundle warning/error budgets to 500/650 kB.
- Removed all npm audit advisories from the resolved tree, including development tools, using compatible updates and a scoped patched minimatch override.
- Detailed verification, resolved failures and unverified external platform steps are recorded in TEST_REPORT.md. Netlify deployment and OS-level installation are not claimed by this release preparation.

- Added cross-tab revision conflict protection and corruption-repair regression coverage.
- Persisted media uses portable binary buffers with legacy Blob read compatibility, including WebKit.
- Disabled generated inline critical-CSS JavaScript to keep the strict script CSP working without startup console failures.
