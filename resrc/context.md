# ROLE

You are a senior system architect specializing in mobile offline-first applications.

This is NOT a UI task.
This is NOT a coding task.

Your job is to analyze an EXISTING UI codebase (generated from Figma) resrc/src and produce a COMPLETE backend/data architecture document in markdown (context.md).

---

# CONTEXT

We have:

* A React Native + Expo + TypeScript project
* UI screens already created from Figma (inside /src)
* ZERO backend logic
* ZERO data structure
* ZERO sync logic

The app is a Trainer CMS:

* Manage clients (20–25 max)
* Track sessions
* Track progress (measurements + photos)
* Create workout & diet plans
* Generate reports
* Sync with Google Drive (async, NOT real-time)

---

# PROBLEM

UI exists, but:

* No data model defined
* No clear ownership of data
* No separation between:

  * static data (profile)
  * dynamic logs (sessions, progress)
  * derived data (analytics)
* No sync strategy
* No state structure

If we proceed without fixing this:
→ System will become messy and unmaintainable

---

# TASK

Analyze the `/src` folder and produce a COMPLETE SYSTEM DESIGN DOCUMENT in markdown.

---

# 1️⃣ SCREEN → DATA MAPPING (VERY IMPORTANT)

For EACH screen in `/src`, define:

* What data it needs
* Where that data comes from
* Whether data is:

  * stored
  * derived
  * temporary (UI state)

Example:

Dashboard:

* Today sessions (derived)
* Client list (stored)
* Missed sessions (derived)

Client Screen:

* Profile (stored)
* Sessions (stored, append-only)
* Progress (time-series)
* Plans (structured)

---

# 2️⃣ DATA MODEL (STRICT STRUCTURE)

Define core entities:

Client
ClientProfile
Session
Progress
Plan

---

## REQUIREMENTS

* Sessions MUST be append-only
* Progress MUST be time-series
* Plans MUST be structured (weekly blocks)
* Analytics MUST NOT be stored

---

# 3️⃣ LOCAL STORAGE DESIGN

Define:

* SQLite tables
* Relationships
* What goes in DB vs FileSystem

---

# 4️⃣ GOOGLE DRIVE STRUCTURE

Design:

Drive/
└── fit_persona/
├── meta.json
├── clients_index.json
└── clients/
└── {client_id}.json

Explain:

* What each file contains
* Why this structure is used

---

# 5️⃣ SYNC FLOW (MINIMAL)

Define:

* When sync runs
* How changes are detected
* How partial updates handled
* How deletion works

STRICT:

* No real-time sync
* No complex conflict resolution
* Assume single user, multi-device (not simultaneous)

---

# 6️⃣ STATE MANAGEMENT (ZUSTAND)

Define:

* What belongs in Zustand
* What belongs in DB
* What should NEVER be in state

---

# 7️⃣ CRUD FLOWS (VERY IMPORTANT)

Explain step-by-step:

* Create Client
* Update Client
* Add Session
* Add Progress
* Delete Client

Include:

* Local write
* Sync behavior

---

# 8️⃣ EDGE CASES

Explain handling:

* App crash during save
* Sync interrupted
* Duplicate entries
* Missing files in Drive
* Photo deleted locally but exists in Drive

---

# OUTPUT FORMAT

Return a clean markdown document:

# Trainer CMS Architecture

## 1. Screen → Data Mapping

## 2. Data Model

## 3. Local Storage

## 4. Drive Structure

## 5. Sync Flow

## 6. State Management

## 7. CRUD Flows

## 8. Edge Cases

---

# STRICT RULES

* DO NOT write code
* DO NOT assume backend server
* DO NOT overengineer
* MUST be minimal and scalable
* MUST explain WHY for each decision

---

# Trainer CMS Architecture (Offline-first + Google Drive Sync)

---

# 1. Drive Structure (FINAL)

```
Drive/
└── fit_persona/
    ├── meta.json
    ├── clients_index.json
    └── clients/
        ├── c1.json
        ├── c2.json
        ├── c3.json
```

---

## 🔹 meta.json

### Structure

```json
{
  "last_global_update": "2026-04-10T10:00:00Z"
}
```

### Purpose

