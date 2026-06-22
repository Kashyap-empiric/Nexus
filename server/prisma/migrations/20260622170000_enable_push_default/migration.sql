-- Enable push notifications by default for all users
ALTER TABLE "User" ALTER COLUMN "pushNotificationsEnabled" SET DEFAULT true;

-- Backfill existing users who have push disabled
UPDATE "User" SET "pushNotificationsEnabled" = true WHERE "pushNotificationsEnabled" = false;
