# Task: Refactor Google Integration into One Unified “Connect Google” System

We need to change the current Google integration perspective in fit.persona.

Currently, the app thinks in separate features:

* Google Drive sync
* Google Calendar sync/reminders

This is wrong from the trainer/user perspective.

The trainer should not manually connect Drive and Calendar separately, and should not press separate sync buttons for each service.

The new product model should be:

```txt
Connect Google
```

After the trainer connects Google once, the app internally enables:

```txt
Google Drive sync
Google Calendar reminders
```

The user-facing language should become:

```txt
Connect Google
Sync with Google
Google connected
Google sync failed
Google sync successful
```

Avoid exposing separate Drive/Calendar sync actions unless inside advanced debug/developer settings.

---

# Current Existing Drive Sync Context

The app already has a working Drive sync system.

Current session sync is client-snapshot based.

Every session change updates local IndexedDB first, queues the affected client for sync, then uploads the full client JSON snapshot to Google Drive.

Current Drive structure:

```txt
fit_persona/
  meta.json
  clients_index.json
  clients/
    {clientId}.json
  media/
    {clientId}/
```

Each client has one Drive JSON file:

```txt
clients/{clientId}.json
```

That file contains the full `DriveClientSnapshot`:

```ts
{
  version,
  updated_at,
  deleted,
  client,
  profile,
  lifestyle,
  assessment,
  measurementConfigs,
  measurements,
  plans,
  dietPlans,
  sessions,
  sessionResults,
  exercises,
  progressPhotos
}
```

Current session mutations already follow this pattern:

```txt
create/update/complete/missed/postpone/delete session
  ↓
update local IndexedDB first
  ↓
touch client version
  ↓
set client sync_status = pending
  ↓
enqueueClientUpdate(clientId, affectedDomains)
  ↓
scheduleBackgroundSync()
  ↓
Drive sync uploads full client snapshot
```

This existing Drive sync must not be broken.

Calendar integration should be added as a second internal Google capability, not as a replacement for Drive sync.

---

# Main Problem

Currently the app is moving toward separate sync concepts:

```txt
Drive sync button
Calendar sync button
Drive connection
Calendar connection
```

This creates bad UX.

The trainer does not care whether the data is going to Google Drive or Google Calendar.

The trainer only understands:

```txt
My app is connected to Google.
My data is backed up.
My session reminders are working.
```

So the app should expose one Google connection.

---

# Required Product Change

Replace user-facing Drive/Calendar split with:

```txt
Connect Google
```

After connecting Google:

1. Drive backup/sync becomes available.
2. Calendar reminder creation becomes available.
3. Manual sync button runs both Drive sync and Calendar sync.
4. The top sync icon should sync everything Google-related.
5. Settings should show one Google account connection status.
6. Drive and Calendar internal errors can be shown separately in details, but not as separate primary user actions.

---

# New User-Facing Flow

## First-time user

```txt
Trainer opens app
  ↓
App shows “Connect Google”
  ↓
Trainer taps Connect Google
  ↓
Google OAuth consent opens
  ↓
Trainer grants Drive + Calendar permissions
  ↓
App creates/checks Drive folder
  ↓
App creates/checks fit.persona Sessions calendar
  ↓
App runs initial Google sync
  ↓
App shows “Google connected”
```

---

## Normal manual sync

When trainer taps the top sync icon:

```txt
Tap top Google sync icon
  ↓
runGoogleSync()
  ↓
Drive sync runs
  ↓
Calendar sync queue runs
  ↓
UI shows combined result
```

The trainer should not need to press:

```txt
Sync Drive
Sync Calendar
```

This is wrong.

Expected UI:

```txt
Sync with Google
```

---

# App Sync Icon Behavior

The app should use a single adaptive Google action icon in the top app bar.

## When Google Is Not Connected

Show a Google Connect icon.

Behavior:

```txt
Tap
  ↓
Connect Google

Hold
  ↓
Open Google settings
```

Visual meaning:

```txt
Google not connected
Tap to connect
```

---

## When Google Is Connected

Show a Google Sync icon.

Behavior:

```txt
Tap
  ↓
Run Google sync
```

```txt
Hold
  ↓
Open Google settings
```

Visual meaning:

```txt
Google connected
Tap to sync
```

---

## Syncing State

While sync is running:

```txt
Show animated syncing icon
Disable repeated sync taps
Display sync progress state
```

Behavior:

```txt
Tap during sync
  ↓
No action or show "Sync in progress"
```

---

## Ideal Top Bar Placement

The top-right action area should intelligently expose both Sync and Settings without clutter.

