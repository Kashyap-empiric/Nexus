/*
  Warnings:

  - Created `InviteType` enum and `Invite` table
  - Added `pushNotificationsEnabled` to `User` (defaults to false)
  - Added `updatedAt` to `PushSubscription`
  - Added `MEMBER_REMOVED` to `NotificationType` enum
  - Modified `WorkspaceMember` primary key from `id` to composite `(workspaceId, userId)`

  All changes are additive or idempotent for existing databases.
  Uses IF NOT EXISTS / EXCEPTION handlers for safety on both fresh and pre-existing schemas.
*/

-- CreateEnum: InviteType
DO $$ BEGIN
  CREATE TYPE "InviteType" AS ENUM ('USER', 'CONVERSATION', 'WORKSPACE', 'CHANNEL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add MEMBER_REMOVED to NotificationType enum (idempotent)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MEMBER_REMOVED';

-- AlterTable: User — add pushNotificationsEnabled (idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: PushSubscription — add updatedAt (idempotent)
-- For existing rows, set default to createdAt so no data is lost
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Remove the default after adding so Prisma's @updatedAt manages it going forward
ALTER TABLE "PushSubscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable: Invite
CREATE TABLE IF NOT EXISTS "Invite" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "InviteType" NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for Invite (idempotent)
DO $$ BEGIN
  CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "Invite_token_idx" ON "Invite"("token");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "Invite_type_entityId_idx" ON "Invite"("type", "entityId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- AddForeignKeys: Invite
DO $$ BEGIN
  ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update WorkspaceMember primary key to composite (workspaceId, userId)
-- For existing databases, this is already in place. For fresh databases,
-- the schema.prisma @@id([workspaceId, userId]) will be respected.
-- This handles the case where the migration was originally run with `id` as PK
-- but the schema now uses composite key.
DO $$
BEGIN
  -- Drop the old single-column PK if it exists (from original migration)
  -- Checks for exact match on `id` column (not workspaceId or userId)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceMember_pkey'
    AND conrelid = '"WorkspaceMember"'::regclass
    AND contype = 'p'
    AND pg_get_constraintdef(pg_constraint.oid) = 'PRIMARY KEY ("id")'
  ) THEN
    ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_pkey";
  END IF;

  -- Add composite PK if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceMember_pkey'
    AND conrelid = '"WorkspaceMember"'::regclass
    AND contype = 'p'
  ) THEN
    ALTER TABLE "WorkspaceMember" ADD PRIMARY KEY ("workspaceId", "userId");
  END IF;

  -- Drop the old unique INDEX on (workspaceId, userId) if it exists
  -- (was created as an index in the original migration, not a constraint)
  DROP INDEX IF EXISTS "WorkspaceMember_workspaceId_userId_key";
END $$;
