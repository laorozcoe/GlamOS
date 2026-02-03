/*
  Warnings:

  - You are about to drop the column `category` on the `Service` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceVariant" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceExtra" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "durationMin" INTEGER,
    "durationMax" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentExtra" (
    "id" TEXT NOT NULL,
    "appointmentServiceId" TEXT NOT NULL,
    "extraId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "AppointmentExtra_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceVariant" ADD CONSTRAINT "ServiceVariant_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceExtra" ADD CONSTRAINT "ServiceExtra_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentExtra" ADD CONSTRAINT "AppointmentExtra_appointmentServiceId_fkey" FOREIGN KEY ("appointmentServiceId") REFERENCES "AppointmentService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentExtra" ADD CONSTRAINT "AppointmentExtra_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "ServiceExtra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
