# Task: Add Google Calendar Event + Reminder Architecture to Existing fit.persona Session Sync

We need to add Google Calendar integration to the existing fit.persona trainer app.

This must be implemented carefully because the current app already has a working session sync system using local IndexedDB + Google Drive client snapshots.

Google Calendar must not replace the existing Drive sync.

Google Calendar should only be a notification/reminder mirror for sessions.

---

# Current Existing Session Sync Architecture

The current session sync is client-snapshot based, not per-session-file based.

Every session change updates local IndexedDB first, queues the affected client for sync, then uploads the full client JSON snapshot to Google Drive.

Current Google Drive structure:

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

That file contains the full `DriveClientSnapshot`, including:

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

Sessions are currently stored locally in IndexedDB across three related tables:

## 1. sessions

```ts
{
  id,
  plan_id,
  client_id,
  date,
  start_time,
  end_time,
  duration_minutes,
  day_name,
  focus,
  type,
  status, // planned | completed | missed
  missed_reason,
  missed_note,
  postponed_note,
  original_date,
  notes,
  measure_reminder,
  created_at,
  updated_at
}
```

## 2. sessionResults

Only exists after completion.

```ts
{
  session_id,
  perceived_difficulty,
  energy_level,
  performance_notes,
  trainer_notes,
  completed_at
}
```

## 3. exercises

```ts
{
  id,
  session_id,
  name,
  order_index,
  target_sets,
  target_reps,
  notes,
  sets,
  progression_note,
  created_at
}
```

Current session mutation flow:

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

This must remain unchanged.

---

# New Requirement

When a session is created, updated, completed, missed, postponed, or deleted, the app should also create/update/delete related Google Calendar events.

The trainer wants reliable phone notifications through Google Calendar.

Google Calendar should be used for:

1. Session reminder before the session
2. Previous-day evening reminder
3. Post-session completion reminder
4. Snooze-style repeated completion reminder
5. Special measurement reminder when `measure_reminder` is checked

---

# Core Architecture Rule

The local app database is the source of truth.

Google Drive is the backup/sync layer.

Google Calendar is only a reminder mirror.

Never make Google Calendar the source of truth.

Correct architecture:

```txt
SessionService
  ↓
IndexedDB local update
  ↓
Drive client snapshot queue
  ↓
Calendar reminder queue
  ↓
background processing
```

Incorrect architecture:

```txt
SessionService directly calls Google Calendar API from UI flow
```

Do not do that.

---

# Why Direct Calendar API Calls From SessionService Are Wrong

Direct Calendar API calls inside session create/update/complete flow will create bugs:

1. If internet fails, session creation may fail even though local data is valid.
2. UI may get stuck waiting for Calendar API.
3. Calendar event can be created but local session update can fail.
4. Duplicate Calendar events may be created during retry.
5. Drive sync and Calendar sync failures will be mixed together.
6. Debugging becomes hard because session, Drive, and Calendar concerns are coupled.

Expected fix:

Create a separate `calendar_sync_queue`.

SessionService should only enqueue Calendar operations after local DB mutation succeeds.

---

# Required New Calendar Concept

Create a dedicated Google Calendar for each connected Google account.

Calendar name:

```txt
fit.persona Sessions
```

Do not use the user’s primary calendar by default.

Reason:

1. Keeps trainer’s personal Calendar clean.
2. Allows the trainer to hide/show fit.persona reminders.
3. Allows deleting/resetting fit.persona events later without touching personal events.
4. Makes Calendar debugging easier.
5. Gives all app events a clear boundary.

When Google Calendar is connected:

1. Check if a calendar named `fit.persona Sessions` already exists.
2. If it exists, store its calendar ID.
3. If it does not exist, create it.
4. Store the calendar ID locally in app settings.

Required app settings fields:

