# Settings — Implementation Plan

> **Status:** Analysis phase. Planning document.
> **Last updated:** 2026-06-12

---

## Existing Infrastructure Audit

### What Already Exists

| Asset | Location | Status | Notes |
|---|---|---|---|
| Notification settings page | `client/src/app/(protected)/settings/notifications/page.tsx` | ✅ | Client-side UI with toggles. API calls return 404 (no server endpoints). |
| Theme toggle | `client/src/shared/components/theme-toggle.tsx` | ✅ | Dark/light toggle using `next-themes`. Stored in localStorage. |
| Theme provider | `client/src/shared/providers/theme-provider.tsx` | ✅ | Wraps `next-themes` `ThemeProvider`. Default: dark. |
| Auth store | `client/src/modules/auth/store/useAuthStore.ts` | ✅ | Stores Supabase user. `setUser`, `clearAuth` methods. |
| Logout flow | `client/src/modules/auth/hooks/useAuth.ts` + `client/src/shared/providers/auth-provider.tsx` | ✅ | Full logout with socket disconnect + store reset. |
| User model (Prisma) | `server/prisma/schema.prisma` | ✅ | `User`: id, email, username, avatarUrl |
| `GET /api/me` | `server/src/app.ts` | ✅ | Returns current Prisma user for valid JWT |
| `PATCH /api/me` placeholder | — | ❌ | Does not exist |
| Custom status (User model) | — | ❌ | Does not exist |
| Preferences model | — | ❌ | Does not exist |
| Notification preferences (server) | — | ❌ | Planned in `.docs/new/notifications.md` (Phase 3 deferred) |
| Settings layout | — | ❌ | Does not exist |

### What's Missing

| Gap | Impact | Complexity |
|---|---|---|
| No settings layout (sidebar + content) | Settings pages feel disconnected | Medium |
| No profile settings page | Cannot edit username, avatar, display name | Medium |
| No notification preferences (server) | Notification toggles are client-only, don't persist | Medium |
| No account settings page | Cannot change password, email (relies on Supabase UI) | Low |
| No preferences model | No persistent per-user settings (theme, notifications) | Low |
| No appearance settings page | Theme choice not synced to server, doesn't persist across devices | Low |
| Settings routes not centralized | Only `/settings/notifications` exists, no parent layout | Low |
| No keyboard shortcuts view | Users don't know available shortcuts | Very Low |

---

## Architecture Decisions

### 1. Settings layout — nested layout with sidebar nav

Use Next.js nested layouts with a sidebar navigation:

```
/settings
├── /settings/profile         → Profile (username, display name, bio, avatar)
├── /settings/notifications   → Notification preferences
├── /settings/appearance      → Theme (dark/light/system)
├── /settings/account         → Email, password, danger zone (delete account)
```

The settings layout provides a consistent sidebar nav on the left, content on the right:

```
┌───────────────────────────────────────────┐
│  ← Back to Nexus                          │
│  ┌──────────┬────────────────────────────┐│
│  │ Settings │                            ││
│  │          │                            ││
│  │ 👤 Profile │    Content Area           ││
│  │ 🔔 Notifications│                      ││
│  │ 🎨 Appearance │                       ││
│  │ 🔒 Account  │                        ││
│  │          │                            ││
│  └──────────┴────────────────────────────┘│
└───────────────────────────────────────────┘
```

### 2. Preferences model — server-side persistence

Create a user preferences model in Prisma for settings that need to persist across devices:

```prisma
model UserPreference {
  userId               String   @id
  theme                String   @default("dark")     // "light", "dark", "system"
  dmNotifications      Boolean  @default(true)
  mentionNotifications Boolean  @default(true)
  channelNotifications Boolean  @default(false)
  pushEnabled          Boolean  @default(false)
  updatedAt            DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Why a separate model?**
- Preferences change independently of user identity (username, email)
- Avoids cluttering the User model with toggle fields
- Easier to extend with new preference types
- Cleaner migration path — add fields to this model instead of adding columns to `User`

### 3. Theme sync — optional server-side persistence

Desktop apps (Slack, Discord) sync theme preference across devices. For MVP:
- **Client-first:** Theme is stored in `localStorage` via `next-themes` (already works)
- **Server-sync optional:** When a user sets theme, optionally save to `UserPreference.theme`
- **On login:** Load preference from server; if exists, apply theme; otherwise use localStorage default

This avoids breaking the existing theme system while laying groundwork for cross-device sync.

### 4. Account settings — delegate danger zone to Supabase

For MVP, account management delegates to Supabase:
- **Change password** → Supabase Auth's built-in reset flow (`supabase.auth.updateUser({ password })`)
- **Change email** → Supabase Auth's email change flow
- **Delete account** → Requires admin intervention in Supabase Dashboard (deferred)
- **OAuth connections** → Managed via Supabase Auth (GitHub link/unlink — Phase 2)

### 5. No email notification preferences (MVP)

Do NOT implement for MVP:
- Email notification digests
- Daily/weekly summary emails
- Email-specific notification settings (already deferred in notifications plan)

---

## Data Flow

### Loading settings page

```
User navigates to /settings
  → Layout loads settings sidebar nav
  → Active page loads:
      → /settings/profile: GET /api/users/me
      → /settings/notifications: GET /api/notifications/preferences
      → /settings/appearance: Client-side theme (localStorage)
      → /settings/account: GET /api/users/me (for email display)
  → Content renders with current values
```

### Saving a preference

```
User toggles "Desktop Notifications" ON
  → PUT /api/notifications/preferences { pushEnabled: true }
  → Server validates + updates UserPreference
  → Returns updated preferences
  → Client updates cache
  → Bell icon behavior changes immediately
```

### Theme change flow

```
User clicks theme toggle (Appearance settings)
  → Client immediately applies theme via setTheme() (instant UX)
  → PUT /api/settings/appearance { theme: "light" } (async, no waiting)
  → Server saves to UserPreference.theme
  → On next login from another device:
      → GET /api/settings/appearance returns { theme: "light" }
      → Client calls setTheme("light")
      → Consistent theme across devices