meta.json is a **global change trigger**, not a data source.

### Why it exists

Without this:

* Every sync → must fetch index
* Wastes network + time

With this:

* App first checks meta
* If unchanged → skip everything

### Key Rule

👉 meta does NOT tell *what changed*
👉 It only tells *something changed*

---

## 🔹 clients_index.json

### Structure

```json
[
  {
    "client_id": "c1",
    "drive_file_id": "1abcXYZ",
    "updated_at": "2026-04-10T09:50:00Z"
  }
]
```

### Purpose

This is the **change detection engine**

### Why it exists

Problem:

* Without index → must open all client files ❌

Solution:

* Index gives lightweight comparison ✅

### What it solves

* Detect changed clients fast
* Avoid downloading all data
* Enable partial sync

---

## 🔹 clients/{client_id}.json

### Structure

```json
{
  "client": {},
  "profile": {},
  "measurements": [],
  "sessions": [],
  "exercise_logs": [],
  "plans": [],
  "media": []
}
```

### Purpose

👉 This is the **source of truth**

### Why per-client file?

Instead of:

```
one_big.json ❌
```

We use:

```
per-client files ✅
```

### Benefits

* Small file size
* Partial updates
* No overwrite risk
* Easier recovery

---

# 2. Metadata Syncing (HOW + WHY)

---

## 🔥 Sync Trigger Logic

```
Step 1: Fetch meta.json
Step 2: Compare local_meta vs remote_meta

IF equal → STOP
IF different → proceed
```

---

## 🔥 Why NOT use index directly?

Because:

* Index fetch = network call
* Meta fetch = very small + fast

👉 meta acts as **gatekeeper**

---

## 🔥 Full Sync Flow

```
meta changed
   ↓
fetch clients_index
   ↓
compare updated_at per client
   ↓
fetch only changed clients
```

---

# 3. DELETE LOGIC (FULL EXPLANATION)

---

## ❓ How delete works?

👉 Soft delete → sync → remove from Drive → remove from index → propagate

---

## 🔴 Step-by-Step Flow

---

### 🟢 Step 1 — User deletes client (Device A)

We DO NOT delete immediately.

Instead:

```json
{
  "id": "c1",
  "status": "deleted",
  "updated_at": "new_time",
  "sync_status": "pending_delete"
}
```

---

### ❗ Why soft delete?

If we delete instantly:

* Other device won’t know
* No sync propagation

👉 Soft delete ensures:

* Sync engine can process deletion

---

### 🟢 Step 2 — Sync Engine Runs (Device A)

---

#### 2.1 Delete file from Drive

```
DELETE clients/c1.json
```

---

#### 2.2 Remove from clients_index.json

```json
// c1 removed
```

---

#### 2.3 Update meta.json

```json
{
  "last_global_update": "new_time"
}
```

---

#### 2.4 Remove locally

* Delete client from DB
* Delete images from local storage

---

# ❓ How other device knows?

👉 Missing in clients_index.json

---

## 📲 Device B Sync Flow

---

### Step 1 — Fetch meta

Mismatch → continue

---

### Step 2 — Fetch clients_index

👉 c1 is missing

---

### Step 3 — Compare with local DB

```js
if (local has c1 && index does NOT have c1) {
   delete locally
}
```

---

### Step 4 — Cleanup

* Remove client
* Remove images

---

# 🧠 WHY THIS WORKS

---

## Key Principle

👉 **Index defines existence**

| State            | Meaning        |
| ---------------- | -------------- |
| Present in index | client exists  |
| Missing in index | client deleted |

---

## Why not use change logs?

* Logs grow over time
* Expensive to scan
* Not reliable for deletion

👉 Index is simpler and safer

---

# 4. UPLOAD FLOW (CORRECT ORDER)

---

## 🔼 Upload Steps

```
1. Update client file
2. Update clients_index
3. Update meta
```

---

## ❗ Why order matters

Wrong order:

```
meta → index → client ❌
```

👉 Other device reads incomplete state

Correct order:

```
client → index → meta ✅
```

---

# 5. DOWNLOAD FLOW

---

```
1. Fetch meta
2. If changed → fetch index
3. Compare updated_at
4. Fetch only changed clients
5. Update local DB
```