```ts
app_settings {
  google_calendar_connected: boolean
  google_calendar_id: string | null
  google_calendar_name: string | null
  google_calendar_account_email: string | null
  google_calendar_connected_at: string | null
  google_calendar_last_sync_at: string | null
}
```

---

# Required Database Changes

Do not only store a single `google_calendar_event_id` in sessions.

This requirement needs multiple Calendar events per session.

A single session can have:

1. Main session event
2. Completion reminder event after session end
3. Completion snooze reminder event
4. Optional measurement reminder behavior

So create a dedicated table.

## New Table: calendar_events

```ts
calendar_events {
  id: string

  local_entity_type: 'session'
  local_entity_id: string // session.id
  client_id: string

  google_calendar_id: string | null
  google_event_id: string | null

  event_kind:
    | 'session_main'
    | 'session_completion_check'
    | 'session_completion_snooze'
    | 'measurement_session_note'

  status:
    | 'pending_create'
    | 'synced'
    | 'pending_update'
    | 'pending_delete'
    | 'deleted'
    | 'failed'

  scheduled_start_at: string
  scheduled_end_at: string

  title: string
  description: string
  color_id: string | null

  last_error: string | null
  retry_count: number

  created_at: string
  updated_at: string
}
```

Why this table is needed:

The current `sessions` table has only one `measure_reminder` flag and does not have space to track multiple Google Calendar events for the same session.

If we store only one `google_calendar_event_id`, we cannot separately manage:

* main session event
* post-session completion reminder
* snooze reminder
* measurement reminder logic

---

# New Table: calendar_sync_queue

```ts
calendar_sync_queue {
  id: string

  calendar_event_local_id: string
  local_entity_type: 'session'
  local_entity_id: string
  client_id: string

  action:
    | 'create'
    | 'update'
    | 'delete'

  status:
    | 'pending'
    | 'processing'
    | 'done'
    | 'failed'

  retry_count: number
  last_error: string | null

  created_at: string
  updated_at: string
}
```

Queue collapse rules:

```txt
create + update = create latest version
create + delete = remove queue item
update + delete = delete
delete + create = update/recreate depending on event state
```

Do not allow unlimited duplicate queue items for the same `calendar_event_local_id`.

---

# Required Calendar Event Types

## 1. Main Session Calendar Event

This is the actual training session event.

Example title without measurement reminder:

```txt
fit.persona: Anu - Training Session
```

Example title with measurement reminder:

```txt
📏 fit.persona: Anu - Session + Measurements
```

Start:

```txt
session.date + session.start_time
```

End:

```txt
session.date + session.end_time
```

Reminder rules:

1. 1 hour before session
2. Previous day evening

Example:

If session is on 2026-06-10 at 7:00 AM:

* reminder 1: 2026-06-09 evening
* reminder 2: 2026-06-10 6:00 AM

Google Calendar reminders are minutes-before-start, so calculate the previous-evening reminder as minutes before session start.

Default previous evening time:

```txt
18:00 Asia/Kolkata on previous day
```

Example calculation:

```ts
previousEveningReminderMinutes =
  differenceInMinutes(sessionStartAt, previousDayAt18_00)
```

For a 7:00 AM session, previous evening reminder is 13 hours before start:

```txt
780 minutes before
```

---

# Important Reminder Limitation

Google Calendar reminder overrides do not have separate custom text per reminder.

That means we cannot create:

```txt
Reminder 1 text: Session tomorrow evening
Reminder 2 text: Session in 1 hour
```

on the same Calendar event.

Google Calendar notification usually uses the event title and event details.

Expected implementation:

Change the event title and description based on whether measurement reminder is enabled.

Do not attempt to customize each reminder notification body separately because Calendar API does not support unique body per reminder override.

---

# Main Session Event Content

## Without Measurement Reminder

Title:

```txt
fit.persona: {clientName} - Training Session
```

Description:

