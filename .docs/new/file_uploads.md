# Chat Attachments & Generalized File Uploads

This document outlines the architecture and implementation plan for generalizing our file upload infrastructure to support file and image attachments in the chat system.

## 1. Supabase Storage Architecture

Currently, we only have a `public` bucket named `avatars`. For chat attachments, we need a secure `private` bucket to ensure unauthorized users cannot access files from conversations they are not part of.

- **Bucket Name:** `attachments` (Private)
- **Folder Structure:** `${conversationId}/${uuid()}-${filename}`
- **Security (RLS):**
  - **Insert:** Authenticated users can upload if they are a member of the conversation.
  - **Select:** Authenticated users can read if they are a member of the conversation.
  - **Access Strategy:** Because Supabase Storage RLS policies can be complex to join with Prisma tables, we will use backend-signed URLs. The client will request a temporary signed URL from our backend (`/api/messages/attachments/:id`) which will perform the authorization check against Prisma before returning the URL.

## 2. Database Schema Upgrades (Prisma)

We need to associate attachments with chat messages. A one-to-many relationship is the cleanest approach.

```prisma
model Message {
  id             String       @id @default(cuid())
  content        String?      // Can be optional if message is just a file
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id])
  
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  // New Relation
  attachments    Attachment[]
}

model Attachment {
  id         String   @id @default(cuid())
  messageId  String
  message    Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  filePath   String   // The path in the Supabase bucket
  fileName   String   // Original file name (e.g., "report.pdf")
  fileType   String   // MIME type (e.g., "image/png" or "application/pdf")
  fileSize   Int      // Size in bytes
  
  // Optional metadata for images
  width      Int?
  height     Int?
  
  createdAt  DateTime @default(now())
}
```

## 3. Client Upload Utility Refactoring

The current `uploadAvatar` function in `client/src/shared/lib/upload.ts` will be abstracted into a highly reusable `uploadFile` utility.

```typescript
type UploadConfig = {
  bucket: "avatars" | "attachments";
  pathPrefix: string;  // e.g. userId or conversationId
  maxSizeMB?: number;
  allowedTypes?: string[]; // e.g. ["image/*", "application/pdf"]
  oldPath?: string | null;
}

export async function uploadFile(file: File, config: UploadConfig): Promise<string> {
  // 1. Generic size and MIME type validation
  // 2. Generate secure path: `${config.pathPrefix}/${uuid()}-${file.name}`
  // 3. Upload to supabase.storage.from(config.bucket)
  // 4. Return the storage path
}
```

## 4. Backend Service Updates

- **Send Message API:** Update `POST /api/messages` to accept an optional `attachments` array containing metadata (path, name, type, size) from the client's direct Supabase upload.
- **Message Repository:** Wrap the message creation and attachment creation in a Prisma `$transaction`.
- **Signed URL API:** Create a new endpoint `GET /api/attachments/:id/url` that validates if `req.user.id` is in the `Attachment.message.conversation.members` list. If authorized, use Supabase Admin client to generate a 1-hour signed URL and return it.

## 5. User Interface Implementation

### 5.1 Chat Input Area
- Add a generic `<FileUpload />` button (paperclip icon) to the input bar.
- Support drag-and-drop file zones over the chat window.
- Add a staging area above the text input showing thumbnail previews of files currently queued for upload.

### 5.2 Message Bubbles
- Update `MessageItem.tsx` to detect and render `attachments`.
- **Images:** Render as inline image grids. Clicking an image opens a full-screen Lightbox.
- **Other Files:** Render as downloadable file cards showing the filename, extension icon, and file size (e.g., `invoice.pdf • 2.4 MB`).

## Implementation Checklist

- [ ] Create `attachments` bucket via Supabase SQL dashboard.
- [ ] Update `schema.prisma` with `Attachment` model and run migration.
- [ ] Refactor `upload.ts` for generic file uploads.
- [ ] Update Message backend routes/services to handle attachment payloads.
- [ ] Build `/api/attachments/:id/url` endpoint for signed URL retrieval.
- [ ] Update Socket payloads to broadcast messages with attachments.
- [ ] Implement Drag-and-Drop and upload buttons in `ChatInput`.
- [ ] Implement UI rendering for attachments in `MessageItem`.
