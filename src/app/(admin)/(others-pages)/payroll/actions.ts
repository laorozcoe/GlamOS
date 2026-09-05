"use server";

import prisma from "@/lib/prisma2";
import { requireBusiness, requireSession } from "@/lib/session";
import { calcularNomina, cerrarNomina, reabrirNomina } from "@/lib/nomina";
import { rangoSemana } from "@/lib/periodo";
import { revalidatePath } from "next/cache";

/**
 * La nomina de la semana que contiene la fecha recibida.
 *
 * El rango ya no llega desde la pantalla. Antes el cliente calculaba la
 * semana con `getDate() - getDay()`, o sea siempre de domingo a sabado, sin
 * importar el dia de corte que el salon hubiera elegido en Configuracion. Ese
 * corte lo decide ahora el servidor, que es donde vive el dato.
 */
export async function getPayrollData(referenceDateISO: string) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);
  if (!business) throw new Error("No business found");

  return calcularNomina(business.id, new Date(referenceDateISO));
}

/** El periodo se recalcula en el servidor a partir del dia de referencia. */
async function periodoDe(businessId: string, referenceDateISO: string) {
  const negocio = await prisma.business.findUnique({
    where: { id: businessId },
    select: { weekStartDay: true },
  });
  return rangoSemana(new Date(referenceDateISO), negocio?.weekStartDay ?? 1);
}

export type DatosOtorgamiento = {
  employeeId: string;
  ruleId: string;
  referenceDateISO: string;
  granted: boolean;
  /** Monto distinto al del catalogo. Vacio deja el del catalogo. */
  amount?: number | null;
  note?: string | null;
};

/**
 * Otorga o niega un bono a una persona en un periodo.
 *
 * Sirve para los dos casos: los bonos manuales -presentacion, atencion-, que
 * no tienen otra forma de decidirse, y las excepciones sobre los automaticos,
 * donde alguien contradice al calculo a sabiendas.
 *
 * El periodo NO llega del cliente: se recalcula aqui con el dia de corte del
 * salon. Una Server Action es un endpoint publico, y con el periodo abierto
 * se podria escribir sobre una semana distinta a la que se esta viendo.
 */
export async function setBonusAward(datos: DatosOtorgamiento) {
  const ctx = await requireSession(["ADMIN"]);
  const businessId = ctx.business.id;

  const regla = await prisma.bonusRule.findFirst({
    where: { id: datos.ruleId, businessId },
    select: { id: true, amount: true, type: true },
  });
  if (!regla) throw new Error("Ese bono no existe en este salón.");

  const empleado = await prisma.employee.findFirst({
    where: { id: datos.employeeId, businessId },
    select: { id: true },
  });
  if (!empleado) throw new Error("Esa persona no trabaja en este salón.");

  const nota = datos.note?.trim() || null;
  // Contradecir al calculo exige explicarlo: es lo que se lee despues, cuando
  // alguien pregunta por que una semana pago distinto.
  if (regla.type !== "MANUAL" && !nota) {
    throw new Error("Para cambiar un bono que el sistema ya calculó, escribe el motivo.");
  }

  await asegurarPeriodoAbierto(businessId, datos.referenceDateISO);

  const { inicio, fin } = await periodoDe(businessId, datos.referenceDateISO);
  const monto =
    datos.amount === null || datos.amount === undefined || Number.isNaN(Number(datos.amount))
      ? null
      : Math.max(0, Number(datos.amount));

  await prisma.bonusAward.upsert({
    where: {
      businessId_employeeId_ruleId_periodStart: {
        businessId,
        employeeId: datos.employeeId,
        ruleId: datos.ruleId,
        periodStart: inicio,
      },
    },
    update: {
      granted: datos.granted,
      amount: monto,
      note: nota,
      grantedById: ctx.employeeId,
    },
    create: {
      businessId,
      employeeId: datos.employeeId,
      ruleId: datos.ruleId,
      periodStart: inicio,
      periodEnd: fin,
      granted: datos.granted,
      amount: monto,
      note: nota,
      grantedById: ctx.employeeId,
    },
  });

  revalidatePath("/payroll");
  return { ok: true };
}

/** Quita la decision manual: el bono vuelve a lo que diga el calculo. */
export async function clearBonusAward(employeeId: string, ruleId: string, referenceDateISO: string) {
  const ctx = await requireSession(["ADMIN"]);
  const businessId = ctx.business.id;

  await asegurarPeriodoAbierto(businessId, referenceDateISO);

  const { inicio } = await periodoDe(businessId, referenceDateISO);

  await prisma.bonusAward.deleteMany({
    where: { businessId, employeeId, ruleId, periodStart: inicio },
  });

  revalidatePath("/payroll");
  return { ok: true };
}

/**
 * Cierra la semana: guarda lo pagado y deja de recalcularlo.
 *
 * Solo ADMIN, y el dia de referencia se convierte en periodo aqui con el dia
 * de corte del salon: cerrar es la operacion mas dificil de deshacer de toda
 * la nomina y no puede depender de un rango que llegue del formulario.
 */
export async function cerrarNominaAction(referenceDateISO: string) {
  const ctx = await requireSession(["ADMIN"]);
  return cerrarNomina(ctx.business.id, new Date(referenceDateISO), ctx.employeeId);
}

/** Reabre la semana. Lo guardado se borra y la nomina vuelve a calcularse. */
export async function reabrirNominaAction(referenceDateISO: string) {
  const ctx = await requireSession(["ADMIN"]);
  return reabrirNomina(ctx.business.id, new Date(referenceDateISO));
}

/**
 * Bloquea otorgar bonos sobre una semana ya cerrada. Se comprueba en las dos
 * acciones que escriben bonos, no solo en la pantalla.
 */
async function asegurarPeriodoAbierto(businessId: string, referenceDateISO: string) {
  const { inicio } = await periodoDe(businessId, referenceDateISO);
  const cerrado = await prisma.payrollPeriod.findUnique({
    where: { businessId_periodStart: { businessId, periodStart: inicio } },
    select: { id: true },
  });
  if (cerrado) {
    throw new Error("Esa semana ya está cerrada. Reábrela si necesitas cambiar un bono.");
  }
}
