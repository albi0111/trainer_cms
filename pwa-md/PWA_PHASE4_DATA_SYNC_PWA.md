# Phase 4 — Data, Sync, PWA Final

## Context
Phase 1 — Foundation ✅
Phase 2 — UI Components ✅
Phase 3 — Screens ✅

Now connect everything:
- Dexie (local data)
- Services (business logic)
- Google Drive (sync)
- PWA finalization

---

## Step 1 — Dexie Database

Build src/db/db.ts

Reference schema: /reference/services/db/schema.ts
Rebuild as Dexie schema (not SQLite).

Rules:
- One Dexie instance, exported as singleton
- All tables from reference schema
- Use UUID as primary key (same as current app)

Example pattern (follow this):
import Dexie from 'dexie'

class FitPersonaDB extends Dexie {
  clients!: Table<Client>
  sessions!: Table<Session>
  measurements!: Table<Measurement>
  plans!: Table<Plan>

  constructor() {
    super('fit-persona')
    this.version(1).stores({
      clients: 'id, status, createdAt',
      sessions: 'id, clientId, date',
      measurements: 'id, clientId, date',
      plans: 'id, clientId, type'
    })
  }
}

export const db = new FitPersonaDB()

---

## Step 2 — Services

Build all services in src/services/
Reference: /reference/services/ (logic only, not implementation)

Rules:
- Replace all SQLite calls with Dexie calls
- Replace Expo FileSystem with Browser File API
- Keep same function signatures where possible
- Services return Promises
- No UI logic inside services

Services to build:

src/services/client/clientService.ts
- createClient()
- updateClient()
- deleteClient()
- getClients()
- getClientById()

src/services/session/sessionService.ts
- createSession()
- updateSession()
- completeSession()
- getSessionsByClient()
- getTodaySessions()

src/services/measurement/measurementService.ts
- addMeasurement()
- getMeasurementsByClient()
- getLatestMeasurement()

src/services/plan/planService.ts
- createPlan()
- updatePlan()
- getPlansByClient()

src/services/schedule/scheduleService.ts
- getScheduleByDate()
- getMonthSchedule()

src/services/analytics/analyticsService.ts
- getClientProgress()
- getStats()

---

## Step 3 — Google Drive Sync

Build src/services/sync/

Reference: /reference/services/sync/
Keep same JSON structure (meta.json, clients_index.json)

Auth:
- Use Google Identity Services (web OAuth)
- NOT expo-auth-session
- Store token in localStorage

Files to build:

src/services/sync/googleAuth.ts
- initGoogleAuth()
- signIn()
- signOut()
- getToken()

src/services/sync/driveService.ts
- uploadFile()
- downloadFile()
- listFiles()

src/services/sync/syncService.ts
- syncToCloud()
- syncFromCloud()
- checkForUpdates()

Rules:
- Sync is always async
- Never block UI for sync
- Local Dexie is always source of truth
- Show sync status in TopNavBar (already built in Phase 3)

---

## Step 4 — Connect Store to Services

Update src/store/useAppStore.ts

- All actions call services
- Services read/write Dexie
- After every write: trigger async sync
- Store holds UI state + cached data

---

## Step 5 — PWA Finalization

### vite.config.ts PWA config:
registerType: 'autoUpdate'
Cache strategy: CacheFirst for assets
workbox: precache all assets

### public/manifest.json:
{
  "name": "fit.persona",
  "short_name": "fit.persona",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}

### Offline behavior:
- First visit: loads from Firebase
- Service worker caches app shell
- Next visits: loads from cache
- Drive sync works only when online
- All local features work offline

---

## Step 6 — Firebase Hosting Setup

Create firebase.json:
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}

Create .firebaserc:
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}

Add to package.json scripts:
"build": "vite build",
"deploy": "vite build && firebase deploy"

---

## Performance Checklist
After everything is done, verify:

[ ] Bundle size under 300kb gzipped
[ ] Lighthouse PWA score 90+
[ ] Lighthouse Performance score 90+
[ ] Works fully offline
[ ] Installs correctly on iPad (Add to Home Screen)
[ ] Installs correctly on Android (Add to Home Screen)
[ ] No console errors in production build
[ ] All screens load under 1 second
[ ] Drive sync does not block any UI interaction

---

## Final check before deploy
Run:
npm run build

Check dist/ folder size.
If any chunk is over 500kb, split it.

Then deploy:
firebase deploy

Test on:
- iPad Safari (Add to Home Screen)
- Android Chrome (Add to Home Screen)
- Offline mode (turn off WiFi after first load)