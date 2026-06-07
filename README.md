# fit.persona

fit.persona is an offline-first Progressive Web App for personal trainers to manage clients, sessions, workout plans, measurements, health notes, diet plans, and progress tracking.

The app is designed to work primarily from the device. Client data is stored locally first, then backed up and synced through the trainer's Google Drive when Drive sync is connected. Firebase is used only to host the web app assets.

## Goals

- Work reliably on iPad, Android tablets/phones, desktop browsers, and installed PWA mode.
- Keep the app usable without internet after it has loaded.
- Store operational data locally first for fast access and low dependency on backend services.
- Use the trainer's own Google Drive as the backup and sync location.
- Avoid storing private client data in Firebase or a custom server database.

## Tech Stack

### Runtime

- **JavaScript / TypeScript**
  - The app is written in TypeScript and compiled to browser JavaScript.
  - TypeScript gives stronger type checking for client records, sessions, sync snapshots, measurements, and form data.

- **React 19**
  - Used for the UI and app state rendering.
  - The app is component based: dashboard, client profile, analytics, plans, sessions, modals, and shared UI elements are split into focused React components.

- **React DOM**
  - Renders the React app into the browser DOM.

- **React Router**
  - Handles app navigation.
  - Current routes include the dashboard, client detail pages, schedule, and settings.

### State And Local Data

- **Zustand**
  - Lightweight client-side state store.
  - Used for app-level state such as dashboard cache, client detail cache, schedule cache, selected client, sync state, and Drive connection state.

- **Dexie**
  - Wrapper around IndexedDB.
  - Used as the main offline database.
  - Provides structured tables, indexes, migrations, and transactions while keeping all primary app data local to the browser/PWA.

- **IndexedDB**
  - The browser storage engine behind Dexie.
  - Stores clients, profiles, assessments, measurements, plans, sessions, exercises, sync queue, and sync metadata.

### Build And PWA

- **Vite**
  - Development server and production build tool.
  - Provides fast local development and optimized production assets.

- **vite-plugin-pwa**
  - Generates the service worker and web app manifest.
  - Enables installable PWA behavior, precaching, app-shell caching, and offline loading support.

- **Workbox**
  - Used through `vite-plugin-pwa`.
  - Handles service worker generation, precache lists, and runtime caching rules.

### IDs And Utilities

- **nanoid**
  - Generates local unique IDs for records such as clients, sessions, plans, exercises, and sync queue entries.

### Deployment

- **Firebase Tools**
  - Used to deploy the static production build to Firebase Hosting.

- **Firebase Hosting**
  - Hosts only the compiled PWA files from `dist`.
  - It does not store client data.
  - It does not act as the app database.

## App Data Model

The main local database is named:

```text
fit-persona
```

Main IndexedDB tables:

- `clients`
- `clientProfiles`
- `clientLifestyles`
- `clientAssessments`
- `measurements`
- `measurementConfigs`
- `progressPhotos`
- `plans`
- `dietPlans`
- `sessions`
- `sessionResults`
- `exercises`
- `syncQueue`
- `syncMeta`
- `clientSyncState`

The app tracks data domains for sync:

- `core`
- `measurements`
- `progress_photos`
- `plans`
- `diet_plans`
- `sessions`
- `session_results`
- `exercises`

## Offline-First Design

The app is built around local-first behavior:

1. The user opens the PWA.
2. The app loads from Firebase Hosting or from the service worker cache.
3. Data is read from IndexedDB on the device.
4. Changes are written to IndexedDB first.
5. A sync queue records what needs to be uploaded later.
6. If the device is online and Google Drive is connected, queued changes are synced.
7. If the device is offline, the changes remain local and sync later.

This means the primary source of truth during daily use is the device-local database. Google Drive is the backup and cross-device sync target.

## Google Drive Sync

Drive sync uses Google Identity Services and the Google Drive API.

OAuth scope:

```text
https://www.googleapis.com/auth/drive.file
```

This scope allows the app to create and manage files that the app owns or opens. The app does not require full Drive access.

### Drive Folder Structure

When Drive sync is connected, the app creates and tracks this layout:

```text
fit_persona/
  meta.json
  clients_index.json
  clients/
    {client_id}.json
  media/
    {client_id}/
```

### Drive Files

- `meta.json`
  - Stores global sync metadata such as version and last remote update time.

- `clients_index.json`
  - Stores an index of client snapshots.
  - Tracks client ID, version, updated time, deleted state, and Drive file ID.

- `clients/{client_id}.json`
  - Stores the full client snapshot.
  - Includes core client data, profile, lifestyle, assessment, measurement configs, measurements, plans, diet plans, sessions, session results, exercises, and progress photo records.

- `media/{client_id}/`
  - Reserved for client media organization.

## Sync Queue

Every local change queues a sync operation.

The sync queue records:

- client ID
- operation type: `update` or `delete`
- affected data domains
- status: `pending`, `processing`, or `failed`
- retry count
- next retry time
- created/updated timestamps

The queue is merged per client and operation, so repeated edits to the same client combine affected domains instead of creating unnecessary duplicate sync jobs.

## Sync Flow

### Upload

