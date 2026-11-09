# Feature OS 2.0 product audit

Audit date: 2026-11-09. Baseline: cd0efa9 (master). Dedicated branch: feat/feature-os-2.

## Baseline evidence

Initial `npm run build` and `npm test -- --watch=false --browsers=ChromeHeadless` both exit 3: default Node 18.20.6 is incompatible with Angular 22. Compatible local Node 24.19.0 was discovered. The compatible-runtime baseline build failed its existing stylesheet budget; the first sandboxed browser test could not bind its port. Exact reruns and final results are recorded in TEST_REPORT.md.

Inspected root configuration/lockfile, all active AppComponent/core source, the legacy application/SDK/hardware/software route tree, assets, manifest, worker config, and Netlify setup. No uncommitted source changes at start. Local branch inventory contains master only. Remote issues/PR availability is checked separately when tooling permits.

## Capability classification before changes

- Working foundations: Angular build configuration, three-column launcher, physical button events, basic theme/profile persistence, local note create/edit, message append, local audio playback, basic Snake loop.
- Partial: Phone only appends log and shows text (no call lifecycle); Contacts only reads/searches; Messages cannot create recipient/thread, delete, or recover drafts; Clock only checks exact minute, no ring/stop/snooze/timer/stopwatch; Notes lack deletion/search/recovery; Music embeds blobs in one state record, leaks URLs, no deletion/queue; Profiles do not affect sound; Settings only theme/color/shortcuts plus unsafe reset.
- Missing: live Calculator, Calendar, Gallery, Files; structured navigation/back stack, confirmations, centralized failures, update/install lifecycle, PNG/maskable/apple icons, offline verification, browser E2E, CI, backup/restore.
- Broken: editing keyboard hijacks normal numeric/arrows/backspace; softkey labels do not consistently reflect actions; storage falls back silently and can diverge; loads re-add deleted sample calls; writes resolve before transaction commit; imported audio URLs are not all revoked; Snake can spawn food inside itself; status fabricates cellular/battery capability.
- Dead/disconnected: AppRoutingModule is never imported by AppModule. All application/, welcome/, SDK and old hardware/software modules are unreachable. Legacy Calculator says `calculator works!`; Calendar/Phone are scaffolds; alarms/messages/settings use static JSON. No additional persisted legacy data exists.

## Implementation decisions

Retain Angular 22, existing database name and core persisted model compatibility. Replace the monolithic composition with standalone app components, shared typed signal state, serial IndexedDB transactions and a separate media store. Preserve old state and migrate embedded blobs; never re-seed an existing installation. A single navigation and input dispatcher serves all apps, native text entry remains native, on-screen text entry provides multi-tap. OS state owns notifications, confirmation, preferences and active-session scheduling. App destruction disposes timers/media URLs. Use original CSS device artwork and local symbols/system fonts. Remove legacy only after useful behavior is replaced. All communications remain explicitly simulated with opt-in tel:/sms: links. Alarms/reminders are limited to a running browser. No cloud/backend is introduced.

## Release verification policy

Unit/domain tests, production build, static checks and browser E2E must report actual results. Production service-worker/offline behavior is tested through a localhost server. Installation UI and OS-level standalone launch are platform-dependent and must be distinguished from manifest/service-worker verification. No deployment or PR success is assumed.

## Audit revisited after implementation

All thirteen requested launcher apps now have active standalone implementations. The old application/, welcome/, SDK/hardware/software implementation, package JSON demos, unused routing/module wrappers and unused Material presentation layer were removed after their useful behavior was migrated. AppComponent is a composition root; state, navigation, input, scheduling, storage, media and PWA behavior have separate owners.

Resolved product blockers include contact/message lifecycle operations, simulated calling states, repeat/snooze alarms, safe editor updates, calculator/calendar/gallery/files, note and message recovery, media blob persistence/URL cleanup, truthful status/profile behavior, contextual softkeys, native text entry versus shortcuts, Unicode-safe multi-tap deletion, transactional media/state writes, migration/corruption/quota recovery, backup validation/reset confirmation, bundled critical assets, install/update UX and production offline tests. Original CSS-budget failure was removed through replacement rather than raising its threshold. Initial bundle is below the tighter 500/650 kB budget.

The lockfile was updated within Angular major 22; npm audit now reports zero advisories across runtime and development dependencies. A scoped minimatch override patches only affected modern tooling consumers; older unaffected minimatch 3 consumers are retained. The deprecated Angular webpack/Karma adapters remain operational and tested; migration to future build adapters is maintenance work, not an unresolved release compile failure.

The remaining checks concern real platform integration: OS-level PWA installation, physical Safari/iOS standalone launch, camera/notification/audio/vibration hardware behavior, hosted CI, deployment and remote PR creation. They are not presented as completed. Closed-browser alarms and native cellular/SMS delivery remain unsupported by design. Consult TEST_REPORT.md for actual commands, failures resolved and final browser results.

Public repository issues were inspected on 2026-11-09: no open issues were listed. The public PR listing request timed out; no PR inventory or remote state is inferred from that failure. GitHub CLI is unavailable in this environment; release commits are prepared locally on the dedicated branch.

Final runtime hardening also addressed cross-tab lost updates with atomic revision checks, WebKit native Blob serialization failures using portable ArrayBuffer records (legacy Blob reads preserved), empty-MIME backup round trips, and a generated critical-CSS inline script rejected by the CSP. Browser tests capture page/console errors before initial navigation.
