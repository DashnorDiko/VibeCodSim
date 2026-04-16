# VibeCodSim

A tap-heavy incremental “coding sim” built with **Expo + React Native + expo-router**, targeting **Web, iOS, and Android**.

## Quick start

1. Install dependencies

```bash
npm install
```

2. Start (pick one)

- Web:

```bash
npm run web
```

- Dev server (choose platform from the Expo UI):

```bash
npm run start
```

- Native dev builds:

```bash
npm run android
npm run ios
```

## Project structure

- `app/` — expo-router screens (main UI lives in `app/index.tsx`)
- `store/gameStore.ts` — core game state + persistence + save export/import
- `components/` — game UI components (upgrades, panels, HUD, etc.)
- `utils/` — scaling / formatting / mechanics helpers

## Save system

### Autosave (local)

The game persists a validated snapshot to `AsyncStorage`:

- `vibecodesim_save_v2` (JSON snapshot)
- `vibecodesim_last_active` (timestamp)

On startup, hydration loads the snapshot and applies **offline progress** based on `last_active`.

### Export (backup)

The exported save is a **base64 string** of the persisted snapshot:

- `exportSave()` → `btoa(JSON.stringify(snapshot))`

**Web:** Settings downloads `vibecodesim-save.txt` containing that string.  
**Non-web:** Settings copies the string to clipboard.

### Import (restore)

**Web:** Settings lets you pick a `.txt` file and imports its contents.

Import does:

- trim → `atob` → JSON parse
- validate/clamp fields
- apply snapshot to the store
- recompute derived fields (income/tap power)
- clear ephemeral fields (sparks/bonus word/notifications)
- persist immediately back to `AsyncStorage`

## Notes

- Saves are for convenient backup/restore. They are not cryptographically signed, so users can edit the base64 JSON if they want.
- “Node cannot be found in the current page” on web is usually a DevTools inspector issue, not an app bug.

## Scripts

- `npm run start` — Expo dev server
- `npm run web` — Start in web mode
- `npm run android` — Run on Android
- `npm run ios` — Run on iOS
- `npm run lint` — Lint
- `npm run typecheck` — TypeScript check
- `npm run test` — Jest
