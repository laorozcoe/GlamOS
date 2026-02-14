-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "employeeId" TEXT;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
