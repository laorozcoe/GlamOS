/*
  Warnings:

  - You are about to drop the column `date` on the `Appointment` table. All the data in the column will be lost.
  - Added the required column `end` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "date",
ADD COLUMN     "allDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "start" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
