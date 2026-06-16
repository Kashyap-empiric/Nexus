# Global Loading, Error Pages & Onboarding Flow — Implementation Plan

> **Status:** Draft Plan
> **Last Updated:** 2026-06-16
> **Covers:** Global `loading.tsx` · Global `error.tsx` · Onboarding wizard for new users
> **Prerequisites:** Auth module complete. Workspace module complete (CRUD, channels). Profiles module complete.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Architecture Decisions](#2-architecture-decisions)
3. [Global Loading Pages](#3-global-loading-pages)
4. [Global Error Pages](#4-global-error-pages)
5. [Onboarding Flow](#5-onboarding-flow)
6. [Implementation Order](#6-implementation-order)
7. [File Changes Summary](#7-file-changes-summary)
8. [Edge Cases & Risks](#8-edge-cases--risks)

---

## 1. Current State Assessment

### What Exists Today

| Asset | Location | Status |
|---|---|---|
| Root layout | `client/src/app/layout.tsx` | ✅ Root providers + HTML shell |
| `(auth)` layout | `client/src/app/(auth)/layout.tsx` | ✅ Auth sidebar + form area |
| `(protected)` layout | `client/src/app/(protected)/layout.tsx` | ✅ SocketProvider + AppLayoutShell |
| `not-found.tsx` | `client/src/app/not-found.tsx` | ✅ 404 page (styled with brand colors) |
| AuthGate loading state | `client/src/shared/providers/AuthGate.tsx` | ✅ Inline spinner + "Authenticating..." text |
| EmptyStateSkeleton | `client/src/modules/conversations/components/EmptyStateSkeleton.tsx` | ✅ Basic skeleton for empty state |
| `AppLayoutShell` | `client/src/shared/components/layout/AppLayoutShell.tsx` | ✅ Main app shell with header, sidebar, modals |

### What's Missing

| Asset | Impact |
|---|---|
| **No `loading.tsx` anywhere** | Users see blank screens or flash of unstyled content during page transitions |
| **No `error.tsx` anywhere** | Runtime errors cause white screens or unhandled React error boundaries |
| **No onboarding flow** | New users land on empty `/conversations` with no guidance — no workspace creation prompt, no profile setup |
| **No global error boundary** | Uncaught errors bubble up to React's default error overlay (dev) or blank page (prod) |
| **No suspended loading states** | `Suspense` is only used in `login/page.tsx` wrapping `LoginForm` — nowhere else |

### Key Observations

1. **AuthGate already handles initialization loading** — spinner + "Authenticating..." on first load. This is a good starting point but lives in a client component, not a Next.js `loading.tsx`.

2. **No route-based loading boundaries** — Next.js supports `loading.tsx` at every route segment level, but none are used. This means all pages must manage their own loading state via `isLoading` checks.

3. **Error states are handled inline** — Every page/component has its own `if (error)` or `if (isError)` handling. There's no centralized error boundary.

4. **After registration, user lands on `/conversations`** — The `auth-provider.tsx` redirects `SIGNED_IN` → `/conversations`. For brand new users with no conversations, workspaces, or profile data, this is a dead end.

5. **Server-side onboarding exists** — `onboardUserToWorkspaceInTransaction` already handles adding a user to a workspace's `#general` channel. This needs a client-facing onboarding flow to call it.

---

## 2. Architecture Decisions

### 2.1 Route Segment Design

Next.js supports `loading.tsx` and `error.tsx` at every route segment level. The hierarchy is:

```
app/
├── loading.tsx          ← Root loading (full-screen, shown during initial load)
├── error.tsx            ← Root error boundary (catches unhandled errors)
├── not-found.tsx         ← 404 page (existing)
│
├── (auth)/
│   ├── layout.tsx        ← Auth layout (existing)
│   ├── loading.tsx       ← Auth loading (minimal, shown during auth page transitions)
│   └── error.tsx         ← Auth error boundary
│
├── (protected)/
│   ├── layout.tsx        ← Protected layout with AppLayoutShell (existing)
│   ├── loading.tsx       ← Protected loading (shown inside AppLayoutShell)
│   └── error.tsx         ← Protected error boundary (shown inside AppLayoutShell)
│
└── (protected)/
    └── settings/
        ├── loading.tsx   ← Settings-specific loading skeleton
        └── error.tsx     ← Settings-specific error boundary
```

**Key decision: Place `loading.tsx` and `error.tsx` at the route group level** — this provides the best balance of coverage vs. granularity. Individual page-level loading/error files can be added later if needed.

### 2.2 Loading UX Strategy

| Level | Component | Behavior |
|---|---|---|
| **Root (`app/`)** | Full-screen Nexus logo + "Loading..." | Shown during initial JS bundle evaluation, font loading, etc. |
| **Auth (`(auth)/`)** | Minimal skeleton (sidebar + form placeholder) | Shown during auth page transitions (login → register) |
| **Protected (`(protected)/`)** | AppLayoutShell-compatible skeleton | Shown inside the shell (sidebar + content area skeleton) |
| **Settings** | Settings page skeleton | Shown during settings page loads |

### 2.3 Error UX Strategy

| Level | Component | Behavior |
|---|---|---|
| **Root (`app/`)** | Full-screen error with "Try Again" button | Catches errors that break the entire app (critical JS errors) |
| **Auth (`(auth)/`)** | Auth-styled error card | Catches login/register/forgot-password errors |
| **Protected (`(protected)/`)** | In-app error card with retry + "Go Home" | Catches errors in the main app area (sidebar still visible) |
| **Settings** | Settings-specific error card | Catches settings page errors |

### 2.4 Onboarding Entry Points

| Trigger | Action |
|---|---|
| **User registers for the first time** | After auth callback → redirect to `/onboarding` |
| **User has no workspaces** | Show workspace creation prompt in the empty state OR redirect to onboarding |
| **User clicks "Skip" on onboarding** | Redirect to `/conversations` (can access onboarding later from settings) |

**Detection strategy:** Check if the user has zero workspaces and zero DMs. If both are empty, they're a brand new user. If they have workspaces but no profile data (no `fullName`, no `bio`), show profile completion prompts.

### 2.5 Onboarding as a Step Wizard

Break onboarding into steps so users can complete them at their own pace:

```
Step 1: Set up your profile    (username, full name, bio, avatar)
Step 2: Create a workspace     (name, slug — or skip to join via invite)
Step 3: Invite teammates       (email-based multi-invite)
Step 4: Done! 🎉               (redirect to workspace + celebration)
```

**Route:** `/onboarding` — placed at the app root level (not inside `(protected)` or `(auth)`) so it's accessible after auth but before the full app shell.

```diff
 app/
+├── onboarding/
+│   ├── page.tsx              ← Onboarding wizard page (client component)
+│   ├── layout.tsx            ← Minimal layout (no sidebar, just header with progress)
+│   ├── loading.tsx           ← Loading state for onboarding
+│   └── error.tsx             ← Error boundary for onboarding
```

---

## 3. Global Loading Pages

### 3.1 Root Loading (`app/loading.tsx`)

```tsx
// app/loading.tsx
// Full-screen centered loading state
// Shown during initial JS evaluation, font loading, etc.

export default function RootLoading() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4">
      {/* Animated Nexus logo */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center shadow-lg">
          <MessageSquare className="h-8 w-8 text-brand-foreground" />
        </div>
        {/* Pulse ring animation */}
        <div className="absolute -inset-2 rounded-2xl bg-brand/20 animate-ping" />
      </div>
      
      {/* Loading text with dots animation */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-sm font-medium">Loading Nexus</span>
        <span className="animate-bounce delay-0">.</span>
        <span className="animate-bounce delay-150">.</span>
        <span className="animate-bounce delay-300">.</span>
      </div>
    </div>
  );
}
```

**Key details:**
- Uses `MessageSquare` icon from `lucide-react` (same as existing Nexus logo in `MobileAuthHeader`)
- Animated ping ring for visual polish
- Bouncing dots for loading progress indication
- Dark/light mode compatible via CSS variables

### 3.2 Auth Loading (`app/(auth)/loading.tsx`)

```tsx
// app/(auth)/loading.tsx
// Minimal skeleton matching the auth layout structure

export default function AuthLoading() {
  return (
    <div className="flex min-h-dvh bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Auth sidebar skeleton */}
      <div className="hidden lg:flex w-[480px] bg-zinc-900 flex-col justify-between p-12">
        <div className="space-y-6">
          <div className="w-10 h-10 rounded-lg bg-zinc-700 animate-pulse" />
          <div className="space-y-3">
            <div className="h-8 w-48 bg-zinc-700 animate-pulse rounded" />
            <div className="h-4 w-64 bg-zinc-800 animate-pulse rounded" />
          </div>
        </div>
        <div className="h-4 w-36 bg-zinc-800 animate-pulse rounded" />
      </div>

      {/* Form area skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[400px] space-y-6 animate-in fade-in">
          {/* Card skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
              <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
              <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3.3 Protected Loading (`app/(protected)/loading.tsx`)

This is the most important loading page — it renders inside the `AppLayoutShell` structure so users see a meaningful skeleton instead of a flash of nothing.

```tsx
// app/(protected)/loading.tsx
// Loading state shown inside AppLayoutShell

export default function ProtectedLoading() {
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Content area skeleton */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-border/50 border-t-brand animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading content...</p>
        </div>
      </div>
    </div>
  );
}
```

### 3.4 Settings Loading (`app/(protected)/settings/loading.tsx`)

```tsx
// app/(protected)/settings/loading.tsx
// Settings-page-specific skeleton

export default function SettingsLoading() {
  return (
    <div className="flex-1 flex h-full">
      {/* Settings sidebar skeleton */}
      <aside className="w-64 border-r p-4 space-y-2 hidden md:block">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 bg-muted animate-pulse rounded-md" />
        ))}
      </aside>

      {/* Settings content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
          <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
          <div className="h-32 w-full bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Global Error Pages

### 4.1 Root Error (`app/error.tsx`)

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error('Root error:', error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-destructive/20 rounded-full animate-pulse blur-xl" />
          <AlertTriangle className="w-12 h-12 text-destructive relative z-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/50 font-mono mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium shadow transition-colors gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
```

### 4.2 Auth Error (`app/(auth)/error.tsx`)

```tsx
// app/(auth)/error.tsx
'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { APP_ROUTES } from '@/config/url';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full bg-card border rounded-xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Authentication Error</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An error occurred during authentication.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={reset}
            className="w-full h-9 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href={APP_ROUTES.AUTH.LOGIN}
            className="w-full h-9 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors inline-flex items-center justify-center"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 4.3 Protected Error (`app/(protected)/error.tsx`)

```tsx
// app/(protected)/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { APP_ROUTES } from '@/config/url';

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Protected route error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We encountered an error loading this page. Please try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-9 px-5 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium transition-colors gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href={APP_ROUTES.CONVERSATIONS.INDEX}
            className="inline-flex items-center justify-center h-9 px-5 rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 4.4 Settings Error (`app/(protected)/settings/error.tsx`)

```tsx
// app/(protected)/settings/error.tsx
'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">Settings Error</h3>
          <p className="text-sm text-muted-foreground">
            Failed to load settings. Please try again.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-9 px-5 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium transition-colors gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
```

### 4.5 Onboarding Error (`app/onboarding/error.tsx`)

Similar in style to the auth error but with onboarding-specific messaging.

---

## 5. Onboarding Flow

### 5.1 Architecture

**Route:** `/onboarding` — standalone layout, no sidebar or navigation rail.

**Layout:**

```tsx
// app/onboarding/layout.tsx
// Minimal layout — just progress bar + content

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top bar with branding */}
      <div className="h-14 border-b flex items-center px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-brand-foreground" />
          </div>
          <span className="font-bold text-lg">Nexus</span>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </div>
    </div>
  );
}
```

**State Management:**

Use a zustand store (`client/src/modules/onboarding/store/onboardingStore.ts`):

```typescript
interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  
  // Step 1: Profile
  username: string;
  fullName: string;
  bio: string;
  avatarFile: File | null;
  
  // Step 2: Workspace
  workspaceName: string;
  workspaceSlug: string;
  skipWorkspace: boolean;
  
  // Step 3: Invites
  invitedUsers: Array<{ id: string; email: string; username: string }>;
  
  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetOnboarding: () => void;
  // ... individual field setters
}
```

### 5.2 Step Components

#### Step 1: Set Up Your Profile

```
┌──────────────────────────────────┐
│  Welcome to Nexus! 👋            │
│  Let's get your profile set up.  │
│                                  │
│  ┌──────────────────────────────┐│
│  │     [Avatar Upload Circle]   ││
│  │         (click to add)       ││
│  └──────────────────────────────┘│
│                                  │
│  Display Name                    │
│  ┌──────────────────────────────┐│
│  │  e.g. Jane Doe               ││
│  └──────────────────────────────┘│
│                                  │
│  Username                        │
│  ┌──────────────────────────────┐│
│  │  @jane_doe                   ││
│  └──────────────────────────────┘│
│                                  │
│  Bio (optional)                  │
│  ┌──────────────────────────────┐│
│  │  Tell us about yourself...   ││
│  └──────────────────────────────┘│
│                                  │
│  [Continue]         [Skip →]     │
└──────────────────────────────────┘
```

**Component:** `SetupProfileStep.tsx`
- Avatar upload (reuses `uploadAvatar` from `@/shared/lib/upload.ts`)
- Username input (with availability check / debounced validation)
- Full name input
- Bio textarea (optional)
- "Continue" and "Skip" buttons

#### Step 2: Create or Join a Workspace

```
┌──────────────────────────────────┐
│  Create Your Workspace           │
│                                  │
│  A workspace is where you and    │
│  your team collaborate.          │
│                                  │
│  ┌──────────────────────────────┐│
│  │ ○ Create a new workspace    ││
│  │   (recommended)              ││
│  ├──────────────────────────────┤│
│  │ ○ Join an existing one      ││
│  │   (enter invite code)        ││
│  └──────────────────────────────┘│
│                                  │
│  (if "Create" selected:)         │
│  Workspace Name                  │
│  ┌──────────────────────────────┐│
│  │  e.g. Acme Corp              ││
│  └──────────────────────────────┘│
│                                  │
│  Workspace URL                   │
│  ┌──────────────────────────────┐│
│  │  nexus.app/acme-corp         ││
│  └──────────────────────────────┘│
│                                  │
│  [Continue]  [Skip →]            │
└──────────────────────────────────┘
```

**Component:** `CreateWorkspaceStep.tsx`
- Radio selection: create new or join existing
- Workspace name → auto-generates slug
- Slug input (editable, validates uniqueness)
- "Skip" creates a default personal workspace or skips entirely

**Server Integration:**
- Creates workspace via `POST /api/workspaces`
- Creates default `#general` channel
- Adds creator as `OWNER`
- Uses `onboardUserToWorkspaceInTransaction` pattern

#### Step 3: Invite Teammates (Optional)

```
┌──────────────────────────────────┐
│  Invite Your Teammates           │
│                                  │
│  Add people by email to start    │
│  collaborating right away.       │
│                                  │
│  ┌──────────────────────────────┐│
│  │ [john@acme.com ×]           ││
│  │ [jane@co.com ×]             ││
│  │ [type email to search... 🔍] ││
│  └──────────────────────────────┘│
│                                  │
│  ┌──────────────────────────────┐│
│  │ 📧 jane@company.com — Jane  ││
│  │ 📧 john@acme.com — John Doe ││
│  └──────────────────────────────┘│
│                                  │
│  [Invite & Continue] [Skip]      │
└──────────────────────────────────┘
```

**Component:** `InviteTeammatesStep.tsx`
- Email-based multi-user search (reuses existing `searchUsers` API)
- Chip/tag input (same as proposed for invite modal)
- Batch invite via `POST /workspaces/:id/invite-multiple`
- Progress indication for each invite

#### Step 4: Done! 🎉

```
┌──────────────────────────────────┐
│  🎉 You're All Set!              │
│                                  │
│  ┌──────────────────────────────┐│
│  │  ✓ Profile created           ││
│  │  ✓ Workspace ready           ││
│  │  ✓ Invites sent              ││
│  └──────────────────────────────┘│
│                                  │
│  What would you like to do?      │
│                                  │
│  [Start chatting in #general]   │
│  [Explore settings]              │
│  [Take a tour ✨]                │
└──────────────────────────────────┘
```

**Component:** `OnboardingCompleteStep.tsx`
- Summary of what was set up
- "Start chatting" → redirects to workspace's `#general` channel
- "Explore settings" → opens settings modal
- "Take a tour" → highlights key UI elements (navigation rail, sidebar, etc.)

### 5.3 Progress Bar

A horizontal progress indicator at the top of the onboarding layout:

```tsx
// Components: StepProgress.tsx
interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ label: string; icon: React.ReactNode }>;
}
```

Renders as:
```
    ● ─── ● ─── ○ ─── ○
  Profile  Workspace  Invite  Done
```

### 5.4 Onboarding Detection & Redirection

Modify `AuthGate.tsx` or create a new component to detect new users after login:

```typescript
// In AuthGate.tsx or a new OnboardingGate.tsx
// After auth is initialized + user is logged in:

useEffect(() => {
  if (isInitialized && user) {
    if (shouldShowOnboarding()) {
      router.push('/onboarding');
    }
  }
}, [isInitialized, user]);

function shouldShowOnboarding(): boolean {
  // Check if the user has completed onboarding
  const onboardingCompleted = localStorage.getItem('nexus_onboarding_completed');
  if (onboardingCompleted === 'true') return false;
  
  // Check if user has any workspaces
  const hasWorkspaces = workspaces.length > 0;
  
  // Check if user has a fullName set (proxy for "has completed profile")
  const hasProfile = !!user.user_metadata?.fullName;
  
  return !hasWorkspaces && !hasProfile;
}
```

**Detection strategies (choose one):**

| Strategy | Pros | Cons |
|---|---|---|
| **Local storage flag** | Simple, fast, no API call | User can clear storage; no server-side record |
| **Server-side `onboardingCompleted` field** | Persistent, reliable | Requires DB migration; extra API call on load |
| **Heuristic (no workspaces + no profile)** | No new fields needed | Could trigger for returning users who skipped profile setup |
| **Query `GET /api/me` on auth** | Only one API call | Slightly longer initial load |

**Recommended:** Heuristic approach — check `workspaces.length === 0` and `!currentUserProfile.fullName`. This avoids DB schema changes and accurately detects new users. Store a `nexus_onboarding_completed` localStorage flag as a quick cache so returning users don't re-trigger.

### 5.5 Onboarding Module Structure

```
client/src/modules/onboarding/
├── index.ts                               ← Public exports
├── components/
│   ├── OnboardingWizard.tsx                ← Main wizard orchestrator (step management)
│   ├── SetupProfileStep.tsx                ← Step 1: Profile setup
│   ├── CreateWorkspaceStep.tsx             ← Step 2: Workspace creation
│   ├── InviteTeammatesStep.tsx             ← Step 3: Invite teammates
│   ├── OnboardingCompleteStep.tsx          ← Step 4: Completion + celebration
│   ├── StepProgress.tsx                   ← Progress indicator bar
│   ├── OnboardingSkeleton.tsx             ← Loading state for onboarding
│   └── UserSearchInput.tsx                ← Reusable email/username multi-select input
├── store/
│   └── onboardingStore.ts                 ← Zustand store for wizard state
├── hooks/
│   ├── useOnboarding.ts                   ← Main wizard hook
│   └── useShouldOnboard.ts                ← Detection hook
└── types/
    └── onboarding.ts                      ← TypeScript types
```

### 5.6 Data Flow

```
User registers → auth callback → AuthGate detects new user
  → redirect to /onboarding

Step 1: SetupProfileStep
  → PATCH /api/users/me { fullName, bio }
  → uploadAvatar() to Supabase Storage
  → Next step

Step 2: CreateWorkspaceStep  
  → POST /api/workspaces { name, slug }
  → Server creates workspace + #general channel + owner membership
  → Server emits workspace:new socket event
  → Client stores workspace ID for Step 3
  → Next step (or skip → no workspace created)

Step 3: InviteTeammatesStep
  → POST /api/workspaces/:id/invite-multiple { userIds: [...] }
  → Server creates invites + notifications
  → Next step (or skip)

Step 4: OnboardingCompleteStep
  → localStorage.setItem('nexus_onboarding_completed', 'true')
  → Redirect to workspace #general channel

IF user clicks "Skip" at any step:
  → Store partial progress
  → Redirect to /conversations
  → Show prompt at top: "Complete your profile in Settings → Profile"
```

---

## 6. Implementation Order

| Step | Feature | Dependencies | Est. Files Changed |
|---|---|---|---|
| 1 | Root `loading.tsx` | None | 1 new file |
| 2 | Root `error.tsx` | None | 1 new file |
| 3 | Auth `loading.tsx` + `error.tsx` | None | 2 new files |
| 4 | Protected `loading.tsx` + `error.tsx` | None | 2 new files |
| 5 | Settings `loading.tsx` + `error.tsx` | None | 2 new files |
| 6 | Onboarding store + types | None | 2 new files |
| 7 | Step components (Profile) | Step 6 | 2 new files |
| 8 | Step components (Workspace) | Step 6 | 1 new file |
| 9 | Step components (Invite) | Step 6 | 1 new file |
| 10 | Step components (Complete) | Step 6 | 1 new file |
| 11 | Onboarding wizard + layout | Steps 7-10 | 3 new files (layout, page, wizard) |
| 12 | Onboarding detection + redirect | Step 11 | Modify `AuthGate.tsx` |
| 13 | `UserSearchInput` reusable component | None | 1 new file |
| 14 | Testing & review | All above | — |

---

## 7. File Changes Summary

### New Files

| File | Description |
|---|---|
| `app/loading.tsx` | Root loading — full-screen Nexus logo + animation |
| `app/error.tsx` | Root error boundary — "Something went wrong" + Try Again |
| `app/(auth)/loading.tsx` | Auth loading — sidebar + form skeleton |
| `app/(auth)/error.tsx` | Auth error — card with Try Again + Back to Login |
| `app/(protected)/loading.tsx` | Protected loading — spinner inside AppLayoutShell |
| `app/(protected)/error.tsx` | Protected error — card with Try Again + Go Home |
| `app/(protected)/settings/loading.tsx` | Settings loading — sidebar + content skeleton |
| `app/(protected)/settings/error.tsx` | Settings error — simple retry card |
| `app/onboarding/layout.tsx` | Onboarding layout — minimal top bar + content |
| `app/onboarding/page.tsx` | Onboarding page — renders OnboardingWizard |
| `app/onboarding/loading.tsx` | Onboarding loading |
| `app/onboarding/error.tsx` | Onboarding error |
| `modules/onboarding/index.ts` | Onboarding module exports |
| `modules/onboarding/store/onboardingStore.ts` | Zustand store for wizard state |
| `modules/onboarding/types/onboarding.ts` | TypeScript types |
| `modules/onboarding/hooks/useOnboarding.ts` | Main wizard hook |
| `modules/onboarding/hooks/useShouldOnboard.ts` | Detection hook |
| `modules/onboarding/components/OnboardingWizard.tsx` | Step orchestrator |
| `modules/onboarding/components/SetupProfileStep.tsx` | Step 1 |
| `modules/onboarding/components/CreateWorkspaceStep.tsx` | Step 2 |
| `modules/onboarding/components/InviteTeammatesStep.tsx` | Step 3 |
| `modules/onboarding/components/OnboardingCompleteStep.tsx` | Step 4 |
| `modules/onboarding/components/StepProgress.tsx` | Progress bar |
| `modules/onboarding/components/OnboardingSkeleton.tsx` | Loading skeleton |
| `modules/onboarding/components/UserSearchInput.tsx` | Reusable multi-user search input |

### Modified Files

| File | Change |
|---|---|
| `app/layout.tsx` | Add `<Suspense>` wrapper around children for streaming |
| `app/(protected)/layout.tsx` | Optional: Add `<Suspense>` for modal loading |
| `shared/providers/AuthGate.tsx` | Add onboarding detection + redirect logic |
| `modules/auth/lib/auth-orchestrator.ts` | Optional: Reset onboarding flag on sign out |

---

## 8. Edge Cases & Risks

### Edge Cases

| Scenario | Handling |
|---|---|
| **User refreshes on onboarding step 3** | Store current step in localStorage so they return to the same step |
| **User navigates away from onboarding** | Warn via `beforeunload` event (if they have unsaved profile changes) |
| **User has workspaces but no profile data** | Show inline banner in settings: "Complete your profile" — don't force onboarding |
| **User registers via invite link** | After auth callback, process invite FIRST, then show onboarding (or skip if workspace context is set) |
| **Supabase OAuth callback during onboarding** | AuthGate already handles `handleInviteContinuation` — ensure onboarding doesn't conflict |
| **Upload avatar fails** | Show error toast, allow retry, don't block step progression |
| **Workspace name already taken** | Show inline validation error with suggestions |
| **User has no workspaces but has DMs** | They're not a "new" user — skip onboarding entirely |
| **Browser back button during onboarding** | Call `prevStep()` — don't navigate away |

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Onboarding detection false positives** (returning user shown onboarding) | Medium | Use localStorage flag + heuristic check. Add server-side `onboardingCompleted` field if needed later |
| **OAuth flow redirects to onboarding** (conflict with auth callback) | Medium | Check for invite tokens and query params BEFORE redirecting to onboarding. Process invite first. |
| **Onboarding step 2 workspace creation fails** | Low | Show error toast, allow retry, allow skip |
| **Onboarding adds extra API calls on every load** | Low | Cache detection result in localStorage; only re-check on login |

---

## Appendix: Design Guidelines

### Loading States — Visual Principles

1. **Never show a blank screen** — Always show a skeleton or spinner within 200ms
2. **Match the layout** — Loading skeletons should mirror the final layout structure (same dimensions, same alignment)
3. **Use CSS animations** — `animate-pulse` (opacity fade) or `animate-spin` (rotating circles) — consistent with existing codebase
4. **Don't over-animate** — One animated element per loading state is enough
5. **Respect reduced motion** — Use `prefers-reduced-motion: reduce` media query

### Error Pages — Visual Principles

1. **Clear, human-readable message** — No technical jargon
2. **Actionable** — Always provide a "Try Again" or navigation option
3. **On-brand** — Use brand colors, consistent with existing `not-found.tsx`
4. **Error ID for support** — Include `error.digest` for production debugging
5. **Log to console** — Always `console.error` the error for debugging

### Onboarding — Visual Principles

1. **Progress visibility** — Always show where the user is and how many steps remain
2. **No dead ends** — Every step has a "Skip" option
3. **Celebrate completion** — Step 4 should feel rewarding
4. **Mobile-first** — Works on small screens (single column, full-width inputs)
5. **Keyboard navigable** — Tab through inputs, Enter to continue
