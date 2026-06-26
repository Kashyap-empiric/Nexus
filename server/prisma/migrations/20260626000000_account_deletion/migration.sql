-- Add isDeleting to User
ALTER TABLE "User" ADD COLUMN "isDeleting" BOOLEAN NOT NULL DEFAULT false;

-- Add isDeleting to Workspace
ALTER TABLE "Workspace" ADD COLUMN "isDeleting" BOOLEAN NOT NULL DEFAULT false;

-- Add snapshot columns to Message (nullable for migration, will be made NOT NULL after backfill)
ALTER TABLE "Message" ADD COLUMN "displayNameSnapshot" TEXT;
ALTER TABLE "Message" ADD COLUMN "avatarSnapshot" TEXT;

-- Backfill displayNameSnapshot with the user's current username for existing messages
UPDATE "Message" SET "displayNameSnapshot" = "User"."username"
FROM "User"
WHERE "Message"."userId" = "User"."id";

-- Backfill avatarSnapshot with the user's current avatarUrl for existing messages
UPDATE "Message" SET "avatarSnapshot" = "User"."avatarUrl"
FROM "User"
WHERE "Message"."userId" = "User"."id";

-- Make displayNameSnapshot NOT NULL (now that all existing rows are backfilled)
ALTER TABLE "Message" ALTER COLUMN "displayNameSnapshot" SET NOT NULL;

-- Drop the existing foreign key constraint on Message.userId (cascade delete)
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_userId_fkey";

-- Make userId nullable
ALTER TABLE "Message" ALTER COLUMN "userId" DROP NOT NULL;

-- Re-add the foreign key with SET NULL on delete
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL;
