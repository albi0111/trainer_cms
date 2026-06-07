# Testing And Guards

This document defines how Fit.Persona changes should be tested before commit or deploy.

## Standing Rule

Every task must include a test and guard decision before it is considered done.

For each task:

1. Add or update automated tests when the changed behavior can be tested locally.
2. If automated tests are not practical yet, add or update a guard, checklist, or documented manual verification.
3. Run the relevant guards before reporting completion.
4. In the final handoff, state what was tested, what guard ran, and any remaining untested risk.

Do not leave behavior-changing work with only a visual check unless the change is purely copy or styling and the build guard passes.

## Current Guard Commands

The current repo has TypeScript, Vite, and a custom scroll-refresh guard. It does not currently have a root test runner installed.

Required before every behavior change:

```bash
npm run guard
```

Equivalent expanded checks:

```bash
npm run typecheck
npm run build
```

The production build also runs:

```bash
npm run check:scroll-refresh
```

Use `git diff --check` before commit to catch whitespace or patch formatting issues.

## Future Test Scripts

When Vitest and Playwright are added, use this script set:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:rules": "firebase emulators:exec --only firestore \"vitest run src/__tests__/firestoreRules.test.ts\"",
  "guard": "npm run typecheck && npm run test && npm run build",
  "guard:e2e": "npm run guard && npm run test:e2e"
}
```

Do not add these scripts until the required dev dependencies and config files exist.

## Test Layers

### 1. Pure Unit Tests

Use for logic that does not need IndexedDB or browser layout.

Targets:

- phone and email validation
- session time-window validation
- date and time helpers
- measurement parsing and serialization
- blood pressure badge classification
- chart range filtering
- workout plan grouping
- session status derivation
- notification dedupe key generation

Example expectations:

- invalid phone numbers are rejected
- blank optional contact values save as empty/null-safe values
- sessions cannot start before 05:00 or end after 23:00
- chart range `1M`, `3M`, `6M`, `1Y`, and `All` returns the expected points

### 2. IndexedDB Service Tests

Use `fake-indexeddb` with Vitest once test infra is added.

Targets:

- create client writes core, profile, lifestyle, assessment, default metrics, and sync queue
- update client increments version and queues sync
- archive client sets `archived_at`, hides client from dashboard, and queues sync
- unarchive clears `archived_at`, returns client to dashboard, and queues sync
- delete client marks `pending_delete`, queues delete, and dashboard hides the client
- restore deleted Drive client rehydrates local IndexedDB and clears stale sync queue entries
- import JSON is idempotent and does not duplicate records
- local data summary counts clients and pending changes only

Required archive tests:

- archived clients are excluded from `getClients()`
- archived clients are included in `getArchivedClients()`
- dashboard `archivedClientCount` increments after archive
- dashboard client list excludes archived clients
- unarchive returns the client to dashboard without reload

### 3. Drive Sync Tests

Use mocked Google Drive service calls.

Targets:

- upload queue creates or updates `clients/{client_id}.json`
- client index stores `display_name`, `file_id`, version, updated time, and deleted state
- delete sync retains a deleted client snapshot for future restore
- deleted backup list uses cached summaries when the remote index timestamp is unchanged
- deleted backup list does not download full snapshots when `display_name` exists
- restore updates Drive index from `deleted: true` to `deleted: false`
- restore applies snapshot locally and removes stale queue entries
- failed upload keeps queue retryable
- sync does not overwrite local pending data with older remote data

Manual guard until mocks exist:

- create, edit, archive, unarchive, delete, and restore one test client
- reconnect Drive
- confirm dashboard updates without browser reload

### 4. Dashboard And Cache Tests

Targets:

- dashboard cache invalidates after create, archive, unarchive, delete, restore, import, and sync
- dashboard listens to refreshed store state
- client roster archive shortcut appears beside the small client count heading
- archive count appears when archived count is greater than zero
- archive shortcut opens Settings archive section

### 5. Component Tests

Use React Testing Library once available.

Targets:

- Add Client form rejects invalid phone/email
- New/Edit Session form limits time selection to 05:00 through 23:00
- Profile Archive section appears above Danger Zone
- Delete remains visually separate and destructive
- Settings Data Management shows Local Data, JSON Data Dump, Archived Clients, and Deleted Client Backups
- Archived Clients list shows Unarchive actions
- Deleted Client Backups list shows Restore or unavailable state
- mobile modal layout uses bottom sheet behavior

### 6. E2E Tests

Use Playwright once available.

Core flows:

- create client, dashboard updates immediately
- archive client, dashboard hides it immediately
- open archive from dashboard roster header, unarchive client, dashboard shows it again
- delete client, dashboard hides it immediately
- restore deleted client from Settings, dashboard shows it without reload
- create session in calendar within 05:00-23:00
- reject session outside 05:00-23:00
- edit workout session and rearrange exercises
- open analytics chart popup on desktop, phone, and iPad viewport
- import same JSON twice and confirm no duplicates
- export JSON produces valid app payload

Viewports:

- desktop: `1280x800`
- Apple iPad 10th gen: `820x1180`
- CMF Phone 1 class viewport: `1080x2400` scaled or equivalent mobile emulation

### 7. PWA And Offline Guards

Targets:

- app builds service worker successfully
- app shell loads after build
- local data remains available offline after first load
- installable manifest is generated
- service worker cache does not break new deployments

Manual guard:

- run production preview
- install or open as PWA where possible
- disable network
- reload and confirm app shell and local data open

### 8. Notification Tests

Current app-side notification behavior should be tested with browser APIs mocked.

Targets:

- permission states: `default`, `granted`, `denied`
- notification click focuses or opens the app
- session log reminders include client and session details
- no duplicate local notification scheduling for same reminder

If Firebase Cloud Messaging functions are present again, add emulator tests for:

- stale session jobs do not send
- cancelled jobs do not send
- rescheduled jobs invalidate older versions
- duplicate schedulers cannot double-deliver
- transient FCM failures retry
- invalid FCM tokens are disabled
- notifications isolate by `google_account_id`
- Firestore browser writes are denied

### 9. Firebase Hosting Guards

Current Firebase use is hosting-only in this repo.

Before hosting deploy:

```bash
npm run guard
```

Staging deploy:

```bash
git switch staging-fitpersona-pwa
git pull --ff-only origin staging-fitpersona-pwa
npm run deploy:staging
```

Production deploy:

```bash
git switch fitpersona_pwa
git pull --ff-only origin fitpersona_pwa
npm run deploy:production
```

Environment mapping:

- Staging branch: `staging-fitpersona-pwa`
- Staging Firebase project: `fitpersona-beb36`
- Staging Hosting target/site: `staging` / `fitpersona-beb36`
- Staging URL: `https://fitpersona-beb36.web.app`
- Production branch: `fitpersona_pwa`
- Production Firebase project: `fitpersona-beb36`
- Production Hosting target/site: `production` / `fitpersona`
- Production URL: `https://fitpersona.web.app`

