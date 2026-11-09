# Feature OS 2.0 implemented feature inventory

This inventory describes the source implementation. It is not a claim that every platform has been manually certified; see TEST_REPORT.md for executed checks.

## Shared operating environment

- Thirteen registered local applications with a three-column launcher, keyboard/touch/keypad access, focus restoration, home shortcuts, and unread-message indicator.
- Standalone shell with contextual softkeys, navigation history, shared confirmations, in-app notification list, toast feedback, recovery/loading views, and current local date/time.
- Browser online/offline state is labeled accordingly. No invented cellular signal or battery metric.
- Light, dark, high-contrast, and classic themes; accent choices, wallpaper, large text, reduced motion, and a screen-focused layout.
- Hardware text fields retain normal editing. Phone keypad supports multi-tap composition, punctuation, case, deletion, selection/cursor insertion, and 900 ms cycling. Contact T9 lookup is separate.

## Phone — local simulation and optional external handoff

- Number entry/editing, contact suggestions/identification, dialing/ringing/connected/ended/canceled phases, duration, history, redial, individual deletion, and confirmed history clearing.
- Optional demo incoming call supports answer, reject, and missed-call timeout; a direct missed-call demo is also available.
- Every call screen is labeled simulated. Outgoing simulated contacts answer automatically; incoming calls require an action or become missed after 15 seconds.
- An explicit validated `tel:` link opens a compatible device dialer. The browser does not place a cellular call.
- Leaving an active call ends/logs it and releases its timer. Simulated call sessions do not continue after application termination.

## Contacts — local data

- Create, detail, edit, delete, favorite, favorite filter, A–Z/Z–A/favorite sorting, name/number/T9 search, duplicate-number validation, and empty/error views.
- Contact detail actions launch Phone or Messages with the recipient.
- vCard 3.0 export and import with folded-line/basic escaping support; duplicates skip without overwriting existing entries. Import allows up to 2 MB and 5,000 valid contacts.
- Contact changes persist through the shared state store; deleting a contact retains conversation/call records.

## Messages — local simulation and optional external handoff

- Conversations with contact selection or number entry, local message sending, timestamps, search, unread/read state, individual-message and conversation deletion.
- Autosaved new-message draft and per-conversation drafts; resume/discard controls. Replacing a different pending draft requests confirmation.
- Optional explicit incoming-message/demo-reply controls create clearly labeled simulated entries. No network delivery or real SMS receipt is fabricated.
- A separate validated `sms:` link hands recipient/body to a compatible installed messaging app. Sending there remains the user’s action.
- Message body limit: 5,000 characters.

## Clock — running-browser capability

- Local date/time; create/edit/delete/enable/disable labeled alarms, weekday repeat schedules, in-app ringing UI, stop, and five-minute snooze.
- Optional browser notification permission, gesture-unlocked audible alert, and supported vibration according to the selected in-app profile.
- Countdown start/pause/resume/reset; stopwatch start/pause/reset and up to 100 laps. Timer/stopwatch survive navigation in the session; a running countdown deadline can recover a same-session reload.
- No terminated-browser wake-up guarantee. Suspended/background tabs and device sleep can delay or prevent all alerts.

## Calculator — local computation

- Four arithmetic operators, decimals, unary negative/sign change, clear, backspace, percentage, and operator precedence without `eval`.
- Percentage means divide the preceding value by 100; displayed floating-point results are normalized by the engine.
- Invalid expressions and division by zero produce visible errors. Physical keypad digits work; * cycles operators and # calculates.

## Calendar — local data and running-browser reminders

- Month/date navigation, today shortcut, event indicators, selected-day details, upcoming list, and create/edit/delete of title/date/time/details.
- Optional reminders while Feature OS is running; event times use the browser’s local time zone.
- Events persist locally. This is not calendar-account synchronization or a terminated-app alarm scheduler.

## Notes — local data

- Create/read/edit/delete, search, last-edited/title sorting, draft autosave/recovery/discard, individual draft and full-list text export.
- Empty titles save as “Untitled note”; text is rendered safely rather than as HTML. Deletion and replacing a different recovered draft require confirmation.

## Music — local browser media

- Audio file import, IndexedDB blob persistence, play/pause, previous/next, seek, volume, ordered queue, move earlier, and deletion.
- Track name comes from the filename; artist is identified as local audio. Embedded ID3 metadata extraction is not implemented.
- Selection, time, and volume can recover within a browser session. Playback pauses when leaving Music; browser autoplay and codec restrictions are surfaced.
- Audio/object URLs are released on deletion and view destruction; stale async loads are ignored. Import limit: 25 MB per file.

## Snake — local game

- Start, pause, resume, restart, difficulty, D-pad/numeric controls, collision handling, valid free-cell food placement, score, full-board win, and durable high score.
- Visibility changes pause the game; leaving disposes its timer. Current board/progress is session view state, while best score persists.

## Gallery / camera — local browser media

- Import, album thumbnails, full view, delete, export, and explicit camera/photo chooser with file-upload fallback.
- JPEG, PNG, WebP, GIF, and AVIF validation; best-effort decode/resize/recompression toward a 1600-pixel dimension where beneficial. Original/animated files may be retained.
- Limit: 10 MB per imported gallery image. Camera availability and supported image codecs depend on browser/device; no automatic camera permission request.

## Files — sandboxed local catalogue

- List all imported items with type, size, and date; import, delete, download/export, text/image/audio previews, and storage usage estimates.
- Text preview is capped at 100 KB and cannot execute imported HTML/scripts. Unsupported formats can be exported.
- Ordinary files have a 25 MB import limit. This catalogue cannot browse unrestricted files on the device.

## Profiles and Settings — local preferences and browser controls

- General: sound/optional vibration; Silent: visual alerts; Meeting: visual/optional vibration; Outdoor: louder in-app sound/optional vibration.
- Themes, accent/wallpaper, large text, screen-focused mode, home shortcuts, multi-tap, sound/vibration, demo controls, and explicit notification permission.
- Storage estimate, save retry, durable-storage request where supported, complete JSON backup/validated restore, recovery export, and confirmed reset.
- Installation instructions/direct prompt when supported, offline-ready status, update check, and controlled reload. Active-app preparation saves valid editors/drafts; invalid forms or unresolved storage writes block reload.
- Profiles never claim to change the physical device’s system volume/profile.

## Persistence, PWA, and deployment

- Version-2 IndexedDB state/media stores, prior-state migration, serial transactional writes, preserved user deletions, explicit fallback/recovery warnings, and no durable object URLs.
- Local text fallback when IndexedDB is unavailable; imported blobs are session-only in fallback mode. Failed IndexedDB additions remain exportable in memory and retry atomically. Recovery export includes available original/session binary content and reports unreadable data. Storage denial/quota/eviction remains a browser limitation.
- Production worker prefetches shell/chunks/assets; manifest includes standalone launch and branded PNG/maskable icons. System fonts/local symbols remove critical remote dependencies.
- Complete backup export/restore is bounded by a 150 MB envelope including encoded files. Existing oversized audio remains preserved; new upload limits remain 25 MB for audio/files and 10 MB for gallery images. Large libraries can export individual files.
- Netlify configuration supplies clean install/build, SPA fallback, MIME/cache/security headers. GitHub Actions configures lint/format/type/unit/build/browser checks and artifact upload. Deployment, hosted CI, and real-device install claims require separate evidence.