---

# 6. WHY THIS ARCHITECTURE IS CORRECT

---

## ✅ Efficiency

* No full dataset download
* Only changed clients fetched

---

## ✅ Safety

* No data loss
* No race conditions

---

## ✅ Simplicity

* No backend needed
* No complex diffing

---

## ✅ Scalability (for your use case)

* 20–25 clients → perfect fit
* Each file small → fast operations

---

# 7. FINAL SYSTEM MODEL

---

```
meta → trigger
index → detect changes
client file → truth
local DB → working copy
```

---

# 🔥 FINAL INSIGHT

This system is:

👉 **State-based sync (not log-based)**
👉 **Index-driven (not scan-based)**
👉 **File-level isolation (not global JSON)**

---

# 🚀 RESULT

You now have:

* Efficient sync ✅
* Safe delete propagation ✅
* Minimal network usage ✅
* Offline-first architecture ✅

---

This is a **production-grade architecture for your scale**.


# GOAL

The output should act as a COMPLETE backend blueprint so that implementation can start with ZERO confusion.



1. Problem Definition (REAL REQUIREMENT)
🔹 Trainer Needs

The trainer workflow is NOT random.

It follows:

Monthly Goal → Weekly Breakdown → Daily Sessions → Exercises
🔹 Real Example
Month: Fat Loss Phase
   ↓
Week 1: Adaptation
Week 2: Intensity
Week 3: Overload
Week 4: Deload
🔴 Core Problem

We must support:

Monthly planning (strategy)
Weekly planning (execution)
Standalone weekly plans (flexibility)
2. WRONG APPROACHES (WHY THEY FAIL)
❌ Only Weekly Plans
week1
week2
week3
week4
Problems
No monthly goal ❌
No progression ❌
No grouping ❌
Analytics impossible ❌
❌ Separate Monthly & Weekly (No Link)
monthly_plan
weekly_plan
Problems
No relationship ❌
Data duplication ❌
Sync confusion ❌
3. FINAL ARCHITECTURE (DECISION)
🔥 Core Model
Plan (root)
   ├── Weekly Plans
         ├── Sessions
               ├── Exercises
🧠 Key Idea

👉 Everything is a Plan

But:

Type	Meaning
Monthly	Strategy container
Weekly	Execution unit
4. DATA STRUCTURE (FINAL)
🔹 Plan
Plan {
  id: string
  client_id: string

  type: 'monthly' | 'weekly'

  title: string
  goal: string

  start_date: string
  end_date: string

  parent_plan_id: string | null
  order_index: number | null

  status: 'active' | 'completed' | 'upcoming'

  created_at: string
  updated_at: string
}
🔹 Session
Session {
  id: string
  plan_id: string

  date: string
  day_name: string

  focus: string

  status: 'planned' | 'completed' | 'missed'

  notes?: string

  created_at: string
  updated_at: string
}
🔹 Exercise
Exercise {
  id: string
  session_id: string

  name: string
  sets: number
  reps: string
  weight?: number

  progression_note?: string

  created_at: string
}
5. RELATIONSHIP MODEL
🔵 Monthly Plan
Plan (monthly)
   ├── Plan (weekly)
   ├── Plan (weekly)
   ├── Plan (weekly)
🟡 Weekly Plan (Standalone)
Plan (weekly)
   ├── Sessions
🔥 Key Rule

👉 Monthly has NO sessions

👉 Weekly has ALL sessions

6. EXAMPLE (FULL DATA FLOW)
🔹 Monthly Plan
{
  "id": "plan_m1",
  "type": "monthly",
  "title": "Fat Loss - April",
  "goal": "Reduce body fat",
  "parent_plan_id": null
}
🔹 Weekly Plans
[
  {
    "id": "plan_w1",
    "type": "weekly",
    "goal": "Adaptation",
    "parent_plan_id": "plan_m1",
    "order_index": 1
  },
  {
    "id": "plan_w2",
    "type": "weekly",
    "goal": "Intensity",
    "parent_plan_id": "plan_m1",
    "order_index": 2
  }
]
🔹 Sessions
[
  {
    "id": "s1",
    "plan_id": "plan_w1",
    "date": "2026-04-01",
    "focus": "Upper Body",
    "status": "planned"
  }
]
🔹 Exercises
[
  {
    "id": "e1",
    "session_id": "s1",
    "name": "Bench Press",
    "sets": 4,
    "reps": "8-10"
  }
]
7. DRIVE STRUCTURE INTEGRATION