Preferred behavior:

```txt
Google not connected
  ↓
Show Connect Google icon

Google connected
  ↓
Show Sync icon
```

Interaction model:

```txt
Tap
  ↓
Primary action
  - Connect Google (if disconnected)
  - Sync with Google (if connected)

Long press
  ↓
Open Google settings
```

This avoids needing separate visible Sync and Settings buttons while keeping both actions quickly accessible.

Tooltip examples:

```txt
Connect Google
Sync with Google
Google Settings
```

---

# New Architecture

Create a unified orchestration layer:

```txt
src/services/google/
  googleAuthService.ts
  googleConnectionService.ts
  googleSyncService.ts
  googleStatusService.ts
```

Existing services should remain separated internally:

```txt
src/services/sync/
  driveService.ts
  syncService.ts

src/services/calendar/
  calendarSetupService.ts
  calendarSyncService.ts
  calendarReminderPlanner.ts
  calendarApiClient.ts
```

The new Google layer should orchestrate both.

Architecture:

```txt
UI
  ↓
googleConnectionService
  ↓
googleAuthService
  ↓
Drive setup + Calendar setup

UI Sync Button
  ↓
googleSyncService.runGoogleSync()
  ├── runDriveSync()
  └── runCalendarSync()
```

---

# Very Important Rule

Do not merge Drive sync logic and Calendar sync logic into one messy service.

Unify the user-facing action, not the internal implementation.

Correct:

```txt
GoogleSyncService
  ├── calls existing Drive SyncService
  └── calls CalendarSyncService
```

Wrong:

```txt
Drive sync code and Calendar API code mixed in one file
```

Reason:

Drive and Calendar have different failure models.

Drive sync handles:

* client snapshots
* meta.json
* clients_index.json
* media files
* upload/download conflict handling

Calendar sync handles:

* session reminder events
* completion reminder events
* snooze events
* event update/delete queue

They should remain internally separate.

---

# Google OAuth Scope Requirement

The app should request Google permissions in one consent flow.

Required capabilities:

1. App-specific Drive file/folder access
2. Calendar event/calendar management

Recommended scopes:

```ts
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendars'
]
```

Reason:

* `drive.file` is preferred over full Drive access because the app only needs to create/read/update files it owns or the user opened with the app.
* `calendar.events` is needed for creating/updating/deleting Calendar events.
* `calendar.calendars` is needed if the app creates or manages the dedicated `fit.persona Sessions` calendar.

If the implementation cannot create a separate calendar using limited calendar scopes, use the minimum required Calendar scope that supports creating calendars and events.

Do not request broad permissions unless required.

---

# Fix Frequent Sign-In Problem

The user is currently being asked to sign in many times per day.

This is a major UX issue and indicates that the app is probably not persisting authentication correctly, is relying only on short-lived access tokens, or is storing auth state in a location that gets cleared too frequently.

Expected fix:

Implement durable Google session storage with proper token refresh handling and longer-lived auth persistence.

## Required Token Model

Store:

```ts
google_auth_state {
  provider: 'google'
  account_email: string | null

  access_token: string | null
  access_token_expires_at: string | null

  refresh_token: string | null

  granted_scopes: string[]

  connected_at: string
  updated_at: string

  auth_status:
    | 'connected'
    | 'expired'
    | 'revoked'
    | 'failed'
}
```

## Access Token Rule

Access tokens are short-lived.

Do not treat access token as permanent login.

Before any Google API call:

```txt
check access_token_expires_at
  ↓
if still valid, use access_token
  ↓
if expired, use refresh_token to get a new access_token
  ↓
save new access_token and expiry
```

## Refresh Token Rule

The refresh token must be stored securely and reused.

The refresh token should become the primary mechanism for maintaining long-lived Google connectivity.

For PWA/web:

* Prefer a backend token broker/session service if available.
* Store refresh credentials in a more durable and secure location than temporary in-memory state.
* Avoid relying solely on sessionStorage or volatile auth state.
* Avoid storing refresh tokens in plain localStorage without evaluating security implications.
* Consider encrypted IndexedDB storage or a backend-managed refresh flow.
* Ensure browser refreshes, tab closures, and normal app restarts do not force re-login.

For Capacitor/native:

* Store refresh tokens in secure storage, Keychain (iOS), or Keystore (Android).
* Persist auth state across app restarts and device reboots.

## Extend Authentication Lifespan

The current authentication lifespan appears too short.

Required improvements:

```txt
User connects Google once
  ↓
Refresh token stored securely
  ↓
Access tokens automatically refreshed
  ↓
Google remains connected for weeks/months
  ↓
User only reconnects if:
    - Google access is revoked
    - Refresh token is revoked
    - App credentials change
    - User explicitly disconnects
```

