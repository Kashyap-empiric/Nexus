DO $$ 
BEGIN
  -- Add missing columns if they don't exist
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "channelNotifications" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dmNotifications" BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOnboarded" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mentionNotifications" BOOLEAN NOT NULL DEFAULT true;

  -- Rename displayName to fullName if it exists, otherwise add fullName
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'displayName') THEN
    ALTER TABLE "User" RENAME COLUMN "displayName" TO "fullName";
  ELSE
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
  END IF;
END $$;
