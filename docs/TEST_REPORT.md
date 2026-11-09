# Feature OS 2.0 verification

Date: 2026-11-09 (Asia/Kolkata). Branch: `feat/feature-os-2`. Baseline: `cd0efa9`. Implementation commit: `3231065` (release documentation committed separately).

## Environment and reproducibility

The login shell originally selected Node 18.20.6. Verification explicitly uses Node 24.19.0 and npm from `/Users/mrcreatist/.nvm/versions/node/v24.19.0/bin`; `.nvmrc`, Netlify and CI now agree on Node 24.19.0. Angular dependencies remain on major 22 (resolved 22.2.6). Browser unit/E2E runs need a localhost port and browser process permission in this workspace’s sandbox.

For the commands below, the actual shell invocation prefixes npm with `PATH=/Users/mrcreatist/.nvm/versions/node/v24.19.0/bin:$PATH`. On another machine, `nvm use` provides the equivalent runtime.

## Baseline failures and resolved issues

- `npm run build` and `npm test -- --watch=false --browsers=ChromeHeadless` initially exited 3 under Node 18 before compilation.
- Compatible-runtime baseline build reached compilation and failed the existing component-style budget: 24.04 kB, 36 bytes above the 24 kB error threshold. The old 1,255-line stylesheet was replaced; the budget was not relaxed.
- The first sandboxed Karma run failed binding port 9876 (`EPERM`); an authorized browser run worked. That rerun compiled after the expanded registry was written and exposed the obsolete nine-app expectation (three of four old tests passed). It is not represented as an untouched baseline test pass.
- The first full browser run exposed a searchbox role mismatch and an offline test that switched connectivity before caching completed. Tests now wait for the application’s offline-ready confirmation. Offline media playback already passed that first run.
- PWA tests initially ran installability inside an incognito test context and queried caches before initialization. Regular temporary browser profiles now test install eligibility, while cache recovery waits for the actual icon entry. No installability error is filtered out and no failed recovery assertion is disabled.

- WebKit media import exposed an actual native Blob/File serialization failure (`UnknownError`). Direct file detachment alone did not fix it. The media repository now writes ArrayBuffer bytes and reconstructs Blobs, retaining legacy Blob compatibility. A focused diagnostic also exposed the generated critical-CSS inline script blocked by the CSP; critical-CSS inlining is disabled and console listeners now run before navigation.

## Verified commands

- `npm ci --no-audit --no-fund --fetch-timeout=15000 --fetch-retries=0`: PASS; clean installation added 895 packages. npm emitted deprecation and optional install-script notices; subsequent checks and production build passed.
- `npm run format`: PASS; source, docs, tests and tooling formatted.
- `npm run lint`: PASS; ESLint recommended TypeScript/JavaScript rules, explicit-any prohibition, strict equality and unsafe-evaluation checks.
- `npm run typecheck`: PASS; strict app, unit-spec and browser-test TypeScript configurations.
- `npm run format:check`: PASS.
- `npm run test:unit`: PASS; **88/88** Jasmine tests in Chrome Headless 156 on macOS. Tests include registry/grid/back-stack, native-input handling, multi-tap/cursor/Unicode deletion, softkeys/modal dispatch, contacts/vCards, messages/drafts, calling, alarms/calendar dates, calculator precision/signs, note recovery, countdown/clock shifts, Snake collisions/food, media lifecycle, state/profile preferences, migrations, transactional failures, cross-tab conflicts, corrupt-revision repair, portable/legacy binary encoding, backup validation/reset and binary recovery.
- `npm run build`: PASS; production shell, four lazy feature groups, manifest and Angular service worker generated in `dist/ng-os`. Initial bundle **415.56 kB raw**, **119.41 kB estimated transfer**. Budgets: initial warning 500 kB/error 650 kB; component styles warning 18 kB/error 24 kB. The retained Angular webpack build/Karma adapters emit a deprecation warning; this is not a compile failure.
- `npm run test:e2e -- e2e/pwa.spec.ts`: PASS; **6/6** desktop/mobile Chromium PWA cases, including zero CDP installability errors in regular profiles, actual cache deletion/recovery/offline fetch, and controlled worker update preserving a draft.
- `npx playwright install webkit`: PASS; WebKit 27.2, Playwright build 2388 installed for the final browser run.
- `npm audit --json --fetch-timeout=10000 --fetch-retries=0`: PASS; **zero vulnerabilities**, including development dependencies. The original lockfile reported 80 advisories. Compatible Angular/transitive updates and a scoped minimatch override removed them; unaffected minimatch 3 remains unchanged. `npm audit fix` alone left advisories, so explicit compatible updates and the tested override were required.
- `git diff --check`: PASS before release documentation finalization; repeated at commit time.

