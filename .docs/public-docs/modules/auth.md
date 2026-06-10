# Auth Module

## Overview
The Auth module is responsible for identifying users, maintaining session state, and protecting authenticated routes.

## Client-Side (`client/src/modules/auth`)
- **State Management**: Uses Zustand (e.g., `useAuthStore.ts`) to manage the current user session.
- **Providers**: Provides an `AuthGate` or similar mechanism to block rendering of protected pages until authentication is verified.
- **UI Components**: Contains forms for login and registration.

## Server-Side
Authentication logic on the backend is typically intertwined with the `users` module, which handles the registration and login routes, issuing session tokens or JWTs as appropriate.


> **Note:** Documentation updated on 2026-06-10 to reflect UI improvements: feat(ui): Added an explicit 'Message' button in the NewConversationModal when searching for users, replacing the full-row clickable area for better UX.
