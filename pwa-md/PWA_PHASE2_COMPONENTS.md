# Phase 2 — Shared UI Components

## Context
Phase 1 is complete.
Foundation is ready (Vite + React + TypeScript + Tailwind + PWA config).

Now we build the shared UI component library.
These are the building blocks used across all screens.

---

## Rules
- HTML + Tailwind only
- No React Native components
- No external UI libraries (no MUI, no Chakra, no Shadcn)
- Every component must be reusable and props-driven
- Dark theme by default
- Mobile first

---

## Components to build

### src/components/ui/

Button.tsx
- variants: primary, secondary, ghost, danger
- sizes: sm, md, lg
- loading state (spinner)
- disabled state
- full width option

Input.tsx
- label prop
- error state + error message
- placeholder
- disabled state
- types: text, number, email, password

Select.tsx
- label prop
- options array (label + value)
- error state
- placeholder option

Checkbox.tsx
- label prop
- checked state
- onChange handler

TextArea.tsx
- label prop
- rows prop
- error state

DatePicker.tsx
- Native HTML date input styled
- label prop
- min/max date

TimePicker.tsx
- Native HTML time input styled
- label prop

Modal.tsx
- overlay backdrop
- close on backdrop click
- title prop
- children
- footer slot (for action buttons)

Badge.tsx
- variants: active, inactive, warning, success
- small pill shape

EmptyState.tsx
- icon slot
- title prop
- subtitle prop
- optional action button

Card.tsx
- padding variants
- optional border
- dark background

Avatar.tsx
- initials fallback
- image support
- size variants: sm, md, lg

---

### src/components/layout/

TopNavBar.tsx
- title prop
- optional back button
- optional right action slot

BottomNav.tsx
- 4 tabs: Dashboard, Schedule, Clients, Settings
- active state highlight
- icons

PageWrapper.tsx
- handles safe area padding
- consistent page padding
- scroll container

---

## Design reference
Use /reference/components/shared/ for behavior only.
Use /reference/theme/theme.ts for colors and spacing.
Rebuild everything in Tailwind.

---

## After Phase 2
Stop and confirm.
Do not start screens yet.