```

---

## Implementation Steps

### Step 1: Database migration

- [ ] Create `UserPreference` model (see schema above)
- [ ] Run migration

### Step 2: Server — Settings API endpoints

#### Profile settings (`/api/users/me`)

- [ ] `GET /api/users/me` — Returns own profile (exists in `app.ts`, extend to return full profile)
- [ ] `PATCH /api/users/me` — Update profile fields
  - Body: `{ username?, displayName?, bio? }`
  - Validate: username uniqueness, length constraints
  - Return: updated user profile

#### Notification preferences (`/api/notifications/preferences`)

- [ ] `GET /api/notifications/preferences` — Get preferences
  - Returns default preferences if none saved yet
  - Response: `{ dmNotifications, mentionNotifications, channelNotifications, pushEnabled }`
  - Return: 200 with preferences object

- [ ] `PUT /api/notifications/preferences` — Update preferences
  - Body: `{ dmNotifications?, mentionNotifications?, channelNotifications?, pushEnabled? }`
  - Partial update (only send fields that changed)
  - Upsert logic (create on first save, update thereafter)
  - Return: updated preferences

#### Appearance settings (`/api/settings/appearance`)

- [ ] `GET /api/settings/appearance` — Get theme preference
  - Response: `{ theme: "dark" | "light" | "system" }`
  - Returns default if none saved

- [ ] `PUT /api/settings/appearance` — Update theme preference
  - Body: `{ theme: "dark" | "light" | "system" }`
  - Validate: allowed values
  - Return: updated preference

#### Account settings

- [ ] `POST /api/settings/account/change-password` — Change password
  - Body: `{ currentPassword, newPassword }`
  - Delegates to Supabase Auth (`supabase.auth.updateUser({ password })`)
  - Note: Requires user to be recently logged in (Supabase session)

- [ ] `POST /api/settings/account/change-email` — Change email
  - Body: `{ newEmail, password }`
  - Delegates to Supabase Auth

### Step 3: Server — Service layer

- [ ] Create `server/src/modules/settings/settings.service.ts`
  - `getPreferences(userId)` — get or create default preferences
  - `updatePreferences(userId, data)` — upsert preferences
  - `getAppearance(userId)` — get theme preference
  - `updateAppearance(userId, theme)` — update theme

- [ ] Create `server/src/modules/settings/settings.controller.ts`
  - Route handlers for all settings endpoints

- [ ] Create `server/src/modules/settings/settings.routes.ts`
  - Register all settings routes under `/api/settings`

- [ ] Create `server/src/modules/settings/settings.schema.ts`
  - Validation schemas for all request bodies

- [ ] Create `server/src/modules/settings/settings.types.ts`
  - TypeScript interfaces for settings

### Step 4: Client — Settings layout

- [ ] Create `client/src/app/(protected)/settings/layout.tsx`
  - Nested layout with sidebar navigation
  - Sidebar links:
    - Profile (`/settings/profile`)
    - Notifications (`/settings/notifications`)
    - Appearance (`/settings/appearance`)
    - Account (`/settings/account`)
  - Active link highlighting based on pathname
  - Back button → navigate to previous page or `/conversations`
  - Mobile: collapsible sidebar, bottom tabs instead of sidebar

- [ ] Create `client/src/app/(protected)/settings/profile/page.tsx`
  - **New** route (doesn't exist)
  - Form fields: username, display name, bio
  - Avatar upload section (links to user-profiles.md plan)
  - Save button with loading state
  - Cancel/discard changes

- [ ] Extend `client/src/app/(protected)/settings/notifications/page.tsx`
  - Already exists — wire up to real API endpoints
  - Add loading states for when API is pending
  - Add error states for API failures

- [ ] Create `client/src/app/(protected)/settings/appearance/page.tsx`
  - **New** route
  - Theme selector: Dark / Light / System (radio cards with preview)
  - Message density toggle (Comfortable / Compact)

- [ ] Create `client/src/app/(protected)/settings/account/page.tsx`
  - **New** route
  - Email display (read-only)
  - "Change password" button → opens Supabase reset flow
  - "Connected accounts" section (GitHub OAuth status)
  - "Danger Zone" section (delete account — deferred, shows contact support message)

### Step 5: Client — API client & hooks

- [ ] Create `client/src/modules/settings/api/settings.api.ts`
  - `getPreferences()` → GET `/api/notifications/preferences`
  - `updatePreferences(data)` → PUT `/api/notifications/preferences`
  - `getAppearance()` → GET `/api/settings/appearance`
  - `updateAppearance(theme)` → PUT `/api/settings/appearance`

- [ ] Create `client/src/modules/settings/hooks/useSettings.ts`
  - `useNotificationPreferences()` — existing, extend to use real API
  - `useUpdateNotificationPreferences()` — mutation with cache update
  - `useAppearance()` — theme preference query
  - `useUpdateAppearance()` — theme preference mutation

### Step 6: Client — Settings components

- [ ] Create `client/src/modules/settings/components/SettingsLayout.tsx`
  - Sidebar nav with icon + label for each section
  - Responsive: sidebar on desktop, bottom tabs on mobile
  - Breadcrumb / back nav

- [ ] Create `client/src/modules/settings/components/ProfileForm.tsx`
  - Form fields: username (with validation), display name, bio
  - Avatar upload area
  - Save / Cancel buttons

- [ ] Create `client/src/modules/settings/components/NotificationToggles.tsx`
  - Existing toggles in notification settings page — extract to reusable component
  - Accepts: preferences object, update function, loading state

- [ ] Create `client/src/modules/settings/components/ThemeSelector.tsx`
  - Three radio cards: Dark, Light, System
  - Preview thumbnail for each theme
  - Visual feedback on selection

### Step 7: Navigation integration

- [ ] Add "Settings" link to sidebar user profile dropdown
  - Currently: username + logout
  - New: username → /settings/profile, logout button, settings gear icon

- [ ] Add settings gear icon to header bar (optional, Phase 2)

- [ ] Register settings routes in `client/src/config/url.ts`
  - `APP_ROUTES.SETTINGS.PROFILE = '/settings/profile'`
  - `APP_ROUTES.SETTINGS.APPEARANCE = '/settings/appearance'`
  - `APP_ROUTES.SETTINGS.ACCOUNT = '/settings/account'`

### Step 8: Theme sync (optional enhancement)

- [ ] On login: fetch theme preference from server
  - If user has a saved theme preference → apply it
  - Otherwise → use localStorage default
  
- [ ] On theme change via appearance settings:
  - Apply locally (instant)
  - Fire-and-forget PUT to server (async, non-blocking)
  - On failure: revert locally and show error toast

---

## File Changes Summary

### Server

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `UserPreference` model |
| `server/src/modules/settings/settings.service.ts` | **New** — settings logic |
| `server/src/modules/settings/settings.controller.ts` | **New** — route handlers |
| `server/src/modules/settings/settings.routes.ts` | **New** — route registration |
| `server/src/modules/settings/settings.schema.ts` | **New** — validation schemas |
| `server/src/modules/settings/settings.types.ts` | **New** — types |
| `server/src/modules/notifications/notifications.service.ts` | Add preferences CRUD |
| `server/src/modules/notifications/notifications.controller.ts` | Add preferences endpoints |
| `server/src/app.ts` | Register settings routes |

### Client

| File | Change |
|---|---|
| `client/src/app/(protected)/settings/layout.tsx` | **New** — settings layout with sidebar nav |
| `client/src/app/(protected)/settings/profile/page.tsx` | **New** — profile settings page |
| `client/src/app/(protected)/settings/appearance/page.tsx` | **New** — appearance settings page |
| `client/src/app/(protected)/settings/account/page.tsx` | **New** — account settings page |
| `client/src/app/(protected)/settings/notifications/page.tsx` | Wire to real API endpoints |
| `client/src/modules/settings/api/settings.api.ts` | **New** — API client |
| `client/src/modules/settings/hooks/useSettings.ts` | **New** — settings hooks |
| `client/src/modules/settings/components/SettingsLayout.tsx` | **New** — layout component |
| `client/src/modules/settings/components/ProfileForm.tsx` | **New** — profile form |
| `client/src/modules/settings/components/NotificationToggles.tsx` | **New** — extracted toggle component |
| `client/src/modules/settings/components/ThemeSelector.tsx` | **New** — theme selector |
| `client/src/modules/settings/types/settings.ts` | **New** — TypeScript types |
| `client/src/modules/conversations/components/Sidebar.tsx` | Add settings link to user profile section |
| `client/src/config/url.ts` | Add settings routes |

---

## Settings Navigation Structure

```
Settings (nested layout)
├── Profile          /settings/profile
│   ├── Avatar upload
│   ├── Username (editable)
│   ├── Display name (editable)
│   ├── Bio (editable)
│   └── Save button
│
├── Notifications    /settings/notifications
│   ├── Desktop notifications toggle
│   ├── Direct messages toggle
│   ├── Mentions toggle
│   └── Channel messages toggle
│
├── Appearance       /settings/appearance
│   ├── Theme: Dark / Light / System
│   ├── Message density: Comfortable / Compact
│   └── (Future: sidebar width, font size)
│
└── Account          /settings/account
    ├── Email (read-only)
    ├── Change password button
    ├── Connected accounts (GitHub)
    └── Danger zone (delete account — contact support)
