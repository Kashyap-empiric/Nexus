# Nexus — CSS & UI/UX Analysis

> Generated for review by AI models. Covers styling approach, design tokens, component patterns, responsive behavior, accessibility, animations, and potential improvement areas.

---

## 1. Tech Stack Overview

| Layer | Technology |
|---|---|
| CSS Framework | **Tailwind CSS v4** (CSS-first config, no `tailwind.config.*`) |
| PostCSS | `@tailwindcss/postcss` plugin |
| Component Library | **shadcn/ui** (style: `base-nova`, baseColor: `neutral`) |
| Headless Primitives | **@base-ui/react** (v1.5.0) — Button, Dialog, Menu, Avatar, Input, Popover, Tooltip, etc. |
| Icons | **lucide-react** (v1.17.0) |
| Theme Switching | **next-themes** (dark/light/system) |
| CSS Animations | **tw-animate-css** (utility-based animation classes) |
| Class Merging | `clsx` + `tailwind-merge` via `cn()` utility |
| Variant System | `class-variance-authority` (`cva`) — used in Button |
| Font | **Inter** via `next/font/google` |
| Toast | **sonner** (`<Toaster richColors />`) |

---

## 2. CSS Architecture

### 2.1 Single CSS File

All styles live in **one file**: `client/src/app/globals.css` (186 lines, ~5.5 KB).

```
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline { /* token mappings */ }
:root { /* light tokens */ }
.dark { /* dark tokens */ }
@layer base { /* reset + body */ }
@layer utilities { /* .font-heading */ }
/* Custom keyframes + scrollbar styles */
```

**No CSS modules, no SCSS, no CSS-in-JS.** All component styles use Tailwind utility classes directly in JSX.

### 2.2 Design Tokens (CSS Custom Properties)

Located in `globals.css`. Uses **oklch** color space exclusively.

#### Light Mode (`:root`)

| Token | Value | Description |
|---|---|---|
| `--background` | `oklch(1 0 0)` | White |
| `--foreground` | `oklch(0.145 0 0)` | Near-black |
| `--primary` | `oklch(0.205 0 0)` | Dark (near-black) |
| `--primary-foreground` | `oklch(0.985 0 0)` | White |
| `--secondary` | `oklch(0.97 0 0)` | Very light gray |
| `--muted` | `oklch(0.97 0 0)` | Very light gray |
| `--muted-foreground` | `oklch(0.556 0 0)` | Medium gray |
| `--accent` | `oklch(0.97 0 0)` | Same as muted |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Red |
| `--border` | `oklch(0.87 0 0)` | Light gray |
| `--input` | `oklch(0.87 0 0)` | Light gray |
| `--ring` | `oklch(0.708 0 0)` | Medium gray |
| `--radius` | `0.625rem` | 10px base radius |
| `--sidebar-*` | Various | Sidebar-specific tokens |
| `--chart-1` through `--chart-5` | Grayscale | Chart colors |

#### Dark Mode (`.dark`)

| Token | Value | Description |
|---|---|---|
| `--background` | `oklch(0.220 0 0)` | Dark gray |
| `--foreground` | `oklch(0.985 0 0)` | White |
| `--primary` | `oklch(0.922 0 0)` | Light |
| `--border` | `oklch(1 0 0 / 10%)` | Subtle white border |
| `--sidebar-primary` | `oklch(0.488 0.243 264.376)` | Blue accent (only token with chroma) |
| `--sidebar-ring` | `oklch(0.556 0 0)` | |

**Key observation: The palette is almost entirely achromatic (grayscale).** The only hint of color is the sidebar primary in dark mode (blue) and the destructive color (red). There is no brand color in the app's own token set. The `--primary` variable is just black or white depending on mode.

#### Radius Scale

Derived from `--radius` (0.625rem = 10px):

