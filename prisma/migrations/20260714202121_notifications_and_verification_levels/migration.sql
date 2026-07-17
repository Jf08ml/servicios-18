-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('QUICK', 'FULL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT', 'BOOKING', 'VERIFICATION', 'REVIEW', 'REPORT', 'SOS', 'SYSTEM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullVerificationRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "level" "VerificationLevel" NOT NULL DEFAULT 'FULL',
ALTER COLUMN "fullName" DROP NOT NULL,
ALTER COLUMN "docType" DROP NOT NULL,
ALTER COLUMN "docNumber" DROP NOT NULL,
ALTER COLUMN "docImagePath" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