The trainer should not need to sign in multiple times per day.

The goal is:

```txt
Connect Google once
Stay connected long-term
Refresh silently in background
```

## OAuth Request Must Ask for Offline Access

During OAuth authorization, request:

```txt
access_type=offline
prompt=consent
include_granted_scopes=true
```

Reason:

The app needs long-lived access to refresh the access token without asking the trainer to sign in every time.

Important:

Do not use `prompt=consent` every normal app launch.

Use `prompt=consent` only when connecting/reconnecting Google.

If used every time, Google may keep showing consent repeatedly.

---

# Required Auth Behavior

## On App Startup

```txt
load google_auth_state
  ↓
if refresh_token exists:
      silently refresh access token if needed
      mark Google connected
  else:
      show Connect Google
```

Do not force sign-in on every startup.

---

## Before Manual Sync

When trainer taps top sync icon:

```txt
runGoogleSync()
  ↓
ensureValidGoogleAccessToken()
  ↓
if token refresh succeeds:
      run Drive sync
      run Calendar sync
  ↓
if token refresh fails:
      mark Google auth expired/revoked
      show Reconnect Google
```

---

## If Token Refresh Fails

Possible causes:

* User revoked app access
* Refresh token expired/revoked
* OAuth configuration changed
* App is still in testing mode and test-user/session rules are causing issues
* Browser storage was cleared

Expected UI:

```txt
Google connection expired. Please reconnect Google.
```

Do not show separate:

```txt
Drive disconnected
Calendar disconnected
```

Because from user perspective, Google is disconnected.

---

# Unified Google Connection Setup

Create:

```ts
googleConnectionService.connectGoogle()
```

Flow:

```txt
1. Start Google OAuth with Drive + Calendar scopes.
2. Receive access token and refresh token.
3. Store google_auth_state securely.
4. Initialize Drive:
   - ensure fit_persona folder exists
   - ensure meta.json exists
   - ensure clients_index.json exists
5. Initialize Calendar:
   - check if fit.persona Sessions calendar exists
   - if not, create it
   - store calendar ID
6. Run first Google sync:
   - Drive sync
   - Calendar sync
7. Return combined connection status.
```

---

# Dedicated Calendar Creation

When Google is connected, the app should create/check a dedicated calendar:

```txt
fit.persona Sessions
```

Flow:

```txt
list user calendars
  ↓
find calendar summary === 'fit.persona Sessions'
  ↓
if found:
      save calendar ID
  ↓
if not found:
      create calendar
      save calendar ID
```

Store:

```ts
google_calendar_settings {
  calendar_id: string
  calendar_name: 'fit.persona Sessions'
  created_by_app: boolean
  updated_at: string
}
```

---

# Unified Manual Sync Button

The top Drive sync icon should be renamed conceptually.

Current behavior:

```txt
Drive sync icon only runs Drive sync
```

Expected new behavior:

```txt
Google sync icon runs full Google sync
```

Implementation:

```ts
async function onTopSyncIconPress() {
  await googleSyncService.runGoogleSync({
    source: 'manual'
  })
}
```

`runGoogleSync()` should:

```ts
async function runGoogleSync({ source }) {
  const token = await googleAuthService.ensureValidAccessToken()

  const result = {
    drive: null,
    calendar: null
  }

  result.drive = await driveSyncService.runSync()

  result.calendar = await calendarSyncService.processPendingQueue()

  return buildCombinedGoogleSyncResult(result)
}
```

---

# Combined Sync Result UI

The UI should show one combined result:

## Success

```txt
Google sync complete
```

Details:

```txt
Drive backup updated
Calendar reminders updated
```

## Partial Success

```txt
Google sync partly completed
```

Details:

```txt
Drive backup updated
Calendar reminders failed
```

or:

```txt
Drive backup failed
Calendar reminders updated
```

## Full Failure

```txt
Google sync failed
```

Details:

```txt
Could not sync with Google. Please check connection or reconnect Google.
```

---

# Sync Status Model

Create one top-level Google sync status:

```ts
google_sync_status {
  overall_status:
    | 'idle'
    | 'syncing'
    | 'success'
    | 'partial_failed'
    | 'failed'
    | 'auth_required'

  drive_status:
    | 'idle'
    | 'syncing'
    | 'success'
    | 'failed'
    | 'auth_required'

  calendar_status:
    | 'idle'
    | 'syncing'
    | 'success'
    | 'failed'
    | 'auth_required'

  last_success_at: string | null
  last_attempt_at: string | null

  drive_last_error: string | null
  calendar_last_error: string | null
}
```

