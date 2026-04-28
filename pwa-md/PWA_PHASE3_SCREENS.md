# Phase 3 — Screens

## Context
Phase 1 — Foundation ✅
Phase 2 — UI Components ✅

Now build all screens using the components from Phase 2.

---

## Rules
- Use only components built in Phase 2
- No inline styles (Tailwind only)
- No hardcoded data (use Zustand store)
- Screens are layout only — no business logic inside screens
- All data comes from store or passed as props
- Keep screens lean and clean

---

## Screens to build

### 1. src/screens/DashboardScreen.tsx
Reference: /reference/app/screens/DashboardScreen.tsx
         /reference/components/dashboard/

Sections:
- TopNavBar (app name + sync indicator)
- StatsCards (total clients, active, today sessions)
- TodaySchedule (list of today's sessions)
- ClientRoster (searchable client list)
- Floating Add Client button (bottom right)

---

### 2. src/screens/ClientScreen.tsx
Reference: /reference/app/screens/ClientScreen.tsx
         /reference/components/client/

Sections:
- TopNavBar (back button + client name)
- ClientHeaderCard (name, status, avatar)
- Tab bar with these tabs:
  - Overview
  - Sessions
  - Plans (workout + diet)
  - Progress (measurements + analytics)
  - Profile

Each tab renders its own section component.
Build each section as separate component in:
src/components/client/

---

### 3. src/screens/AddClientScreen.tsx
Reference: /reference/components/modals/AddClientModal.tsx
         /reference/components/modals/AddClientSteps/

Multi step flow:
Step 1 — Personal Info
Step 2 — Interview (optional, can skip)
Step 3 — Assessment (optional, can skip)
Step 4 — Goal

- Progress indicator at top (step 1 of 4)
- Back and Next buttons
- Skip option on optional steps
- Final step: Save button

---

### 4. src/screens/ScheduleScreen.tsx
Reference: /reference/components/schedule/

Sections:
- Month/week calendar grid
- Day view (sessions for selected day)
- Add session button

---

### 5. src/screens/SettingsScreen.tsx
- Google Drive connection status
- Sync now button
- Last synced time
- App version

---

## Modals
Build these as separate components in src/components/modals/
They are triggered from screens, not separate routes.

Reference: /reference/components/modals/

- AddSessionModal.tsx
- CompleteSessionModal.tsx
- AddMeasurementModal.tsx
- AddPlanModal.tsx
- EditWeeklyPlanModal.tsx
- ManageSessionModal.tsx
- ClientProfileModal.tsx
- ConfirmationModal.tsx
- ManageMetricsModal.tsx

---

## Routing
Set up React Router in src/router.tsx:

/ → DashboardScreen
/client/:id → ClientScreen
/add-client → AddClientScreen
/schedule → ScheduleScreen
/settings → SettingsScreen

Use lazy loading for all routes:
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'))

Wrap router in Suspense with a simple loading spinner.

---

## After Phase 3
Stop and confirm.
Do not connect data yet.
UI should be fully working with mock/empty data.