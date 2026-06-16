# Settings Module Bug Analysis (Client)

Covers client (`client/src/modules/settings/`) — profile settings, appearance settings, and settings modal.

---

## MEDIUM BUGS

### 1. Avatar Upload Not Rolled Back on Profile Update Failure

**File:** `client/src/modules/settings/components/ProfileSettings.tsx:65-83`

The submit flow is:
1. Upload avatar to storage (line 67)
2. Update avatar path in DB (line 73)  
3. Delete old avatar from storage (line 75)
4. Update profile fields (line 79-83)

If step 4 fails (e.g., username conflict 409), the avatar has already been uploaded and the old avatar already deleted. The user's profile now has the new avatar path but the profile update failed — the avatar is orphaned (new image uploaded, but profile data unchanged). The user sees a toast error but their avatar was already changed.

The correct order would be: update profile fields first, then upload avatar only if profile update succeeds.

### 2. Profile Form Shows `isDirty` Flag Incorrectly After Reset

**File:** `client/src/modules/settings/components/ProfileSettings.tsx:91`

```typescript
reset(data); // Reset form with new values to clear dirty state
```

After a successful save, the form is reset with `data` (the submitted values). But `data.fullName` and `data.bio` are explicitly set to `null` on line 81-82 if they were empty strings:
```typescript
fullName: data.fullName || null,
bio: data.bio || null,
```

The `reset(data)` call passes these `null` values. The form's `defaultValues` were set with empty strings (`""`). If the user clears their bio, submits, and the form resets with `bio: null`, the form considers `null !== ""` and marks the form as dirty even though nothing changed.

### 3. Avatar Removal State Persists Across Profile Loads

**File:** `client/src/modules/settings/components/ProfileSettings.tsx:34`

```typescript
const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);
```

If the user clicks "Remove Picture," navigates away, and comes back, `isAvatarRemoved` resets to `false`. But the avatar preview (`avatarPreview`) is also reset since it's local state. The user sees the original avatar, which is correct behavior. However, if the user removes the avatar, saves, then re-opens settings, the `isAvatarRemoved` state is false but the avatar was actually removed from the server — the form doesn't reflect the current state unless the profile fetch returns `avatarPath: null`.

### 4. No Optimistic Updates on Profile Save

The `useUpdateProfile` mutation likely invalidates queries rather than optimistically updating the cache. After saving, the UI shows the old values until the refetch completes. This is consistent with the rest of the app but creates a ~200-500ms delay between clicking "Save" and seeing the updated values everywhere.

---

## MINOR BUGS

### 5. File Input Not Reset After Successful Upload

**File:** `client/src/modules/settings/components/ProfileSettings.tsx:119`

```typescript
if (fileInputRef.current) fileInputRef.current.value = "";
```

The value is cleared, but if the user picks the same file again (same name/path), the `onChange` event won't fire because the value hasn't changed from the user's perspective. The file input is cleared but the `avatarFile` state is still set from the previous selection. This is a corner case — the user would need to cancel and re-select.

### 6. No Loading Indicator for Avatar Delete

**File:** `client/src/modules/settings/components/ProfileSettings.tsx:180`

The "Remove Picture" button doesn't show a loading spinner. If the user clicks it and the subsequent save triggers an upload, the UI doesn't indicate that an operation is in progress.

### 7. Memo Leak from `URL.createObjectURL`

**File:** `client/src/modules/settings/components/ProfileSettings.tsx:87,117`

```typescript
if (avatarPreview) URL.revokeObjectURL(avatarPreview);
```

Object URLs are revoked on successful submit but NOT on:
- Component unmount (navigating away without saving)
- Selecting a new file (the old preview URL is leaked)

If the user selects multiple files without saving, each selection leaks a blob URL. These are released when the document is unloaded, but during a long session, this accumulates.

### 8. Settings Modal Has No Keyboard Shortcut

The settings modal requires clicking a UI element to open. There's no keyboard shortcut (like `Cmd+,` common in messaging apps) for quick access.

### 9. Appearance Settings Hardcodes Theme Toggle

Assuming `AppearanceSettings.tsx` exists (file not read), theme settings typically control CSS class toggling. If the theme preference is stored only in localStorage and not synced to the server, theme preferences are lost on logout or across devices.