```txt
Training session for {clientName}

Time:
{sessionStartDisplay} - {sessionEndDisplay}

Focus:
{session.focus}

Session Type:
{session.type}

Open fit.persona:
https://fitpersona.web.app/session/{session.id}
```

Color:

Use a normal session color.

Suggested app mapping:

```ts
session_main_without_measurement = '7'
```

---

## With Measurement Reminder Enabled

When `session.measure_reminder === true`, the main session event should stand out.

Title:

```txt
📏 fit.persona: {clientName} - Session + Measurements
```

Description:

```txt
Training session for {clientName}

Important:
Take body measurements at the end of this session.

Do not complete the session without checking measurements if required.

Time:
{sessionStartDisplay} - {sessionEndDisplay}

Focus:
{session.focus}

Session Type:
{session.type}

Open fit.persona:
https://fitpersona.web.app/session/{session.id}

Measurement screen:
https://fitpersona.web.app/client/{client.id}/progress
```

Color:

Use a different event color from normal sessions.

Suggested app mapping:

```ts
session_main_with_measurement = '10'
```

Reason:

The trainer wanted this reminder to stand out from other reminders.

Because Calendar notification body cannot be individually highlighted per reminder, the best practical fix is:

1. use an emoji in the event title
2. change the event title
3. change the event color
4. add clear measurement text in description

---

# 2. Post-Session Completion Reminder Event

Problem:

The trainer may forget to mark a session as:

* completed
* missed
* postponed

Requirement:

If the session is not marked as completed, missed, or postponed, remind trainer:

1. 5 minutes after session end time
2. 1 hour after session end time
3. Then snooze between 1-hour intervals until trainer takes action

Important:

Google Calendar reminders only work before an event starts.

So we should not try to use reminders on the original session event for post-session completion checks.

Expected fix:

Create separate Calendar events after the session end.

---

## Completion Check Event A

Event kind:

```ts
session_completion_check
```

Start:

```txt
session.end_time + 5 minutes
```

End:

```txt
session.end_time + 10 minutes
```

Title:

```txt
⚠️ fit.persona: Mark {clientName}'s session
```

Description:

```txt
Session ended recently.

Please mark this session as:
- Completed
- Missed
- Postponed

Client:
{clientName}

Session:
{sessionStartDisplay} - {sessionEndDisplay}

Open fit.persona:
https://fitpersona.web.app/session/{session.id}
```

Reminder:

```ts
popup at event start
```

Calendar reminder override:

```ts
minutes: 0
```

Color:

```ts
completion_check = '5'
```

---

## Completion Check Event B

Event kind:

```ts
session_completion_snooze
```

Start:

```txt
session.end_time + 1 hour
```

End:

```txt
session.end_time + 1 hour + 5 minutes
```

Title:

```txt
🔁 fit.persona: Still need to mark {clientName}'s session
```

Description:

```txt
This session is still not marked.

Please update the session status:
- Completed
- Missed
- Postponed

Client:
{clientName}

Open fit.persona:
https://fitpersona.web.app/session/{session.id}
```

Reminder:

```ts
popup at event start
```

Color:

```ts
completion_snooze = '11'
```

---

# Important Snooze Architecture

Google Calendar does not behave like a custom app notification engine where we can dynamically snooze every hour forever without creating/updating events.

Expected practical implementation:

Use a rolling snooze event.

Flow:

```txt
session ends
  ↓
completion check event fires at +5 min
  ↓
completion snooze event fires at +1 hour
  ↓
when app opens or background sync runs:
      if session still planned:
          move snooze event to next +1 hour
      else:
          delete snooze/check events
```

Do not pre-create infinite hourly events.

Why:

1. It pollutes Calendar.
2. It creates too many events.
3. It is hard to clean up.
4. It increases API usage.
5. It creates duplicate reminder risk.

Instead create only one active snooze event and keep moving it forward.

---

# Session Status Rules for Completion Reminders

Completion reminder should remain active only when:

```ts
session.status === 'planned'
```

