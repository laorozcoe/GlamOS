-- Indices por businessId + fecha
--
-- Ninguna tabla tenia @@index sobre businessId, pese a que practicamente
-- todas las consultas de la app filtran por businessId y un rango de fechas
-- (nomina, reportes, corte de caja, resumen diario, agenda). Con pocos
-- registros no se nota; el costo crece con cada negocio nuevo.
--
-- Se usa CREATE INDEX CONCURRENTLY para no bloquear escrituras en produccion.
-- CONCURRENTLY no puede ir dentro de una transaccion, por lo que este archivo
-- NO se aplica con `prisma migrate` (que envuelve todo en una transaccion).
-- Aplicar a mano:
--
--   psql "$DATABASE_URL_UNPOOLED" -f prisma/manual/20260905_add_business_indexes.sql
--
-- Los nombres coinciden con los que genera Prisma a partir de los @@index del
-- schema, para que una futura `prisma migrate dev` los detecte ya existentes.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Appointment_businessId_start_idx" ON "Appointment" ("businessId", "start");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Appointment_employeeId_start_idx" ON "Appointment" ("employeeId", "start");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Sale_businessId_createdAt_idx" ON "Sale" ("businessId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Sale_employeeId_createdAt_idx" ON "Sale" ("employeeId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Sale_mpPaymentId_idx" ON "Sale" ("mpPaymentId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Payment_businessId_createdAt_idx" ON "Payment" ("businessId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Payment_saleId_idx" ON "Payment" ("saleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Employee_businessId_active_idx" ON "Employee" ("businessId", "active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Service_businessId_active_idx" ON "Service" ("businessId", "active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ServiceCategory_businessId_active_idx" ON "ServiceCategory" ("businessId", "active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_businessId_active_idx" ON "Product" ("businessId", "active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductCategory_businessId_active_idx" ON "ProductCategory" ("businessId", "active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Promotion_businessId_active_idx" ON "Promotion" ("businessId", "active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PaymentTerminal_businessId_active_idx" ON "PaymentTerminal" ("businessId", "active");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "CashClose_businessId_closingDate_idx" ON "CashClose" ("businessId", "closingDate");
