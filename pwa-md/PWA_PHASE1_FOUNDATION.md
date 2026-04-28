# fit.persona — PWA Migration Brief

## What we are doing
Migrating an existing React Native + Expo app to a 
lightweight, high-performance PWA.

This is NOT a rewrite.
This is a platform migration.

---

## Branch Setup

Create a new branch: pwa from cms_pwa_base branch

In this branch:
1. Move entire /src folder → /reference
2. Delete these root files (Expo specific, not needed):
   - App.tsx
   - babel.config.js
   - metro.config.js
   - eas.json
   - app.json
   - index.ts
   - seed_measurements.ts
   - *.db files

3. Create fresh /src with this structure:
src/
├── components/
│   ├── ui/         ← Button, Input, Card, Modal, Badge
│   └── layout/     ← Header, BottomNav, PageWrapper
├── screens/        ← One file per screen
├── store/          ← Zustand
├── db/             ← Dexie (IndexedDB)
├── services/       ← Business logic
├── types/          ← TypeScript types
├── theme/          ← Colors, spacing, typography
└── utils/          ← Helper functions

4. Create fresh root files:
   - index.html
   - vite.config.ts
   - tailwind.config.ts
   - tsconfig.json
   - package.json (new PWA stack)

---

## Final folder structure after setup:

trainer_cms/
├── reference/        ← OLD RN code (read only)
├── src/              ← NEW PWA code
├── assets/           ← Keep as is
├── public/           ← Keep as is (add icons here)
├── index.html        ← New
├── vite.config.ts    ← New
├── tailwind.config.ts← New
├── tsconfig.json     ← New
├── package.json      ← New
└── .gitignore        ← Keep

---

## New Tech Stack

| Purpose        | Tool               |
|----------------|--------------------|
| Build          | Vite               |
| UI             | React + TypeScript |
| State          | Zustand            |
| Local Storage  | Dexie.js           |
| Styling        | Tailwind CSS       |
| Routing        | React Router v6    |
| PWA            | vite-plugin-pwa    |
| Hosting        | Firebase Hosting   |
| Sync + Backup  | Google Drive API   |

---

## Rules for /reference folder

STRICT — read only. Never copy from reference directly.

DO NOT use:
- React Native components (View, Text, ScrollView etc.)
- Expo APIs (FileSystem, SecureStore, SQLite etc.)
- React Navigation
- SQLite queries
- expo-auth-session

ONLY use reference to understand:
- Business logic and rules
- Data models and types
- Zustand store structure
- Sync engine logic (Drive JSON structure)
- UX flow and screen behaviour
- Component layout and sections

---

## What to extract from /reference

### Copy and clean (remove Expo imports only):
- /reference/types/index.ts         → src/types/
- /reference/store/useAppStore.ts   → src/store/
- /reference/theme/theme.ts         → src/theme/
- /reference/utils/clientStatus.ts  → src/utils/
- /reference/utils/date.ts          → src/utils/
- /reference/utils/id.ts            → src/utils/

### Use as logic reference only (rebuild with web APIs):
- /reference/services/client/
- /reference/services/analytics/
- /reference/services/measurement/
- /reference/services/plan/
- /reference/services/schedule/
- /reference/services/session/
- /reference/services/sync/

### Use as DB schema reference:
- /reference/services/db/schema.ts
  → Rebuild as Dexie schema in src/db/

### Use as UI layout reference only:
- /reference/components/ (all)
- /reference/app/screens/ (all)

---

## Core Principles

1. No over engineering
   - No unnecessary abstractions
   - No unused dependencies
   - Every line of code must have a purpose

2. Performance first
   - Lazy load screens
   - Minimal bundle size
   - Fast initial load (under 2 seconds on mobile)

3. Offline first
   - All data in IndexedDB (Dexie)
   - App works 100% without internet after first load
   - Sync to Drive is async, never blocks UI

4. PWA requirements
   - Proper service worker via vite-plugin-pwa
   - manifest.json with icons
   - Installable on iPad and Android
   - Full screen when installed (no browser bar)
   - Works offline after first visit

---

## Data Architecture

Local (primary):
IndexedDB via Dexie.js
→ All reads and writes go here first
→ Never wait for Drive

Sync (backup):
Google Drive API (web OAuth flow)
→ Async sync after local write
→ Same JSON structure as current RN app
→ meta.json + clients_index.json + per client files

Auth:
Google OAuth 2.0 web flow
(not Expo auth — use Google Identity Services)

---

## Screens (same as current app)

1. Dashboard
2. Client Screen
3. Add Client Flow (multi step)
4. Schedule
5. Settings

---

## Design

- Dark theme (same as current app)
- Mobile first (iPad + Android tablet)
- Same UX and layout as reference app
- Same color system from /reference/theme/theme.ts

---

## What NOT to build

- No backend
- No database server
- No REST API
- No user accounts (single user app)
- No analytics service
- No complex state management beyond Zustand
- No unnecessary npm packages

---

## First Task (Phase 1 — Foundation only)

Do this first, nothing else:

1. Set up branch structure as described above
2. Initialize Vite + React + TypeScript
3. Install dependencies:
   - react, react-dom
   - react-router-dom
   - zustand
   - dexie
   - tailwindcss
   - vite-plugin-pwa
   - typescript
   - @types/react

4. Configure vite.config.ts with PWA plugin
5. Configure tailwind.config.ts
6. Configure tsconfig.json
7. Set up React Router with empty placeholder screens
8. Set up Dexie schema based on reference schema
9. Copy and clean: types, store, theme, utils

DO NOT build any UI in Phase 1.
Foundation only.

After Phase 1 is complete, stop and confirm.
I will give Phase 2 instructions separately.

---

## Deployment Target

Firebase Hosting
→ Deploy only the pwa branch
→ Main branch stays untouched (original RN app)