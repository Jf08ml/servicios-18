-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "serviceName" TEXT;

-- CreateTable
CREATE TABLE "ServiceType" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceType_workerId_idx" ON "ServiceType"("workerId");

-- AddForeignKey
ALTER TABLE "ServiceType" ADD CONSTRAINT "ServiceType_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