The deploy scripts include branch guards. Do not bypass them for normal deploys.

Do not deploy functions or Firestore unless those directories/configs exist in the repo and their own tests pass.

## Per-Task Guard Checklist

Use this checklist for each task.

### Copy Or Styling Only

- `npm run build`
- verify affected screen manually
- note viewport if mobile layout changed

### Form Or Validation Change

- add/update validation unit tests when test infra exists
- `npm run guard`
- manually test valid, invalid, and blank optional values

### IndexedDB Or Service Change

- add/update fake IndexedDB service tests when test infra exists
- `npm run guard`
- manually verify data persists after app reload

### Sync Or Backup Change

- add/update mocked Drive sync tests when test infra exists
- `npm run guard`
- manually verify queue state and dashboard refresh
- verify no duplicate Drive or Calendar records are created

### Dashboard Or Cache Change

- add/update dashboard service/component tests when test infra exists
- `npm run guard`
- manually verify no browser reload is needed

### PWA, Service Worker, Or Deploy Change

- `npm run guard`
- production preview if possible
- verify service worker and manifest output
- deploy only after checks pass

## Definition Of Done

A task is done only when:

- behavior is implemented
- relevant tests are added or a clear guard is documented
- `npm run guard` or the task-specific guard passes
- known untested risk is stated
- no unrelated changes are reverted or mixed into the task
