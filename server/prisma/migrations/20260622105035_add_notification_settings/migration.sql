-- Add missing WORKSPACE_DELETED enum value if it doesn't exist
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WORKSPACE_DELETED';

-- Add new granular notification settings to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviteNotifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "replyNotifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "workspaceActivityNotifications" BOOLEAN NOT NULL DEFAULT true;