UI should mainly show `overall_status`.

Advanced/details screen can show Drive and Calendar sub-statuses.

---

# Session Mutation Flow After This Change

Existing session flow:

```txt
session mutation
  ↓
IndexedDB update
  ↓
Drive client queue
  ↓
background Drive sync
```

New flow:

```txt
session mutation
  ↓
IndexedDB update
  ↓
Drive client queue
  ↓
Calendar reminder planner
  ↓
schedule Google background sync
```

Important:

`CalendarReminderPlanner` should only create/update local calendar event queue rows.

It should not call Google API directly.

---

# Background Sync Behavior

Current app calls:

```ts
scheduleBackgroundSync()
```

This currently means Drive sync.

Expected change:

Rename conceptually to:

```ts
scheduleGoogleBackgroundSync()
```

Or keep the function name internally but make it call:

```ts
googleSyncService.runGoogleSync({ source: 'background' })
```

Flow:

```txt
pending Drive queue OR pending Calendar queue
  ↓
schedule one background sync
  ↓
ensure valid Google access token
  ↓
process Drive queue
  ↓
process Calendar queue
```

Do not run two separate visible sync timers.

---

# Important Failure Isolation

If Drive sync fails, Calendar sync can still run.

If Calendar sync fails, Drive sync can still run.

But UI should show:

```txt
Google sync partly completed
```

Do not stop Calendar sync just because Drive failed unless auth failed.

Exception:

If Google auth is invalid, both fail with `auth_required`.

---

# Google Account Display

Settings should show:

```txt
Google connected
{trainer_email@gmail.com}

Enabled:
✓ Backup & sync
✓ Calendar reminders

Last sync:
Today, 6:40 PM
```

Buttons:

```txt
Sync with Google
Reconnect Google
Disconnect Google
```

Avoid:

```txt
Connect Drive
Connect Calendar
Sync Drive
Sync Calendar
```

---

# Disconnect Google Flow

When user taps Disconnect Google:

```txt
1. Confirm with user.
2. Clear local Google tokens.
3. Mark Google disconnected.
4. Disable Drive sync.
5. Disable Calendar sync.
6. Keep local app data untouched.
7. Do not delete local clients/sessions.
```

Ask before deleting Calendar events or Drive backup.

Default:

```txt
Disconnect only removes app access from this device.
It should not delete Google Drive files or Calendar events.
```

Optional advanced buttons:

```txt
Delete fit.persona Calendar events
Delete Drive backup folder
```

Do not perform destructive deletion by default.

---

# Existing UI Changes

## Top Sync Icon

Replace the old Drive-specific icon behavior with a unified Google action icon.

### Disconnected State

```txt
Show Connect Google icon
Tap → Connect Google
Hold → Open Google integration settings
```

### Connected State

```txt
Show Sync with Google icon
Tap → Run Google sync
Hold → Open Google integration settings
```

### Syncing State

```txt
Show animated sync icon
Tap → No action / Sync already running
Hold → Open Google integration settings
```

Tooltip examples:

```txt
Connect Google
Sync with Google
Google Integration Settings
```

The icon should dynamically reflect connection state and sync state.

---

## Settings Screen

Replace:

```txt
Google Drive
Connect Drive
Sync Drive

Google Calendar
Connect Calendar
Sync Calendar
```

With:

Google Account

Status:
Connected / Not connected / Reconnect required

Features:

Backup & Sync
[Toggle: On / Off]
Securely backs up client data to Google Drive and keeps it synchronized automatically. Turning this off pauses all Google Drive backup and synchronization activity, preventing new or updated client data from being uploaded or downloaded while keeping your Google account connected. Existing backup files in Google Drive remain unchanged and are not deleted. You can turn it back on at any time to resume backup and synchronization.

Calendar Reminders
[Toggle: On / Off]
Creates and maintains session reminder events in the fit.persona Sessions calendar. Turning this off pauses reminder synchronization and prevents new or updated events from being sent to Google Calendar, while keeping your Google account connected and leaving existing calendar events unchanged. You can turn it back on at any time to resume syncing.

Actions:
Connect Google
Sync with Google
Reconnect Google
Disconnect Google

---

# Calendar Event Requirement Still Applies

After Google connection is unified, Calendar should still support session reminders.

When session is created:

1. Create/update local calendar event records.
2. Queue Calendar sync.
3. Google sync creates:

   * main session event
   * completion check event
   * completion snooze event

When session is updated:

1. Update local event records.
2. Queue Calendar updates