Completion reminders should be deleted when:

```ts
session.status === 'completed'
session.status === 'missed'
session.status === 'postponed'
session.status === 'cancelled'
```

Current app uses postponing as updateSession with status planned and changed date/time.

So for postponed sessions:

1. If same session ID is moved to a new date/time, treat it as rescheduled.
2. Delete old completion reminder events.
3. Update main session event to new date/time.
4. Recreate completion reminder events based on new end_time.

If later a dedicated `postponed` status exists, completion reminders should be deleted immediately.

---

# 3. Measurement Reminder Behavior

Current session table already has:

```ts
measure_reminder
```

Requirement:

On session form there is a checkbox:

```txt
Remind me to take the measurement at the end of this session
```

When checked:

1. Do not necessarily create a separate measurement event.
2. Update the main session Calendar event so it clearly says measurement is required.
3. Make the main session event stand out.
4. The 1-hour-before session reminder should indirectly remind the trainer that measurement is needed.
5. The previous-evening reminder should also show that this session includes measurement.

Expected event update:

Title changes from:

```txt
fit.persona: Anu - Training Session
```

to:

```txt
📏 fit.persona: Anu - Session + Measurements
```

Description adds:

```txt
Important:
Take body measurements at the end of this session.
```

Color changes to measurement color.

---

# Important Measurement Limitation

Google Calendar cannot have a custom reminder body for only the 1-hour reminder and a different custom body for previous-evening reminder on the same event.

So the event itself must contain the measurement message.

Expected fix:

Use title + description + color to make the measurement reminder obvious.

Do not attempt unsupported custom reminder text per reminder.

---

# Calendar Event Lifecycle

## Create Session Flow

When `createSession()` succeeds locally:

Current existing flow must remain:

```txt
insert session
insert exercises
touch client version
set client sync pending
enqueueClientUpdate(clientId, ['sessions', 'exercises'])
scheduleBackgroundSync()
```

Add after local success:

```txt
CalendarReminderPlanner.planForSession(session.id)
```

This should:

1. Create local `calendar_events` records:

   * session_main
   * session_completion_check
   * session_completion_snooze
2. Enqueue calendar create operations.
3. Trigger calendar background sync if Calendar is connected.

Do not block session creation if Calendar is not connected.

If Calendar is not connected:

* Still create local session.
* Do not enqueue Google API call.
* Optionally mark calendar status as `not_connected`.

---

## Update Session Flow

When `updateSession()` succeeds locally:

Existing Drive sync flow remains unchanged.

Add:

```txt
CalendarReminderPlanner.replanForSession(session.id)
```

This should:

1. Load session.
2. Load existing calendar_events for this session.
3. Recalculate:

   * main event start/end/title/description/color/reminders
   * completion check time
   * snooze time
4. Queue update for existing Google events.
5. If an expected event does not exist, create it.
6. If an event is no longer needed, queue delete.

Example:

If trainer changes session from 7 AM to 8 AM:

* main session event start/end changes
* 1-hour reminder remains 60 minutes before
* previous-evening reminder minutes must be recalculated
* completion check event moves to end_time + 5 min
* completion snooze event moves to end_time + 1 hr

---

## Complete Session Flow

When `completeSession()` succeeds locally:

Existing flow remains:

```txt
update session status completed
insert sessionResults
touch client
enqueueClientUpdate(clientId, ['sessions', 'session_results'])
scheduleBackgroundSync()
```

Add:

```txt
CalendarReminderPlanner.onSessionCompleted(session.id)
```

Expected Calendar behavior:

1. Update main session event title:

```txt
✅ Completed: {clientName} - Training Session
```

or if measurement was required:

```txt
✅ Completed: {clientName} - Session + Measurements
```

2. Remove future reminders from main event.
3. Delete completion check event.
4. Delete completion snooze event.

Do not delete the main session event by default.

Reason:

