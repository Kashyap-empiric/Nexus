# Nexus Brand Identity — Emerald Theme Refactoring

> Date: June 16, 2026
> Context: Implementation of a cohesive Nexus brand identity built around emerald accents while keeping the interface primarily neutral and productivity-focused.

---

## Design Principles

### Core Philosophy

The UI should feel:

- Professional
- Modern
- Collaborative
- Clean
- Productive
- Developer-friendly

### Ratio

- **~95% neutral** (grayscale)
- **~5% emerald accents** (brand draws attention, doesn't dominate)

### Avoid

- Loud or overly saturated colors
- Gaming-style aesthetics
- Rainbow/multi-accent systems
- Excessive gradients
- Overusing emerald throughout the interface

---

## Brand Color System

Dedicated brand tokens were introduced **without overloading** the existing `--primary` semantic token. The `--primary` token remains achromatic (black/white in light/dark mode).

### Token Set

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--brand` | `oklch(0.63 0.16 160)` | `oklch(0.72 0.15 160)` | Primary brand color |
| `--brand-foreground` | `oklch(1 0 0)` (white) | `oklch(0.15 0 0)` (near-black) | Text on brand bg |
| `--brand-muted` | `oklch(0.94 0.03 160)` | `oklch(0.28 0.04 160)` | Subtle brand bg |
| `--brand-subtle` | `oklch(0.97 0.015 160)` | `oklch(0.24 0.02 160)` | Very subtle brand bg |

### Tailwind v4 Mapping (`@theme inline`)

```
--color-brand: var(--brand)
--color-brand-foreground: var(--brand-foreground)
--color-brand-muted: var(--brand-muted)
--color-brand-subtle: var(--brand-subtle)
```

### Where Emerald Is Used

- **Active workspace** — button background, indicator bar
- **Active channel/DM** — sidebar row background + text
- **Primary buttons** — default button variant, CTAs
- **Selected navigation** — tabs, settings sidebar items
- **Focus rings** — `--ring` changed from gray to brand
- **Mention / notification indicators** — unread dots, notification highlights
- **Landing page** — all emerald accents
- **Auth page** — mobile header logo badge

### Where Emerald Is NOT Used

- **Backgrounds** — app, sidebar, message area, dialogs
- **Borders** — standard borders, dividers, input borders
- **Body/message/secondary text**
- **General cards, containers, popovers**

---

## Status Token System

Replaces duplicated hardcoded Tailwind color classes across components (`bg-green-500`, `bg-yellow-500`, `bg-red-500`, `bg-muted-foreground`).

### Token Set

| Token | Value | Tailwind Equivalent |
|---|---|---|
| `--status-online` | `oklch(0.63 0.19 145)` | `green-500` |
| `--status-away` | `oklch(0.78 0.18 85)` | `yellow-500` |
| `--status-dnd` | `oklch(0.58 0.23 25)` | `red-500` |
| `--status-offline` | `oklch(0.56 0 0)` | `muted-foreground` |

### Tailwind v4 Mapping

```
--color-status-online: var(--status-online)
--color-status-away: var(--status-away)
--color-status-dnd: var(--status-dnd)
--color-status-offline: var(--status-offline)
```

### Components Using Status Tokens

- `PresenceIndicator.tsx` — online status dot
- `StatusSelector.tsx` — dropdown options + trigger dot
- `InfoPanel.tsx` — user profile status display

---

## Files Changed

| # | File | Change |
|---|---|---|
| 1 | `client/src/app/globals.css` | Added brand tokens, status tokens, updated `--ring` to brand, updated message highlight animation |
| 2 | `client/src/shared/components/ui/button.tsx` | `default` variant: `bg-primary` → `bg-brand`; outline variant: brand focus border |
| 3 | `client/src/modules/landing/components/LandingPage.tsx` | All `bg-emerald-*` → `bg-brand`/`bg-brand-muted`; `text-emerald-*` → `text-brand` |
| 4 | `client/src/modules/auth/components/MobileAuthHeader.tsx` | Logo badge: `bg-emerald-600` → `bg-brand` |
| 5 | `client/src/modules/chat/components/NavigationRail.tsx` | Active workspace/DM: `bg-primary text-primary-foreground` → `bg-brand text-brand-foreground`; indicator bar: `bg-primary` → `bg-brand` |
| 6 | `client/src/modules/conversations/components/Sidebar.tsx` | Active DM row: `bg-primary/10 text-primary dark:bg-white/10` → `bg-brand/10 text-brand`; "New" button: `bg-primary/10` → `bg-brand/10` |
| 7 | `client/src/modules/workspaces/components/WorkspaceChannelItem.tsx` | Active channel row: `bg-primary/10 text-primary dark:bg-white/10` → `bg-brand/10 text-brand` |
| 8 | `client/src/modules/workspaces/components/WorkspaceHeader.tsx` | Invite trigger: `text-primary` → `text-brand` |
| 9 | `client/src/modules/chat/components/PresenceIndicator.tsx` | `bg-red-500`/`bg-yellow-500`/`bg-green-500`/`bg-muted-foreground` → `bg-status-dnd`/`bg-status-away`/`bg-status-online`/`bg-status-offline` |
| 10 | `client/src/modules/chat/components/InfoPanel.tsx` | Status labels: hardcoded → status tokens; Active tab: `border-primary text-primary` → `border-brand text-brand` |
| 11 | `client/src/modules/users/components/StatusSelector.tsx` | Option colors + trigger dot: `text-green-500`/`bg-red-500` etc. → `text-status-online`/`bg-status-dnd` etc. |
| 12 | `client/src/modules/settings/components/AppearanceSettings.tsx` | Active card: `border-primary bg-primary/10 text-primary` → `border-brand bg-brand/10 text-brand` |
| 13 | `client/src/modules/settings/components/SharedSettingsModal.tsx` | Active tab: `bg-primary/10 text-primary` → `bg-brand/10 text-brand` |
| 14 | `client/src/modules/settings/components/SettingsSidebar.tsx` | Active item: `bg-primary/10 text-primary` → `bg-brand/10 text-brand` |
| 15 | `client/src/modules/conversations/components/EmptyState.tsx` | Icon + CTA button: `bg-primary text-primary-foreground` → `bg-brand text-brand-foreground` |
| 16 | `client/src/app/not-found.tsx` | Ghost icon + "Return Home" button: `bg-primary text-primary-foreground` → `bg-brand text-brand-foreground` |
| 17 | `client/src/modules/notifications/components/BellPopover.tsx` | Unread row bg + dot: `bg-primary/5`/`bg-primary` → `bg-brand/5`/`bg-brand` |
| 18 | `client/src/modules/notifications/utils/notifications-ui.tsx` | Member joined icon: `text-primary` → `text-brand` |

---

## Design Decisions

### 1. Separate Brand Tokens (not overloading `--primary`)

The existing `--primary` token (`oklch(0.205 0 0)` light / `oklch(0.922 0 0)` dark) remains achromatic. Brand is its own token set so it can evolve independently.

### 2. Active State Pattern

Consistent pattern used across sidebar rows, nav items, and channel items:

```
Light mode:  bg-brand/10 text-brand
Dark mode:  bg-brand/10 text-brand
```

This uses a 10% opacity brand background with full-brand text — subtle but recognizable.

### 3. Primary Button Variant

The `default` button variant changed from `bg-primary` to `bg-brand` so all primary action buttons use the emerald brand color. The `--primary` token is still available for non-brand emphasis (e.g., avatar fallbacks, decorative icons).

### 4. Focus Rings

`--ring` changed from gray to brand color. All focus-visible rings now use emerald, which improves keyboard navigation visibility and brand consistency.

### 5. Message Highlight

The scroll-to-message highlight animation now uses `var(--brand)` instead of `var(--primary)`, making the highlight feel more intentional.

### 6. Landing Page + App Unity

The landing page (previously hardcoded `emerald-600`/`emerald-100`) now uses the same brand tokens as the app interior, creating visual continuity between marketing and product experiences.

### 7. Status Token Standardization

Three previously duplicated color definitions (`PresenceIndicator.tsx`, `StatusSelector.tsx`, `InfoPanel.tsx`) now all reference the same CSS variables. Changing status colors in one place (`globals.css`) updates the entire app.

---

## Design Review Checklist

- [x] Brand tokens defined in CSS custom properties
- [x] Tokens exposed through Tailwind v4 `@theme inline`
- [x] Light and dark mode variants correct
- [x] `--primary` not overloaded
- [x] Active workspace/indicator uses brand
- [x] Active channel/DM rows use brand
- [x] Primary buttons use brand
- [x] Selected tabs/navigation use brand
- [x] Focus rings use brand
- [x] Status colors use CSS variables
- [x] Landing page uses brand tokens
- [x] No random blue/emerald hardcoded colors remain
- [x] Conflicting accent colors removed
