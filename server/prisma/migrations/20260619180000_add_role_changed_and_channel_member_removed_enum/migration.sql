-- Add ROLE_CHANGED and CHANNEL_MEMBER_REMOVED to NotificationType enum
-- This is a safe operation that doesn't affect existing data.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROLE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHANNEL_MEMBER_REMOVED';
