# Feature OS

Angular Material feature-phone OS simulator with keypad navigation, offline local data, installable PWA output, and Netlify deployment config.

## Runtime

Angular 22 requires Node `22.22.3` or newer. This repo includes `.nvmrc` and `netlify.toml` so local and Netlify builds use a compatible runtime.

```sh
nvm use
npm install
npm start
```

## Features

- Home launcher with 3x3 keypad navigation.
- Dialer, contacts with T9-style filtering, call log.
- Messages with local threads and compose.
- Clock with persistent alarms.
- Notes with create/edit/save.
- Local music import and playback.
- Canvas Snake game controlled by the D-pad.
- Profiles and themes persisted offline.
- IndexedDB-backed data seeded on first launch.
- PWA manifest, Angular service worker, and Netlify SPA fallback.

## Verification

```sh
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

Keyboard shortcuts: arrows for D-pad, Enter for center, Escape or H for home/end, Q/E for soft keys, C for call, and number keys for dial/text input.