Keeping the completed event gives the trainer history in Calendar.

---

## Mark Missed Flow

When `markSessionMissed()` succeeds locally:

Add:

```txt
CalendarReminderPlanner.onSessionMissed(session.id)
```

Expected Calendar behavior:

1. Update main session event title:

```txt
❌ Missed: {clientName} - Training Session
```

2. Remove future reminders.
3. Delete completion check event.
4. Delete completion snooze event.
5. Add missed reason/note to event description if available.

---

## Postpone Flow

Current app postpones by calling `updateSession()` with:

```ts
status: 'planned'
original_date: previous date
postponed_note: reason
new date/time
```

Expected Calendar behavior:

1. Keep same main Google Calendar event if possible.
2. Move the main event to new date/time.
3. Update description with postponed note.
4. Delete old completion reminder events.
5. Recreate or update completion reminder events based on new end_time.
6. Recalculate previous-evening reminder.

Title:

```txt
↪️ Postponed: {clientName} - Training Session
```

or simply keep:

```txt
fit.persona: {clientName} - Training Session
```

depending on UI preference.

Default expected behavior:

Use normal title but add postponed note in description.

---

## Revert Session Flow

Current `revertSession()` sets session back to planned and deletes sessionResults.

Expected Calendar behavior:

1. Main event becomes normal planned title again.
2. Reminders are restored.
3. Completion check event is recreated.
4. Completion snooze event is recreated.
5. Measurement text/color is restored if `measure_reminder === true`.

---

## Delete Session Flow

When `deleteSession()` succeeds locally:

Expected Calendar behavior:

1. Delete main session Calendar event.
2. Delete completion check event.
3. Delete completion snooze event.
4. Mark local calendar_events as deleted.
5. Queue delete for any synced Google events.

---

# Calendar Sync Service Architecture

Create:

```txt
src/services/calendar/
  calendarAuthService.ts
  calendarSetupService.ts
  calendarApiClient.ts
  calendarEventMapper.ts
  calendarReminderPlanner.ts
  calendarSyncQueue.ts
  calendarSyncService.ts
```

---

## calendarAuthService.ts

Responsibilities:

1. Connect Google Calendar.
2. Store auth token securely.
3. Refresh token when required.
4. Disconnect Calendar.
5. Provide valid access token to API client.

Do not mix Calendar auth with session logic.

---

## calendarSetupService.ts

Responsibilities:

1. After Google Calendar connection, check if `fit.persona Sessions` calendar exists.
2. If yes, store its calendar ID.
3. If not, create it.
4. Store calendar settings locally.

Pseudo flow:

```ts
async function ensureFitPersonaCalendar() {
  const calendars = await calendarApiClient.listCalendars()
  const existing = calendars.find(c => c.summary === 'fit.persona Sessions')

  if (existing) {
    await settingsRepo.saveGoogleCalendarId(existing.id)
    return existing.id
  }

  const created = await calendarApiClient.createCalendar({
    summary: 'fit.persona Sessions',
    description: 'Session and reminder calendar for fit.persona'
  })

  await settingsRepo.saveGoogleCalendarId(created.id)
  return created.id
}
```

---

## calendarApiClient.ts

Responsibilities:

Only Google Calendar API calls.

Required methods:

```ts
createCalendar(input)
listCalendars()
createEvent(calendarId, eventBody)
updateEvent(calendarId, eventId, eventBody)
deleteEvent(calendarId, eventId)
getEvent(calendarId, eventId)
```

This file should not know about session business logic.

---

## calendarEventMapper.ts

Responsibilities:

Convert local `calendar_events` rows into Google Calendar API event payloads.

Required event payload fields:

```ts
{
  summary,
  description,
  start,
  end,
  colorId,
  reminders,
  extendedProperties: {
    private: {
      app: 'fit.persona',
      session_id,
      client_id,
      event_kind,
      local_calendar_event_id
    }
  }
}
```