| Token | Value |
|---|---|
| `--radius-sm` | `calc(0.625rem * 0.6)` ≈ 6px |
| `--radius-md` | `calc(0.625rem * 0.8)` ≈ 8px |
| `--radius-lg` | `0.625rem` = 10px |
| `--radius-xl` | `calc(0.625rem * 1.4)` ≈ 14px |
| `--radius-2xl` | `calc(0.625rem * 1.8)` ≈ 18px |
| `--radius-3xl` | `calc(0.625rem * 2.2)` ≈ 22px |
| `--radius-4xl` | `calc(0.625rem * 2.6)` ≈ 26px |

### 2.3 @theme inline Block

Maps CSS vars to Tailwind theme names:
- `--color-background`, `--color-foreground`, `--color-primary`, etc.
- `--font-sans`: `var(--font-inter), ui-sans-serif, system-ui, sans-serif`
- `--font-mono`: `ui-monospace, SFMono-Regular, monospace`

### 2.4 Base Layer

```css
* { @apply border-border outline-ring/50; }
body { @apply bg-background text-foreground; font-family: var(--font-sans); }
html { @apply font-sans; }
```

### 2.5 Custom CSS

1. **`@keyframes message-highlight-flash`** — fades primary color overlay from 20% to transparent over 1.5s. Used when scrolling to a replied-to message.
2. **`.tiptap p.is-editor-empty:first-child::before`** — placeholder for the TipTap rich editor.
3. **Scrollbar styling** — thin scrollbars (6px), using muted colors for track/thumb.

---

## 3. Styling Patterns

### 3.1 Utility-First Approach

**Every component** uses Tailwind classes directly in JSX. No inline styles, no styled-components. The `cn()` helper handles conditional class merging:

