-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "impersonatorId" TEXT;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_impersonatorId_fkey" FOREIGN KEY ("impersonatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
