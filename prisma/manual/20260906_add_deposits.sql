-- Anticipos: venta abierta desde que se agenda
--
-- Al dar un anticipo se crea la venta con folio y el anticipo como su primer
-- pago. El dia de la cita se le agrega el pago del resto a esa MISMA venta,
-- que pasa a COMPLETED. Una sola venta y dos pagos: el corte de caja de cada
-- dia cuadra solo -suma pagos por su fecha- y el historial del cliente queda
-- completo en vez de partido en dos.
--
-- Migracion ADITIVA: un valor de enumerado y dos columnas con valor por
-- omision. Ninguna fila existente cambia de significado: todas las ventas de
-- hoy siguen COMPLETED y ningun pago es anticipo.
--
-- Aplicar:
--
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_deposits.sql
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_deposits.sql --aplicar
--
-- Despues: npx prisma generate

-- Venta abierta: se agendo y hay anticipo, pero el servicio no se ha dado.
-- Queda FUERA de reportes, nomina y comisiones, que filtran por COMPLETED:
-- la comision se gana cuando se hace el trabajo, no cuando se aparta.
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- Distingue el anticipo del pago final dentro de la misma venta. Sin esto,
-- despues de cobrar el resto no habria forma de saber cual de los dos pagos
-- fue el anticipo, y el ticket y el historial no podrian explicarlo.
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "isDeposit" BOOLEAN NOT NULL DEFAULT false;

-- Si este salon pide anticipo al agendar. Apagado por omision: quien no los
-- use no ve ningun paso nuevo.
ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "askDepositOnBooking" BOOLEAN NOT NULL DEFAULT false;
