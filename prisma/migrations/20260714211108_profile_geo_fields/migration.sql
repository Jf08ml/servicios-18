-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "countryName" TEXT,
ADD COLUMN     "stateCode" TEXT,
ADD COLUMN     "stateName" TEXT;

-- CreateIndex
CREATE INDEX "Profile_countryCode_stateCode_city_idx" ON "Profile"("countryCode", "stateCode", "city");
