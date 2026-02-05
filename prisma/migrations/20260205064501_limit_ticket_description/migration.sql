/*
  Warnings:

  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_businessId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "paymentStatus" "PaymentState" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "paidAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
ALTER COLUMN "businessId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "descriptionTicket" VARCHAR(15);

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