Use `extendedProperties.private` so we can identify app-created events later.

---

## calendarReminderPlanner.ts

Responsibilities:

This is the brain that decides which Calendar events should exist for a session.

Required methods:

```ts
planForSession(sessionId)
replanForSession(sessionId)
onSessionCompleted(sessionId)
onSessionMissed(sessionId)
onSessionDeleted(sessionId)
onSessionReverted(sessionId)
```

This file should not call Google API directly.

It should only:

1. Read local session/client data.
2. Create/update/delete local `calendar_events` rows.
3. Enqueue calendar sync operations.

---

## calendarSyncService.ts

Responsibilities:

Process `calendar_sync_queue`.

Flow:

```txt
read pending queue items
  ↓
mark item processing
  ↓
load local calendar_event
  ↓
map to Google Calendar event body
  ↓
call Calendar API
  ↓
store google_event_id on success
  ↓
mark queue done
```

Failure behavior:

```txt
if API fails:
  mark queue item failed
  increment retry_count
  save last_error
  do not affect Drive sync
  do not affect local session data
```

Retry backoff:

Use same style as Drive sync:

```txt
5s, 30s, 300s
max retries: 3
```

---

# Reminder Calculation Details

Assume timezone:

```txt
Asia/Kolkata
```

All Calendar event `start.dateTime` and `end.dateTime` should use RFC3339 datetime with timezone.

Example:

```ts
start: {
  dateTime: '2026-06-10T07:00:00+05:30',
  timeZone: 'Asia/Kolkata'
}
```

## Session Main Event Reminders

Default reminders:

```ts
[
  {
    method: 'popup',
    minutes: 60
  },
  {
    method: 'popup',
    minutes: previousEveningMinutes
  }
]
```

Previous evening time:

```txt
Previous day 18:00
```

If previous evening time is already past when session is created, skip that reminder.

Example:

If session is created at 10 PM today for tomorrow 7 AM, previous evening already passed. Only keep 1-hour reminder.

---

# Calendar Event Color Mapping

Use color IDs from Google Calendar event colors.

Recommended mapping:

```ts
const CALENDAR_EVENT_COLORS = {
  sessionNormal: '7',
  sessionWithMeasurement: '10',
  completionCheck: '5',
  completionSnooze: '11',
  completed: '2',
  missed: '4'
}
```

Do not hardcode color meaning in UI text.

Create a named mapping file:

```txt
src/services/calendar/calendarColors.ts
```

Reason:

Google Calendar uses color IDs, not hex colors in event insert/update.

---

# Deep Link Rules

Put app links in Calendar event description.

Use HTTPS PWA link:

```txt
https://fitpersona.web.app/session/{session.id}
```

Do not depend only on custom schemes like:

```txt
fitpersona://session/{session.id}
```

Reason:

Calendar notification click usually opens Google Calendar first.

The trainer can open the event and tap the fit.persona link.

---

# Drive Sync Interaction Rules

Do not put Google Calendar event data inside Drive client snapshot unless we intentionally want it synced across devices.

Recommended:

Calendar event mapping should be local-device/app-settings based.

But because trainer may use multiple devices with same Google account, we need avoid duplicate Calendar events.

Expected safe approach:

Store `calendar_events` locally and include minimum Calendar metadata in client snapshot only if multi-device Calendar creation is expected.

Better MVP approach:

Only the device connected to Google Calendar creates Calendar events.

Add setting:

```ts
google_calendar_enabled_on_this_device: boolean
```

If disabled, session changes should not create Calendar events from that device.

Reason:

Current Drive sync is client-snapshot based. If two devices both sync the same session and both have Calendar enabled, they may create duplicate Calendar events.

MVP rule:

```txt
Only one active device should own Google Calendar reminders.
```

Add UI text:

```txt
Calendar reminders are managed from this device.
Use only one device for Calendar reminders to avoid duplicate reminders.
```

