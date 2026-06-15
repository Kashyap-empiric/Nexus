# Workspace Invite Flow — Bug Analysis & Fix Plan

## Overview

This document analyzes three interrelated bugs in the workspace invite flow and provides step-by-step fix plans for each.

---

## Bug 1: Invite Modal Renders Only Above the Sidebar (Not Full Screen)

### Symptom

When clicking "Invite People" from the workspace header or "Invite Someone" from the sidebar, the invite modal appears only above the sidebar area instead of covering the entire screen.

### Root Cause

The `InviteModal` component is rendered **inside** the `Sidebar` component (see `Sidebar.tsx`, line 376):

```tsx
<InviteModal isOpen={inviteModal.isOpen} onClose={inviteModal.close} type={inviteModal.type} entityId={inviteModal.entityId} />
```

The sidebar is inside the `AppLayoutShell` which uses a flex layout. On desktop, the sidebar has a fixed width (`w-72`). The modal uses `fixed inset-0 z-50` which should normally cover the full viewport. However, because the modal is a child of the sidebar DOM element, CSS stacking contexts can cause the modal to be constrained or clipped — especially when the sidebar has its own `z-10` or `transform` properties.

Additionally, the `InviteModal` is also rendered inside `EmptyState.tsx` (line 61), compounding the issue.

### Fix Plan

1. **Remove `InviteModal` from `Sidebar.tsx`** — delete the import, the dynamic import, and the JSX at line 376.
2. **Remove `InviteModal` from `EmptyState.tsx`** — same treatment.
3. **Move the `InviteModal` to `AppLayoutShell.tsx`** (or the protected layout) so it renders at the top level of the DOM, outside any constrained container.
   - The `InviteModal` needs to be accessible from both `Sidebar` and `EmptyState`. The cleanest approach is to lift the `useInviteModal` hook state up to `AppLayoutShell` and pass the open/close handlers down, **or** keep the zustand-like hook approach but render the modal in `AppLayoutShell`.
   - Since `useInviteModal` is already a reusable hook, `AppLayoutShell` can call it and render `<InviteModal>` there.
4. **Alternative simpler fix (less refactoring):** Use `createPortal` from `react-dom` to render the modal at the `document.body` level — but this is less clean than lifting the state.

**Recommended approach:** Lift the invite modal state to `AppLayoutShell` via a shared context or by passing callbacks through the component tree, and render `<InviteModal>` once at the shell level.

---

## Bug 2: Invite by Username is Limiting — Should Use Email with Multi-Select (Chip/Tag Input) Like Google Docs

### Symptom

The invite modal has a simple text input that requires an exact username, only allows one user at a time, and doesn't leverage the user's email (which is the unique identifier in the system — see `prisma.schema`: `email String @unique`).

### Goal

Replace the username-based single-invite with an **email-based multi-invite** UI, similar to Google Docs sharing:
- Type an email address in an input field
- As you type, see matching user suggestions (by email and username) in a dropdown
- Click a suggestion or press Enter to add the user as a **chip/tag** below the input
- Multiple chips can be added before sending
- A single "Invite" button sends invites to all selected users at once

### Root Cause

The current implementation:
1. Uses `username` (not guaranteed unique) instead of `email` (unique identifier in the DB)
2. Has a plain `<Input>` with no search, no multi-select, no chip UX
3. Sends one API call per username — no batch endpoint exists

The user schema (`prisma.schema`) already has `email String @unique` — this should be the primary identifier for invites since it's unique and more user-friendly.

The existing `searchUsers` API (`users.repository.ts` line 9) already supports searching by email:
```typescript
OR: [
  { username: { contains: query, mode: "insensitive" } },
  { email: { contains: query, mode: "insensitive" } },  // already works!
],
```

### Fix Plan

#### Client-Side: Replace Input with Email-Tag Multi-Select

1. **Install a tag/chip input library** or build a simple one using `cmdk` (already in deps via shadcn) or `react-tagsinput` / `@rowy/remirror` package. **Recommended: build a lightweight custom chip input** since the UX is straightforward — no heavy library needed.

