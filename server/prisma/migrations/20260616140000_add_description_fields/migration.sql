-- Add `description` column to Conversation and Workspace tables
-- The Prisma schema defines these as optional String?, so the column is nullable.

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "description" TEXT;