## Final production browser run

`PW_WEBKIT=1 npm run test:e2e`: **PASS — 32 passed, 1 skipped, 0 failed** in 1.7 minutes. Playwright 1.65.0 used desktop Chromium 156 (1440 × 1000), Pixel 7 Chromium, and iPhone 13 WebKit 27.2. The sole skip is the Chromium-specific CDP installability API on WebKit; Chromium installability ran in regular profiles and returned no errors.

Every project exercised all thirteen launcher apps; keypad/grid/native typing/multi-tap; contacts → messages → simulated calling/history; calculator; note recovery; calendar/alarm creation; countdown/Snake controls; audio/photo/file import; offline media playback; offline navigation and CRUD; persistence after reload and reopening; explicit storage fallback; backup/reset/restore; cache deletion/recovery; and controlled worker update preserving a draft. Normal app flows collect page and console errors from before initial navigation, including reopened pages, and require zero errors.

The preceding run with three browser projects had 31 passes, one CDP skip and a real WebKit Blob persistence failure. A first File-to-Blob detachment retry still failed; portable ArrayBuffer records fixed the underlying error. The final complete run above passed without suppressing the failure or disabling its assertions.

The local-only production harness is started with `npm run serve:e2e` on `http://127.0.0.1:4173`. It serves the same CSP/MIME/cache rules used by the static build and exposes a test-only worker-version endpoint only when started with `--e2e`. This endpoint is absent from normal `serve:production` and static Netlify output. The full-suite command is `PW_WEBKIT=1 npm run test:e2e`.

After the complete run, a Snake help sentence was corrected to state that leaving ends the current game. The final production build/static checks passed, and `PW_WEBKIT=1 npm run test:e2e -- --grep 'every launcher'` passed **3/3** against the normal `serve:production` preview, with clean consoles. The current local Playwright HTML/JUnit artifacts reflect this last smoke run; the complete suite outcome is recorded above. CI produces artifacts for its complete run.

## Visual, accessibility and security checks

Desktop 1440 × 1000 and Pixel 7 screenshots were inspected. The original device, launcher and keypad fit the canvas; mobile has no horizontal document overflow. Application bodies intentionally scroll within the display. The screen-focused preference provides a larger interface. Native controls, labels, focus outlines, a trapped confirmation dialog, live feedback, high-contrast/classic themes, zoom support, large text and reduced motion are implemented. Muted text colors were darkened after checking contrast numerically. This is not a claim of a complete assistive-technology certification.

Runtime browser smoke tests open every launcher app and collect page/console errors. Imports use text interpolation and safe previews; there is no HTML execution, eval, external font request, backend, tracking SDK or mandatory sign-in. Netlify headers are exercised by the local production server.

## External/platform checks not claimed

No real cellular call or SMS was sent. Device handoff links are validated and explicit, but native phone/SMS applications were not launched by tests. Real camera hardware/photo-picker permissions, audible speaker output, vibration, notification prompts on physical devices, OS-level installation/standalone launcher, storage eviction and terminated-browser wake-up were not verified. Browser automation verifies install eligibility and offline behavior, not those OS-level outcomes. Actual Safari/iOS app installation still needs a physical-device acceptance check.

No Netlify deployment, GitHub Actions hosted run, remote push or PR creation is claimed. CI and deployment configuration are prepared. The desktop CUA host was unavailable; Playwright and disposable headless Chrome supplied actual runtime verification instead. Alarms/reminders remain explicitly best effort in an open browser.
