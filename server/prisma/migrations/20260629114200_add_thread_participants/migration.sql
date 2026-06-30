-- CreateEnum
CREATE TYPE "ThreadNotificationLevel" AS ENUM ('ALL', 'MENTIONS', 'MUTED');

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_userId_fkey";

-- CreateTable
CREATE TABLE "ThreadParticipant" (
    "threadRootId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isFollowing" BOOLEAN NOT NULL DEFAULT true,
    "notificationLevel" "ThreadNotificationLevel" NOT NULL DEFAULT 'ALL',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("threadRootId","userId")
);

-- CreateIndex
CREATE INDEX "ThreadParticipant_userId_idx" ON "ThreadParticipant"("userId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadRootId_fkey" FOREIGN KEY ("threadRootId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill subscriptions for thread root authors
INSERT INTO "ThreadParticipant" ("threadRootId", "userId", "isFollowing", "notificationLevel", "joinedAt")
SELECT "id", "userId", true, 'ALL', "createdAt"
FROM "Message"
WHERE "threadReplyCount" > 0 AND "userId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill subscriptions for thread repliers
INSERT INTO "ThreadParticipant" ("threadRootId", "userId", "isFollowing", "notificationLevel", "joinedAt")
SELECT "threadRootId", "userId", true, 'ALL', "createdAt"
FROM "Message"
WHERE "threadRootId" IS NOT NULL AND "userId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill subscriptions for mentioned users in threads
INSERT INTO "ThreadParticipant" ("threadRootId", "userId", "isFollowing", "notificationLevel", "joinedAt")
SELECT m."threadRootId", mm."userId", true, 'ALL', m."createdAt"
FROM "Message" m
JOIN "MessageMention" mm ON m."id" = mm."messageId"
WHERE m."threadRootId" IS NOT NULL
ON CONFLICT DO NOTHING;
