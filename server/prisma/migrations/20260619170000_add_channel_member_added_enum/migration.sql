-- Add CHANNEL_MEMBER_ADDED to NotificationType enum
-- This is a safe operation that doesn't affect existing data.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHANNEL_MEMBER_ADDED';
