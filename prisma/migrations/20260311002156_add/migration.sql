-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL DEFAULT 'MX';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL DEFAULT 'MX';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL DEFAULT 'MX';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL DEFAULT 'MX';
