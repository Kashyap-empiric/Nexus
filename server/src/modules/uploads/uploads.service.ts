import { createAttachment, getAttachmentById, deleteAttachment } from "./uploads.repository.js";
import type { UploadAttachmentBody } from "./uploads.schema.js";
import { AppError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/app-error.js";
import type { Attachment } from "@prisma/client";
import { verifyConversationMembership } from "@/shared/permissions.js";
import { ENV } from "@/config/env.js";
import { StorageService } from "./storage.service.js";

// Note: In a real implementation, we would also verify the Supabase upload exists 
// before creating the database record, but we'll assume the client upload is valid.

export async function processUpload(data: UploadAttachmentBody, userId: string): Promise<Attachment> {
  // Verify membership first
  const isMember = await verifyConversationMembership(userId, data.conversationId);
  if (!isMember) {
    throw new ForbiddenError("You are not a member of this conversation");
  }
  
  // Enforce secure storage path generation on the server
  const storagePath = `${userId}/${data.conversationId}/${data.fileName}`;
  return createAttachment(data, userId, storagePath);
}

export async function getAttachmentDownloadUrl(id: string, userId: string): Promise<string> {
  const attachment = await getAttachmentById(id);
  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  // Check if user is a member of the conversation where the file was uploaded
  const isMember = await verifyConversationMembership(userId, attachment.conversationId);
  if (!isMember) {
    throw new ForbiddenError("You are not a member of this conversation");
  }

  // Generate a signed URL for 1 hour using StorageService
  const urlMap = await StorageService.createSignedUrls("attachments", [attachment.storagePath], 3600);
  const signedURL = urlMap.get(attachment.storagePath);

  if (!signedURL) {
    throw new AppError(500, "Failed to generate download URL");
  }

  return signedURL;
}

export async function removeAttachment(id: string, userId: string): Promise<void> {
  const attachment = await getAttachmentById(id);
  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  if (attachment.createdBy !== userId) {
    throw new ForbiddenError("You can only delete your own uploads");
  }

  if (attachment.messageId) {
    throw new ConflictError("Cannot delete an attachment that is already linked to a message");
  }

  try {
    await StorageService.remove("attachments", [attachment.storagePath]);
  } catch (error) {
    throw new AppError(500, "Failed to delete attachment from storage");
  }

  await deleteAttachment(id);
}
