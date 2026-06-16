# Landing Module Bug Analysis (Client)

Covers client (`client/src/modules/landing/`) — the public-facing landing page.

---

## MEDIUM BUGS

### 1. No Loading State for Images

**File:** `client/src/modules/landing/components/LandingPage.tsx:13`

```tsx
<Image src="/images/Logo.png" alt="Nexus Logo" width={32} height={32} className="w-8 h-8 object-contain" />
```

Next.js `Image` component provides automatic lazy loading, but there's no blur placeholder or skeleton while the image loads. On slow connections, the logo area appears empty momentarily.

### 2. No Scroll Restoration on Navigation

When users click "Log in" or "Sign up" from the landing page, they navigate to the auth pages. If they press the browser back button, the scroll position on the landing page is lost (Next.js default behavior). The hero section is at the top, so this is minor, but if a user had scrolled to features and navigated back, they'd be returned to the top.

### 3. No Analytics or Conversion Tracking

The landing page has no analytics hooks for tracking:
- CTA button clicks ("Get Started", "Log in")
- Feature section visibility
- Time spent on page

Without analytics, there's no data to optimize conversion rates.

---

## MINOR BUGS

### 4. Hero Section CTA Links to Register Only

**File:** `client/src/modules/landing/components/LandingPage.tsx:44-49`

The main "Get Started" CTA links to `/register`. There's no secondary CTA for existing users to log in directly from the hero. Users must scroll to the nav bar to find the "Log in" link. This increases friction for returning users.

### 5. No Mobile Hamburger Menu

**File:** `client/src/modules/landing/components/LandingPage.tsx:16-29`

The navigation bar shows "Log in" and "Sign up" as inline links visible on all screen sizes. While the `sm:gap-6` class adjusts spacing, there's no hamburger menu for very narrow screens. On a 320px-wide device, the two links may overlap or overflow the header.

### 6. Feature Cards Have No Hover/Interaction Animation

**File:** `client/src/modules/landing/components/LandingPage.tsx:72-100`

The feature cards are static with only border and shadow styling. There's no hover effect (lift, border color change, icon animation) to provide visual feedback. The cards feel inert compared to modern landing page conventions.

### 7. No SEO Meta Tags in Component

The `LandingPage` component has no `<Head>` or `next/head` meta tags for title, description, or Open Graph. SEO metadata would need to be set at the page level or layout level. If the landing page is the root index, missing meta tags hurt search engine ranking.

### 8. Hardcoded Text Content

All copy text is hardcoded in the component. There's no i18n support or content management system integration. Adding localization later will require extracting every string.

### 9. No Error Boundary

If any part of the landing page throws (e.g., image load failure, component crash), there's no error boundary. The user would see a blank page or a React runtime error overlay (in development) instead of a graceful fallback.
