/*
  Warnings:

  - You are about to drop the column `manicuristId` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `manicuristId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Manicurist` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `employeeId` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employeeId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_manicuristId_fkey";

-- DropForeignKey
ALTER TABLE "Manicurist" DROP CONSTRAINT "Manicurist_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Manicurist" DROP CONSTRAINT "Manicurist_userId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_manicuristId_fkey";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "manicuristId",
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "manicuristId",
ADD COLUMN     "employeeId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Manicurist";

-- CreateTable
CREATE TABLE "Employeet" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "bio" TEXT,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employeet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employeet_userId_key" ON "Employeet"("userId");

-- AddForeignKey
ALTER TABLE "Employeet" ADD CONSTRAINT "Employeet_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employeet" ADD CONSTRAINT "Employeet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employeet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employeet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