2. **New component: `EmailChipInput`** with the following behavior:
   - Renders an input field with a container below it for added chips
   - As user types, debounce 300ms and call `useUsersSearchQuery` to search users by email/username
   - Show a dropdown of matching users (showing email + username + avatar)
   - On click or Enter: add user as a chip (shows email + username, with an X button to remove)
   - The input is a free-form text field — if user types a raw email not matching any user, show a message "User not found"
   - Maintain an array of selected user IDs and their display info

3. **Chip/Tag UX:**
   - Each chip shows: `user.email` (primary) with `user.username` as secondary text
   - Chips have an `×` button to remove
   - Chips are displayed in a flex-wrap row below the input
   - On Backspace in empty input, remove the last chip (common UX pattern)

4. **Submit button:** One "Invite" button that sends all selected user IDs to the batch backend endpoint.

#### Server-Side: New Batch Invite Endpoint

5. **New endpoint: `POST /workspaces/:id/invite-multiple`** (or modify existing endpoint to accept an array)
   - Accepts `{ userIds: string[] }` — an array of user IDs
   - For each user ID:
     - Validate user exists
     - Check not already a member
     - Generate an invite token (reusing `generateInviteService`)
     - Create an `INVITE_RECEIVED` notification with token link
   - Returns `{ success: true, invited: number, skipped: { userId: string, reason: string }[] }` — so the client can show which users were skipped and why

6. **Update the existing endpoint** (`POST /workspaces/:id/invite`) to also accept `email` as an alternative to `username` — find user by email (unique) and proceed with the same token-based invite flow.

---

### UI Mockup of the Multi-Invite Component

```
┌──────────────────────────────────────────────┐
│  Invite by email                             │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ [john@acme.com ×] [jane@co.com ×]     │  │
│  │ [type email...                     🔍]│  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  jane@company.com  — Jane Smith    👤  │  │
│  │  john@acme.com     — John Doe      👤  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Invite 2 people]                           │
└──────────────────────────────────────────────┘
```

---

## Bug 3: Notification "Accept Invite" Redirects to Login, Then Logging In Doesn't Show the Workspace

### Symptom

When a user is invited to a workspace via the "Invite by username" flow:
1. They receive an `INVITE_RECEIVED` notification
2. Clicking the notification redirects to `/invite?workspace=<workspaceId>` 
3. If unauthenticated, they are sent to `/login`
4. After logging in, they are redirected to `/conversations` instead of the workspace they were invited to
5. The workspace never appears

### Root Cause

This is the most critical bug. The `inviteMemberByUsername` function in `workspaces.controller.ts` (line 204–209) creates a notification with:

```typescript
link: `/invite?workspace=${workspaceId}`,
```

But `InviteProcessor` (`client/src/modules/invites/components/InviteProcessor.tsx`, line 23) expects a `token` parameter:

```typescript
const token = searchParams.get("token");
```

There is **no token created** in the "invite by username" flow. The `inviteMemberByUsername` function **bypasses the invite token system entirely** — it only creates a notification but doesn't generate an invite record with a token. So when the user follows the notification link:

1. **Authenticated user:** `InviteProcessor` runs, looks for `token` → not found → `router.push("/")` → user is on home page, not in the workspace
2. **Unauthenticated user:** `InviteProcessor` looks for `token` → not found → `router.push("/login")` → user logs in → AuthGate calls `handleInviteContinuation` → reads `sessionStorage` for `nexus_invite` → nothing there → no redirect → user lands on `/conversations`

The flow is completely broken because the invite-by-username mechanism doesn't create an invite token.

### Fix Plan

#### Option A (Recommended): Use the Invite Token System

1. **In `inviteMemberByUsername` controller:** Instead of just sending a notification, also create an invite record with a token (reuse `invites.service.ts`’s `generateInviteService` or create the invite manually).
2. **Update the notification link** to include the actual token: `/invite?token=<generated_token>`
3. When the user clicks the notification:
   - `InviteProcessor` finds the token → resolves it via `POST /invites/resolve`
   - The `workspaceResolver` adds the user to the workspace and all default channels
   - User is redirected to the workspace page
