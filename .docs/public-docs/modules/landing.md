# Landing Module

## Overview

The Landing module contains the public-facing page for unauthenticated users. It serves as the entry point for visitors who have not yet logged in.

## Client-Side (`client/src/modules/landing`)

### Files

| File | Role |
|---|---|
| `components/LandingPage.tsx` | Main landing page component with hero section, feature highlights, and CTA |
| `index.ts` | Module barrel export |

### Routing

- **Path:** `/` (root)
- **Access:** Public — no authentication required
- **Behavior:** Displays marketing content for unauthenticated users. After login, the Next.js middleware redirects authenticated users away from `/` to `/conversations`
- **Integration:** Links to `/login` and `/register` pages for authentication

### Known Limitations

- Currently a single page with static content
- No pricing or features detail pages
- No analytics tracking
