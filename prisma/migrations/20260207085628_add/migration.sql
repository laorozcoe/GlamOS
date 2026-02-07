-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "paymentStatus" "PaymentState" NOT NULL DEFAULT 'UNPAID';
