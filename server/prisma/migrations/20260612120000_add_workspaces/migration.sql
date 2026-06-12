/*
  Warnings:

  - Added `createdBy` to `Conversation` (nullable — existing rows unaffected)
  - Added `visibility` to `Conversation` (defaults to PUBLIC)
  - Added `latestMessageId` to `Conversation` (nullable — for tracking latest message per conversation)
  - Created `Workspace`, `WorkspaceMember`, `Notification`, `PushSubscription` tables
  - Created `ChannelVisibility`, `WorkspaceRole`, `NotificationType` enums

  All changes are additive. No columns/tables are dropped or altered.
  Existing data is preserved.
  Idempotent: uses IF NOT EXISTS / EXCEPTION handlers for safety on both clean and pre-existing schemas.
*/

-- CreateEnum: ChannelVisibility
DO $$ BEGIN
  CREATE TYPE "ChannelVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: WorkspaceRole
DO $$ BEGIN
  CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: NotificationType
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('INVITE_RECEIVED', 'INVITE_ACCEPTED', 'MEMBER_JOINED', 'CHANNEL_CREATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Conversation — add new columns (all nullable / have defaults)
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "visibility" "ChannelVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "latestMessageId" TEXT;

-- CreateTable: Workspace
CREATE TABLE IF NOT EXISTS "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkspaceMember
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "imageUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PushSubscription
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes (PG uses duplicate_table/42P07 for duplicate index relations)
DO $$ BEGIN
  CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- AddForeignKeys: Conversation
DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_latestMessageId_fkey" FOREIGN KEY ("latestMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKeys: Workspace
DO $$ BEGIN
  ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKeys: WorkspaceMember
DO $$ BEGIN
  ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKeys: Notification
DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKeys: PushSubscription
DO $$ BEGIN
  ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
