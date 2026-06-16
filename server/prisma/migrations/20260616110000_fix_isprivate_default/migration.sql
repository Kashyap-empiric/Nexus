-- Fix contradictory defaults: isPrivate now matches visibility @default(PUBLIC)
ALTER TABLE "Conversation" ALTER COLUMN "isPrivate" SET DEFAULT false;