4. **Pros:** Reuses existing, well-tested invite infrastructure; works for both authenticated and unauthenticated users
5. **Cons:** May need to decide invite expiration/max-uses policy for username-based invites

#### Option B (Simpler): Add the User Directly on Notification Click

1. Change the notification link to: `/invite?workspace=<workspaceId>&userId=<invitedUserId>`
2. Create a new endpoint or modify `InviteProcessor` to handle a workspace+userId invite path that:
   - Marks the notification as read
   - Redirects to the workspace/general channel
   - (The user was already added to the workspace by the `inviteMemberByUsername` function)
3. **Problem:** The `inviteMemberByUsername` function currently does NOT add the user to the workspace — it only sends a notification. So the user would need to be added somewhere.
4. **Not recommended** because it bypasses the invite system and creates a different invite flow.

#### Option C (Hybrid): Create Invite + Fix Notification Link

1. In `inviteMemberByUsername`:
   - Generate an invite token using `generateInviteService({ type: "WORKSPACE", entityId: workspaceId, userId })`
   - Send notification with `link: /invite?token=<token>`
2. This reuses the token-based system cleanly
3. When the user clicks → InviteProcessor resolves the token → workspaceResolver adds them → redirects to workspace

**Recommendation: Option C** — minimal changes, reuses existing infrastructure, fixes both authenticated and unauthenticated flows.

### Additional Fix for the InviteProcessor Notification Link

The notification's `link` currently points to `/invite?workspace=${workspaceId}`. Even if we use Option A or C, we must fix this link to use `/invite?token=...` instead. Additionally, the `InviteProcessor` should handle the case more gracefully:

1. If the invite token is invalid/expired, show a user-friendly error instead of just redirecting to "/"
2. If the user is already a member, redirect to the workspace home

---

## Summary of Changes Required

| # | File | Change |
|---|------|--------|
| 1a | `client/src/modules/conversations/components/Sidebar.tsx` | Remove `<InviteModal>` rendering |
| 1b | `client/src/modules/conversations/components/EmptyState.tsx` | Remove `<InviteModal>` rendering |
| 1c | `client/src/shared/components/layout/AppLayoutShell.tsx` | Add `useInviteModal()` hook and render `<InviteModal>` at top level |
| 2a | `client/src/modules/invites/components/InviteModal.tsx` | Replace single-username input with email-based multi-chip select (search by email, add chips, batch invite) |
| 2b | `client/src/modules/workspaces/api/workspaces.api.ts` | Add `inviteMembers(workspaceId, userIds[])` API function |
| 3a | `server/src/modules/users/users.repository.ts` | Add `findUserByEmail` method; add `email` to `searchUsers` select |
| 3b | `server/src/modules/users/users.types.ts` | Add `email` to `UserSearchResult` type |
| 3c | `server/src/modules/workspaces/workspaces.controller.ts` | Add `inviteMembers` endpoint accepting `{ userIds: string[] }`; refactor `inviteMemberByUsername` to use token-based flow |
| 3d | `server/src/modules/workspaces/workspaces.routes.ts` | Add route `POST /:id/invite-multiple` for batch invites |
| 3e | `server/src/modules/invites/invites.service.ts` | Export `generateInviteService` for reuse from workspaces module |

---

## Server-Side Changes Detail

### `inviteMemberByUsername` → `inviteMembers` (workspaces.controller.ts) — Updated Logic for Multi-Invite