1. Read pending sync queue entries.
2. Ensure the Drive folder layout exists.
3. Build a complete client snapshot from IndexedDB.
4. Upload or update `clients/{client_id}.json`.
5. Update `clients_index.json`.
6. Update `meta.json`.
7. Mark the local client as synced.
8. Remove the completed queue entry.

For deletes:

1. Delete the client snapshot file from Drive if it exists.
2. Delete the client media folder if it exists.
3. Mark the client as deleted in the remote index.
4. Purge local records for that client after the delete is processed.

### Download

1. Read `meta.json` and `clients_index.json`.
2. Compare remote timestamps and client versions with local records.
3. Pull newer remote client snapshots.
4. Apply snapshots into IndexedDB.
5. Purge local client records when the remote index marks a client as deleted.

### Conflict Behavior

The app uses version and timestamp checks:

- Local pending changes are protected from being overwritten directly.
- If a local client has pending changes and the remote entry differs, the app queues a full client update so the local state can be uploaded.
- If there are no pending local changes, newer remote versions are pulled into IndexedDB.

## Backup Strategy

The backup target is Google Drive.

The app does not upload primary client data to Firebase. Firebase only delivers the app shell and static assets.

Backup behavior:

- Local data is always written first.
- Drive backup happens after changes are queued and sync runs.
- If Drive is not connected, data remains local.
- If offline, sync waits until the device is online.
- Failed sync attempts are retried with backoff.

Retry settings:

```text
maxRetries: 3
retryBackoffSeconds: 5, 30, 300
batchSize: 5
```

## Firebase Hosting

Firebase is used for hosting only.

The Firebase config serves:

- `dist/index.html`
- compiled JavaScript and CSS assets
- PWA manifest
- service worker
- images and icons

Firebase Hosting cache behavior:

- `index.html`: no-cache
- `manifest.webmanifest`: revalidate
- `sw.js`: no-cache
- hashed assets under `/assets/**`: long-term immutable cache

Hosting environments:

| Environment | Branch | Firebase project | Hosting target/site | URL |
| --- | --- | --- | --- | --- |
| Staging | `staging-fitpersona-pwa` | `fitpersona-beb36` | `staging` / `fitpersona-beb36` | `https://fitpersona-beb36.web.app` |
| Production | `fitpersona_pwa` | `fitpersona-beb36` | `production` / `fitpersona` | `https://fitpersona.web.app` |

The default Firebase project alias remains staging:

```text
fitpersona-beb36
```

## PWA Behavior

The app is installable as a PWA.

PWA features:

- standalone display mode
- app icons and maskable icon
- service worker generated by `vite-plugin-pwa`
- app-shell caching
- runtime caching for app assets, images, Google fonts, and Google Drive API requests
- offline startup after assets are cached

The app is intended to feel like a native app on tablets and phones, especially in installed PWA mode.

## Notifications

The app supports PWA/native-style notifications for pending session log entries where browser support and OS permission allow it.

The notification implementation uses:

- `Notification.requestPermission()`
- `serviceWorkerRegistration.showNotification()`
- fallback browser `Notification`

Pending log notifications include:

- client name
- session date/time
- duration
- session focus

Limit:

Fully reliable notifications while the PWA is completely closed require Web Push from a server or a native wrapper. The current implementation supports OS-level notifications while the PWA/browser context can run and permission is granted.

## Environment Variables

Required local env:

```text
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id
```

The Google OAuth client must be a Web application client.

Authorized JavaScript origins should include the deployed Firebase Hosting origins and any development origins used locally, for example:

```text
http://localhost:5173
http://127.0.0.1:5173
https://fitpersona-beb36.web.app
https://fitpersona-beb36.firebaseapp.com
```

If testing on a phone or iPad against a LAN dev server, that exact LAN origin must also be registered.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Typecheck:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

Deploy:

```bash
npm run deploy
```

Deploy staging:

```bash
git switch staging-fitpersona-pwa
git pull --ff-only origin staging-fitpersona-pwa
npm run deploy:staging
```

Deploy production:

```bash
git switch fitpersona_pwa
git pull --ff-only origin fitpersona_pwa
npm run deploy:production
```

The deploy scripts include branch guards. Staging refuses to deploy unless the current branch is `staging-fitpersona-pwa`; production refuses to deploy unless the current branch is `fitpersona_pwa`.

## Testing And Guards

Detailed testing strategy, guard commands, and task completion rules are documented in:

```text
docs/TESTING_AND_GUARDS.md
```

Standing development rule:

- Every behavior-changing task must include a test and guard decision.
- Add or update automated tests when the behavior can be tested locally.
- If automated tests are not practical yet, document the manual guard or checklist used.
- Run the relevant guard before reporting completion.
- In the handoff, state what was tested, what passed, and what risk remains.

## Branches

Current updated PWA branch:

```text
fitpersona_pwa
```

The branch contains the latest PWA-focused app work, including offline-first behavior, Drive sync, Firebase Hosting deployment configuration, PWA assets, notification support, client workflow improvements, analytics updates, and UI refinements.

## Privacy And Ownership

The app is designed so client operational data is not stored in Firebase.

Data locations:

- Device: IndexedDB, primary working storage.
- Google Drive: trainer-owned backup/sync storage.
- Firebase Hosting: static app files only.

This keeps the product architecture simple and aligned with the offline-first goal.