```ts
// src/shared/lib/utils.ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 3.2 Component Variants (cva)

Used only in `button.tsx`:

```ts
const buttonVariants = cva("base-classes...", {
  variants: {
    variant: { default, outline, secondary, ghost, destructive, link },
    size: { default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

### 3.3 Hover/Focus/Active Patterns

Universal patterns observed across components:

| Interaction | Classes |
|---|---|
| Button hover | `hover:bg-muted hover:text-foreground` |
| Link hover | `hover:text-foreground` or `hover:underline` |
| Focus visible | `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` |
| Active/pressed | `active:not-aria-[haspopup]:translate-y-px` (button) |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |
| Aria invalid | `aria-invalid:border-destructive` |

### 3.4 shadcn/ui Pattern (data-slot attributes)

Every shadcn component uses `data-slot` attributes for scoping (e.g., `data-slot="button"`, `data-slot="card"`). Compound components share state via CSS data attributes and group selectors:

```css
/* Example: Card sizing */
data-[size=sm]:gap-3
has-data-[slot=card-footer]:pb-0
group-data-[size=sm]/card:px-3
```

---

## 4. Component-by-Component Analysis

### 4.1 shadcn/ui Components (`src/shared/components/ui/`)

| Component | Lines | Primitives | Key Features |
|---|---|---|---|
| **Button** | 58 | `@base-ui/react/button` + `cva` | 6 variants, 8 sizes, focus ring, active translate-y |
| **Card** | 103 | Plain `div` | `sm` size variant, header/content/footer, ring-1 border |
| **Dialog** | 160 | `@base-ui/react/dialog` | Backdrop with blur, centered popup, zoom animation, close button |
| **AlertDialog** | — | `@base-ui/react/dialog` | Confirmation variant |
| **Sheet** | 138 | `@base-ui/react/dialog` | 4 sides, overlay on mobile only, slide transitions |
| **DropdownMenu** | 268 | `@base-ui/react/menu` | Full submenu, checkbox/radio items, keyboard nav |
| **Popover** | 90 | `@base-ui/react/popover` | Header/title/description sub-components |
| **Avatar** | 109 | `@base-ui/react/avatar` | sm/default/lg sizes, badge, group, fallback |
| **Input** | 20 | `@base-ui/react/input` | Focus ring, disabled, aria-invalid states, dark:bg-input/30 |
| **Textarea** | — | Plain `<textarea>` | — |
| **Label** | — | Plain `<label>` | — |
| **Tooltip** | 47 | `@base-ui/react/tooltip` | Portal, positioner, popup with animations |
| **UserAvatar** | — | Wrapper around Avatar | Name initials fallback |

### 4.2 Layout Components

#### AppLayoutShell (220 lines)
- **Structure:** `div.flex.h-dvh` → (Sidebar | `<main>`)
- **Responsive:** Sidebar slides as overlay on mobile with `-translate-x-full` / `translate-x-0`; desktop is always visible.
- **Header:** Fixed height `h-14`, shadow-sm, flex between header info + actions (BellPopover, InfoPanel toggle).
- **Mobile overlay:** `fixed inset-0 z-40 bg-transparent` (transparent click-outside catcher).
- **Animations:** `transition-transform duration-300 ease-in-out` for mobile sidebar.

#### NavigationRail (104 lines)
- **Structure:** `w-[60px]` vertical bar with icons.
- **Items:** DM button (MessagesSquare icon), workspace buttons (initials or images), create workspace (+), settings at bottom.
- **Active state:** `bg-primary text-primary-foreground rounded-xl` with a left accent bar (`absolute -left-1 w-2 h-10 bg-primary rounded-r-md`).
- **Unread badges:** Red pill badges `bg-red-500 text-white text-[10px] font-bold`.
- **Hover:** `hover:rounded-xl` (transition from rounded-2xl).

#### Sidebar (382 lines)
- **Mode-aware:** Renders DM conversations or workspace channels based on `mode`.
- **Search bar:** Absolute-positioned Search icon + Input with custom styling.
- **Sections:** "Direct Messages" / "Channels" header with "New" action.
- **Unread indicators:** Bold text + red pill badge for unread items.
- **Active item:** `bg-primary/10 text-primary dark:bg-white/10 dark:text-foreground`.
- **User profile footer:** Avatar + status + logout button, border-t separation.
- **Loading state:** Skeleton pulses for conversation list.

### 4.3 Feature Components

#### LandingPage (143 lines)
- **Separate color scheme:** Uses emerald accent (`emerald-600`, `emerald-100`, `dark:bg-emerald-900/30`) instead of the app's grayscale theme.
- **Sections:** Nav bar, hero, features grid (3 cards), CTA, footer.
- **Dark mode:** Uses `dark:bg-zinc-950` / `dark:text-zinc-50`.
- **Responsive:** Grid goes 1→2→3 columns. Buttons stack vertically on mobile.

#### MessageList (132 lines)
- **Infinite scroll:** Observer target for pagination.
- **Scroll-to-bottom button:** Floating button `absolute bottom-2 right-4` with rounded-full, shadow, border, and unread dot indicator.
- **Empty state:** Centered text "No messages yet."
- **Loading state:** `MessageListSkeleton` component.
- **Error state:** Centered red text with error details.

#### MessageGroupItem (403 lines)
- **Message grouping:** By user, with avatar + name only on first message.
- **Hover actions:** Desktop hover reveals reply/copy/edit/delete buttons in a flex row.
- **Context menu:** Right-click opens dropdown.
- **Mobile actions:** DropdownMenu triggered by long-press/context.
- **Edit mode:** Inline textarea with Save/Cancel.
- **Delete confirmation:** AlertDialog.
- **Reply quote:** Small block above message showing replied-to content, clickable to scroll.
- **Highlight animation:** `highlight-message` class fades background.
- **Pending/optimistic:** Reduced opacity for unconfirmed messages.

#### MessageInput (283 lines)
- **TipTap editor:** Rich text with bold, italic, code, strikethrough; markdown serialization.
- **Toolbar row:** Inline style buttons with SVG icons, active state uses `bg-primary/15 text-primary`.
- **Emoji picker:** `emoji-picker-react` in a Popover.
- **Reply banner:** Shows above input when replying.
- **Send button:** Ghost variant, primary color when content exists.
- **Mobile/desktop behavior:** Enter sends on desktop, newline on mobile.

#### WorkspaceChannelItem (258 lines)
- **Visibility icons:** Lock (private) or Hash (public).
- **Context menu:** Rename, toggle visibility, delete (for admins).
- **Modals:** Rendered via `createPortal` for rename/delete/visibility dialogs (custom modal rather than shadcn Dialog).

#### LoginForm (133 lines)
- **Card layout:** `Card` component with GitHub OAuth button, email/password form.
- **Divider:** "Or continue with" with border lines.
- **Alert banners:** Green (success) or blue (needs confirmation) for registration feedback.
- **Error display:** Red banner for auth errors.
- **Validation:** Per-field error messages below inputs.

#### AuthSidebar (35 lines)
- **Hidden on mobile:** `hidden lg:flex`.
- **Background:** Full-bleed image with gradient overlay.

#### BellPopover (186 lines)
- **Custom popover** (not shadcn Popover) — manually positioned with click-outside + escape listeners.
- **Unread badge:** Red pill on bell icon.
- **Notification list:** Scrolling list with icons, title, body, timestamp, unread dot.
- **Actions:** "View all" and "Settings" links, "Mark all as read" button in footer.

#### InfoPanel (148 lines)
- **Width:** `w-80`.
- **Tabs:** About/Profile and Members (channel only) with border-bottom active indicator.
- **User profile view:** Avatar, name, status dot, bio, join date.
- **Channel view:** Fallback "No description available" text.

#### AppearanceSettings (55 lines)
- **Theme picker:** 3-card grid (Light/Dark/System) with icons, border highlight for active.

### 4.4 Provider Components

- `ThemeProvider` — wraps `next-themes`, attribute `class`, default `dark`.
- `AuthProvider` — Supabase auth context.
- `QueryProvider` — TanStack Query provider.
- `SocketProvider` — Socket.io context.

---

## 5. Responsive Behavior

### Breakpoint Strategy

Uses Tailwind's default breakpoints (consistent with shadcn):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Responsive Patterns

| Context | Mobile (< md) | Desktop (≥ md) |
|---|---|---|
| **Auth layout** | Full-width form, no sidebar | Split: 50% brand sidebar + 50% form |
| **App layout** | Sidebar as overlay (slide from left), full-width content | Sidebar fixed, content alongside |
| **Sidebar** | Full `w-screen` when open, translated off-screen when closed | `w-72` sticky |
| **NavigationRail** | Always visible on mobile (60px) | Always visible |
| **InfoPanel** | Fixed overlay from right edge, with translucent backdrop | Inline `w-80` panel |
| **MessageList** | Narrower padding (`px-[15px]` vs `md:px-6`) | Normal padding |
| **Landing page** | Stacked layout | Multi-column grids |
| **Settings** | Stacked form | Full-width within container |

### Safe Area Handling

```tsx
pb-[calc(1rem+env(safe-area-inset-bottom))]
```

Used in MessageInput for mobile notch/home indicator.

---

## 6. Dark Mode

- **Implementation:** `next-themes` with `class` strategy — toggles `.dark` class on `<html>`.
- **Default:** `dark`.
- **All components** provide dark variant classes (e.g., `dark:bg-zinc-950`, `dark:border-zinc-800`, `dark:hover:bg-white/5`).
- The `@custom-variant dark (&:is(.dark *))` directive enables `dark:` variants in Tailwind v4.
- shadcn components use dark variants within their long class strings (e.g., `dark:aria-invalid:border-destructive/50`).

---

## 7. Animation & Transitions

### Types of Animations

1. **Page elements:** `animate-in fade-in slide-in-from-bottom-1 duration-300 ease-out` — used on message rows.
2. **Modals/Popovers:** `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95` — shadcn pattern using `tw-animate-css`.
3. **Message highlight:** Custom `@keyframes message-highlight-flash` (1.5s, primary→transparent).
4. **Sidebar toggle:** `transition-transform duration-300 ease-in-out` on the mobile sidebar.
5. **NavigationRail items:** `transition-all duration-200` on workspace button shapes (rounded-2xl → rounded-xl on hover).
6. **Skeleton loading:** `animate-pulse` on placeholder elements.

---

## 8. Accessibility

### Current Implementation

- **Focus rings:** `focus-visible:ring-1 focus-visible:ring-ring` on interactive elements.
- **ARIA attributes:** `aria-invalid` on inputs, `aria-[haspopup]` on buttons.
- **sr-only:** Screen-reader-only text for icon buttons (e.g., `<span className="sr-only">Send</span>`).
- **Labels:** `<label htmlFor="...">` correctly associated with inputs.
- **Role semantics:** shadcn/base-ui handles ARIA roles for dialog, menu, popover, tooltip, etc.

### Gaps

- **Color contrast:** The grayscale palette may not meet WCAG AA for some text/background combinations. No explicit contrast testing.
- **Reduced motion:** No `prefers-reduced-motion` queries. Animations cannot be disabled.
- **Keyboard navigation:** Context menus on messages require right-click; no documented long-press for mobile.
- **Skip-to-content:** No skip navigation link.
- **Focus trap:** Modals (custom portals in WorkspaceChannelItem) lack proper focus trapping.

---

## 9. Known Issues & Opportunities

### Issues

1. **Single CSS file is 186 lines** — manageable but no separation of concerns (e.g., animations vs theme vs base).
2. **Landing page uses emerald accent** — inconsistent with the app's achromatic interior palette. No shared brand color.
3. **Custom pixel values** scattered (e.g., `w-[60px]`, `w-[40px]`, `gap-[2px]`). Could benefit from a design-token scale.
4. **BellPopover uses manual implementation** instead of shadcn Popover (positioning, click-outside, escape handling).
5. **WorkspaceChannelItem modals** use `createPortal` with custom markup instead of shadcn Dialog/AlertDialog.
6. **No `prefers-reduced-motion`** — animations run unconditionally.
7. **Padding inconsistency** — `px-[15px] md:px-4` in the header vs `px-[15px] md:px-6` in the message input.
8. **Message highlight uses `color-mix()`** which has limited browser support (no IE11, but acceptable for modern).
9. **Status colors** (green/yellow/red/gray) defined per-component in `PresenceIndicator` and `InfoPanel` — duplication.
10. **Grayscale-only palette** may feel flat; no accent color for links, highlights, or brand elements within the app.

### Improvement Opportunities

1. Introduce a **shared design token file** (e.g., `tokens.css` or within `globals.css` `@theme`) for status colors, brand colors, spacing scale.
2. Add **brand accent color** (e.g., a green/blue) to the CSS custom properties for consistent use across the app.
3. Replace **ad-hoc pixel values** with theme-aware spacing (Tailwind `gap-2` vs `gap-[2px]`).
4. Standardize **BellPopover** to use shadcn Popover primitives.
5. Replace **`createPortal` modals** in WorkspaceChannelItem with shadcn Dialog.
6. Add **`prefers-reduced-motion`** media query to disable animations.
7. Extract **status color tokens** into CSS variables (`--status-available`, `--status-away`, `--status-dnd`, `--status-offline`).
8. Add **MDX/Storybook** documentation for component styling patterns.
9. Implement **font-size scale** as CSS custom properties rather than hardcoded values.
10. Consider **CSS modules** for page-specific styles to reduce class-string bloat in large components.

---

## 10. File Index (Key Files)

| File | Lines | Role |
|---|---|---|
| `client/src/app/globals.css` | 186 | All CSS (theme, tokens, base, utilities, animations) |
| `client/src/app/layout.tsx` | 50 | Root layout (Inter font, providers) |
| `client/src/app/(auth)/layout.tsx` | 22 | Auth layout (sidebar + form area) |
| `client/src/app/(protected)/layout.tsx` | 20 | Protected layout (SocketProvider + AppLayoutShell) |
| `client/src/shared/lib/utils.ts` | 18 | `cn()` helper |
| `client/src/shared/components/ui/button.tsx` | 58 | Primary button (cva variants) |
| `client/src/shared/components/ui/card.tsx` | 103 | Card with sub-components |
| `client/src/shared/components/ui/dialog.tsx` | 160 | Modal dialog |
| `client/src/shared/components/ui/sheet.tsx` | 138 | Slide-over panel |
| `client/src/shared/components/ui/dropdown-menu.tsx` | 268 | Full dropdown system |
| `client/src/shared/components/ui/popover.tsx` | 90 | Popover with header/title/description |
| `client/src/shared/components/ui/avatar.tsx` | 109 | Avatar with badge, group |
| `client/src/shared/components/ui/input.tsx` | 20 | Input with states |
| `client/src/shared/components/ui/tooltip.tsx` | 47 | Tooltip |
| `client/src/shared/components/layout/AppLayoutShell.tsx` | 220 | Main app shell layout |
| `client/src/modules/chat/components/NavigationRail.tsx` | 104 | Left icon rail |
| `client/src/modules/conversations/components/Sidebar.tsx` | 382 | Conversation/channel list |
| `client/src/modules/chat/components/ActiveConversation.tsx` | 164 | Chat view container |
| `client/src/modules/messages/components/MessageList.tsx` | 132 | Message feed with infinite scroll |
| `client/src/modules/messages/components/MessageGroupItem.tsx` | 403 | Individual message group |
| `client/src/modules/messages/components/MessageInput.tsx` | 283 | Rich text input |
| `client/src/modules/landing/components/LandingPage.tsx` | 143 | Marketing landing |
| `client/src/modules/auth/components/LoginForm.tsx` | 133 | Login form |
| `client/src/modules/auth/components/AuthSidebar.tsx` | 36 | Auth brand sidebar |
| `client/src/modules/notifications/components/BellPopover.tsx` | 186 | Notification bell |
| `client/src/modules/chat/components/InfoPanel.tsx` | 148 | Detail panel |
| `client/src/modules/chat/components/PresenceIndicator.tsx` | 34 | Online status dot |
| `client/src/modules/settings/components/ProfileSettings.tsx` | 287 | Profile editing |
| `client/src/modules/settings/components/AppearanceSettings.tsx` | 55 | Theme picker |
| `client/src/modules/workspaces/components/WorkspaceHeader.tsx` | 45 | Workspace header |
| `client/src/modules/workspaces/components/WorkspaceChannelItem.tsx` | 258 | Channel list item |
| `client/src/modules/chat/store/chatStore.ts` | 82 | Zustand UI state |
| `client/postcss.config.mjs` | 7 | PostCSS with tailwindcss |
| `client/components.json` | 25 | shadcn config |

---

## 11. Color Palette Summary

### App Interior (grayscale theme)

```
Light:  bg=white, fg=~black, primary=~black, border=light-gray
Dark:   bg=dark-gray, fg=white, primary=white, border=white(10%)
Accent: none (sidebar-primary in dark only: blue with chroma 0.243)
```

### Landing Page (separate emerald theme)

```
Accent: emerald-600 (green)
Cards:  emerald-100 / emerald-900/30
```

### Status Colors (ad-hoc, per-component)

```
Available: green-500
Away:      yellow-500
DND:       red-500
Offline:   muted-foreground (gray)
```

### Destructive / Error

```
destructive: oklch(0.577 0.245 27.325) ~ red
```

---

## 12. Typography

| Property | Value |
|---|---|
| Body font | Inter (variable), via `next/font` |
| CSS var | `--font-inter` |
| Tailwind token | `--font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif` |
| Monospace | `ui-monospace, SFMono-Regular, monospace` |
| Heading class | `.font-heading` (uses --font-sans) |
| Body size | `text-sm` / `text-base` (components), `text-[15px]` (messages) |
| Line height | `leading-snug` (messages), `leading-none` (titles), `leading-relaxed` (landing) |

---

## 13. Spacing & Layout Constants

| Element | Value |
|---|---|
| NavigationRail width | `w-[60px]` |
| Sidebar width | `w-full` (mobile) / `w-72` (desktop) |
| InfoPanel width | `w-80` |
| Header height | `h-14` |
| Avatar sizes | `h-9 w-9` (messages), `h-8 w-8` (sidebar), `h-24 w-24` (settings) |
| Icon button sizes | `h-7 w-7`, `h-8 w-8`, `h-10 w-10` |
| Padding horizontal | `px-[15px] md:px-4` (header), `px-[15px] md:px-6` (input) |
| Base border radius | `rounded-lg` (8px), `rounded-xl` (10px), `rounded-2xl` (14px) |