```

---

## UI Mockup (text)

### Settings Layout (Desktop)

```
┌──────────────────────────────────────────────────┐
│  ← Back                                          │
│  ┌──────────┬───────────────────────────────────┐│
│  │ Settings  │  Profile                          ││
│  │           │                                   ││
│  │ 👤 Profile │  [   Avatar (clickable)   ]      ││
│  │ 🔔 Notif. │                                   ││
│  │ 🎨 Appear.│  Username: [___________]          ││
│  │ 🔒 Account│  Display name: [___________]      ││
│  │           │  Bio: [___________________]        ││
│  │           │  [____________________________]    ││
│  │           │                                   ││
│  │           │  [      Save Changes      ]        ││
│  └──────────┴───────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### Settings Layout (Mobile)

```
┌──────────────────────┐
│  ← Settings          │
│                       │
│  Profile              │
│                       │
│  [   Avatar    ]      │
│                       │
│  Username             │
│  [___________]        │
│                       │
│  Display name         │
│  [___________]        │
│                       │
│  Bio                  │
│  [___________]        │
│  [___________]        │
│                       │
│  [  Save Changes  ]   │
│                       │
│  ─────────────────── │
│  👤  🔔  🎨  🔒    │
│  (bottom nav tabs)    │
└──────────────────────┘
```

---

## Future Considerations

| Feature | Phase | Complexity |
|---|---|---|
| Keyboard shortcuts view | Phase 2 | Low |
| Language / locale selector | Phase 2 | Medium |
| Accessibility settings (reduced motion, font size) | Phase 2 | Low |
| Notification schedule / quiet hours | Phase 2 | Medium |
| Notification per-channel overrides | Phase 3 | High |
| Import/export settings | Phase 3 | Low |
| Admin settings panel (workspace-wide) | Phase 3 | High |
| Two-factor auth setup | Phase 3 | Medium |
| Session management (active sessions, force logout) | Phase 3 | Medium |
| Email notification preferences | Phase 3 | Low |