```typescript
export const inviteMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId } = req.params as { id: string };
    const { userIds } = req.body as { userIds: string[] };

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: "userIds array is required" });
      return;
    }

    const workspace = await workspacesService.getWorkspaceDetails(userId, workspaceId);
    const currentUser = await usersRepo.findUserById(userId);

    const results = [];
    const skipped = [];

    for (const targetUserId of userIds) {
      // Skip self
      if (targetUserId === userId) {
        skipped.push({ userId: targetUserId, reason: "Cannot invite yourself" });
        continue;
      }

      // Check if already a member
      const isAlreadyMember = workspace.members.some((m: any) => m.userId === targetUserId);
      if (isAlreadyMember) {
        skipped.push({ userId: targetUserId, reason: "Already a member" });
        continue;
      }

      // Generate an invite token for each user
      const invite = await generateInviteService({ 
        type: "WORKSPACE", 
        entityId: workspaceId, 
        userId 
      });

      // Create INVITE_RECEIVED notification with the token link
      await createAndDispatch({
        userId: targetUserId,
        type: "INVITE_RECEIVED",
        title: "Workspace invite",
        body: `You've been invited to ${workspace.name} by ${currentUser?.username || "Unknown"}`,
        link: `/invite?token=${invite.token}`,  // <-- FIXED: uses token
        imageUrl: (workspace as any).imageUrl || undefined,
        metadata: {
          workspaceId,
          workspaceName: workspace.name,
          inviterId: userId,
          inviterName: currentUser?.username || "Unknown",
        },
      });

      results.push({ userId: targetUserId, invited: true });
    }

    res.status(200).json({ 
      success: true, 
      invited: results.length, 
      skipped 
    });
  } catch (error: any) {
    console.error("Error inviting members:", error);
    if (error?.message?.startsWith("Forbidden")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
```

Also update the existing `POST /workspaces/:id/invite` to also accept `email` as a lookup field:

```typescript
export const inviteByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  const targetUser = await usersRepo.findUserByEmail(email);
  if (!targetUser) {
    return res.status(404).json({ error: "User not found with this email" });
  }
  
  // ... same invite-by-token flow as above ...
};
```

---

## Client-Side Changes Detail

### AppLayoutShell.tsx — Lifted Modal

```tsx
// Add near the bottom of the shell, outside all constrained containers
<InviteModal 
  isOpen={inviteModal.isOpen} 
  onClose={inviteModal.close} 
  type={inviteModal.type} 
  entityId={inviteModal.entityId} 
/>
```

The `useInviteModal` hook state needs to be shared between `Sidebar` and `AppLayoutShell`. The cleanest approaches:
1. **React Context:** Create an `InviteModalContext` that provides `{ isOpen, type, entityId, openInvite, closeInvite }` 
2. **Zustand store:** Move the invite modal state into a small zustand store (already used pattern in this codebase)
3. **Prop drilling:** Pass open/close callbacks from `AppLayoutShell` → `Sidebar` (more verbose but works)

### InviteModal.tsx — Email-Based Multi-Invite with Chip Input

Replace the entire "Invite by username" section with a multi-email chip input:

```tsx
interface SelectedUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
}

const [emailInput, setEmailInput] = useState("");
const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
const debouncedQuery = useDebounce(emailInput, 300);
const { data: searchResults, isLoading: isSearching } = useUsersSearchQuery(debouncedQuery, isOpen && type === "WORKSPACE");

const addUser = (user: SelectedUser) => {
  if (!selectedUsers.find(u => u.id === user.id)) {
    setSelectedUsers([...selectedUsers, user]);
  }
  setEmailInput("");
};

const removeUser = (userId: string) => {
  setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
};

const handleSubmit = async () => {
  if (selectedUsers.length === 0) return;
  setIsInviting(true);
  try {
    const { inviteMembers } = await import("../../workspaces/api/workspaces.api");
    const result = await inviteMembers(entityId, selectedUsers.map(u => u.id));
    toast.success(`Invites sent to ${result.invited} user(s)`);
    if (result.skipped?.length > 0) {
      // Show which users were skipped and why
    }
    setSelectedUsers([]);
  } catch (err: any) {
    toast.error(err.response?.data?.error || "Failed to send invites");
  } finally {
    setIsInviting(false);
  }
};
```

The search API already returns users with `{ id, username, avatarUrl }`. Add `email` to the returned fields so the chip can display it.

### Server: Update User Search to Return Email

Modify `users.repository.ts` to include `email` in the search results:

```typescript
export const searchUsers = async (query: string, currentUserId: string) => {
  return await prisma.user.findMany({
    where: {
      AND: [
        { OR: [
          { username: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ]},
        { id: { not: currentUserId } },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,      // <-- ADD email to search results
      avatarUrl: true,
    },
    take: 10,
  });
};
```

### Server: Add `findUserByEmail` Repository Method

```typescript
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
};
```
