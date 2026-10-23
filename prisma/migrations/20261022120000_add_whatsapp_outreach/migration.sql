-- CreateEnum
CREATE TYPE "WhatsappOutreachStatus" AS ENUM ('INVITED', 'LINK_SENT', 'OPTED_OUT', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappOutreach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "WhatsappOutreachStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "invitedAt" TIMESTAMP(3),
    "linkSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_tokenHash_key" ON "LoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LoginToken_userId_idx" ON "LoginToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappOutreach_userId_key" ON "WhatsappOutreach"("userId");

-- CreateIndex
CREATE INDEX "WhatsappOutreach_phone_idx" ON "WhatsappOutreach"("phone");

-- CreateIndex
CREATE INDEX "WhatsappOutreach_invitedAt_idx" ON "WhatsappOutreach"("invitedAt");

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappOutreach" ADD CONSTRAINT "WhatsappOutreach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: toda cuenta existente se da por reclamada, EXCEPTO las profesionales
-- creadas por la carga masiva (verificadas por el equipo sin pasar por
-- Verification) que no pertenecen a una agencia. Esas quedan con claimedAt NULL
-- y son las que reciben el aviso por WhatsApp.
UPDATE "User" SET "claimedAt" = "createdAt"
WHERE NOT (
  "role" = 'WORKER'
  AND "verifiedAt" IS NOT NULL
  AND "agencyId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Verification" v WHERE v."userId" = "User"."id")
);