Advanced later:

Sync `calendar_events` table across Drive snapshot and use deterministic Google event IDs.

---

# Duplicate Prevention

Use deterministic local IDs for Calendar events.

Example:

```ts
calendar_event.id = `${session.id}:session_main`
calendar_event.id = `${session.id}:completion_check`
calendar_event.id = `${session.id}:completion_snooze`
```

For Google event ID, either:

1. Let Google generate event ID and store it locally.
2. Or generate deterministic Google-safe event ID.

MVP:

Let Google generate event ID and store it.

But before creating a new event, check:

```txt
Does local calendar_events row already have google_event_id?
  yes → update
  no → create
```

Do not create blindly.

---

# Expected User-Facing Behavior

## When trainer creates session

* Session appears immediately in app.
* Drive sync continues as before.
* Calendar event is created in `fit.persona Sessions`.
* Trainer gets:

  * previous-day evening reminder
  * 1-hour-before reminder
  * post-session completion check reminder
  * 1-hour snooze reminder if not marked

## When trainer checks measurement reminder

Calendar main session event changes to:

```txt
📏 fit.persona: {clientName} - Session + Measurements
```

Description clearly says:

```txt
Take body measurements at the end of this session.
```

Event color changes to measurement color.

## When trainer completes session

* App saves session result locally.
* Drive sync uploads client snapshot.
* Main Calendar event becomes completed.
* Future reminders are removed.
* Completion check/snooze events are deleted.

## When trainer marks missed

* Main Calendar event becomes missed.
* Completion reminders are deleted.

## When trainer postpones

* Same session ID is moved.
* Main Calendar event is moved.
* Reminder times are recalculated.
* Completion reminders are moved/recreated.

---

# What Not To Implement

Do not implement Google Calendar webhook/watch now.

Reason:

It requires an HTTPS server/webhook and increases backend complexity.

Do not implement bidirectional Calendar sync.

Reason:

Local app is source of truth.

Do not read Calendar events and update sessions based on Calendar edits.

Reason:

If trainer manually edits Calendar, it can conflict with app data.

App should overwrite Calendar during next sync if necessary.

Do not use Calendar as database.

---

# Acceptance Criteria

## Session Create

Given Calendar is connected,
when trainer creates a planned session,
then local IndexedDB session is created,
and Drive sync is queued as before,
and Calendar events are locally planned,
and Google Calendar events are created in `fit.persona Sessions`.

Expected Calendar events:

1. Main session event
2. Completion check event at session end + 5 minutes
3. Completion snooze event at session end + 1 hour

## Session Update

Given a session has existing Calendar events,
when trainer changes date/time,
then existing Calendar events are updated,
not duplicated.

## Measurement Reminder

Given `measure_reminder = true`,
when Calendar main event is created or updated,
then title includes measurement indicator,
description includes measurement instruction,
and color is changed.

## Session Complete

Given a session is marked completed,
then completion check and snooze Calendar events are deleted,
main session event is marked completed,
and reminders are removed.

## Session Missed

Given a session is marked missed,
then completion reminder events are deleted,
main event is updated as missed,
and reminders are removed.

## Session Delete

Given a session is deleted,
then all related Calendar events are deleted or marked pending_delete if offline.

## Offline Behavior

Given internet is unavailable,
when session is created,
then local session still succeeds,
Drive queue still works as before,
Calendar queue stores pending operations,
and Calendar sync retries later.

## Duplicate Safety

Given sync runs multiple times,
Calendar events should not duplicate for the same session.

---

# Final Implementation Principle

Keep these three systems separate:

```txt
1. IndexedDB = source of truth
2. Google Drive = backup/sync snapshot
3. Google Calendar = reminder mirror
```

Calendar integration must be implemented as a side-effect queue after local DB mutation.

Do not weaken or rewrite the current Drive client-snapshot sync.

Only extend the session lifecycle with Calendar reminder planning.