(Aligned with your sync system)

🔹 Inside clients/{client_id}.json
{
  "client": {},
  "plans": [],
  "sessions": [],
  "exercises": []
}
🔥 Why FLAT Structure
❌ Wrong
plan → weeks → sessions → exercises
Problems
Hard updates ❌
Full file rewrite ❌
Sync conflicts ❌
✅ Correct
plans[]
sessions[]
exercises[]
Benefits
Partial updates ✅
Easy sync ✅
No conflicts ✅
8. WORKFLOW (HOW SYSTEM WORKS)
🟢 Create Plan Flow
Step 1

User selects:

Monthly Plan
OR
Weekly Plan
🔵 If Monthly
Step 2

Enter:

Title
Goal
Duration
Step 3

Create weeks:

Auto → 4 weeks
OR
Manual
Step 4

Add weekly goals

🟡 If Weekly
Direct creation
No parent
9. UI FLOW
Dashboard
   ↓
Client Screen
   ↓
Plans Section
   ↓
Monthly Plan Card
   ↓
Expand
   ↓
Weekly Plans
   ↓
Select Week
   ↓
Sessions
   ↓
Exercises
10. RULES (STRICT ENFORCEMENT)
🔴 Rule 1 — No Sessions in Monthly
monthly.sessions ❌
weekly.sessions ✅
🔴 Rule 2 — Parent Linking
parent_plan_id = null → standalone
parent_plan_id = monthly → child
🔴 Rule 3 — Order is Mandatory
order_index = 1 → Week 1
🔴 Rule 4 — No Duplication
Weekly must NOT be copied into monthly
🔴 Rule 5 — Dates Required

Without dates:

No tracking ❌
No calendar ❌
11. ANALYTICS CAPABILITY (WHY THIS MATTERS)

With this structure, you can compute:

🔹 Monthly Completion
completed_sessions / total_sessions
🔹 Weekly Performance
adherence %
missed sessions
🔹 Progress Tracking
weight progression
overload tracking
12. COMMON FAILURES (AVOID)
❌ Only Weekly

→ No structure

❌ Nested JSON

→ Sync breaks

❌ No Parent ID

→ No grouping

❌ No Status

→ No tracking

13. FINAL SYSTEM MODEL
Plan → hierarchy
Weekly → execution
Session → daily work
Exercise → detailed work
🔥 FINAL INSIGHT

This system is:

👉 Hierarchical (but stored flat)
👉 Sync-safe
👉 Analytics-ready
👉 UI-friendly

🚀 RESULT

You now have:

Structured planning ✅
Flexible workflow ✅
Clean sync model ✅
Future-ready analytics ✅



----------------------------------------------------------------------------
[DASHBOARD]
   │
   ├── Tap Client ───────────────▶ [CLIENT SCREEN]
   │                                 │
   │                                 ├── Back ─────────▶ Dashboard
   │                                 │
   │                                 ├── Profile Icon ─▶ [PROFILE MODAL]
   │                                 │                      ├── Edit → Form → Save → Back
   │                                 │                      └── Close → Client
   │                                 │
   │                                 ├── Overview Edit ─▶ Modal → Save → Back
   │                                 │
   │                                 ├── Add Session ─▶ Modal → Save → Back
   │                                 │
   │                                 ├── Add Progress ─▶ Modal → Save → Back
   │                                 │
   │                                 ├── Analytics ─▶ Expand / Collapse
   │                                 │
   │                                 ├── Workout Edit ─▶ Modal → Save → Back
   │                                 │
   │                                 └── Diet Edit ─▶ Modal → Save → Back
   │
   └── FAB (+) ─────────────────────▶ [ADD CLIENT FLOW]
                                        ├── Step 1
                                        ├── Step 2
                                        ├── Step 3
                                        └── Submit → Client Screen
---------------------------------------------------------------------------------


