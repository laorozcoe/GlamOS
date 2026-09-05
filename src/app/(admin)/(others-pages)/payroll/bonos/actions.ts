"use server";

import prisma from "@/lib/prisma2";
import { requireBusiness } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { BonusType } from "@prisma/client";

export type DatosBono = {
  id?: string;
  name: string;
  description?: string | null;
  type: BonusType;
  amount: number;
  goal?: number | null;
  maxLates?: number;
  maxAbsences?: number;
  active?: boolean;
};

/**
 * Los bonos que aplican a cada tipo se guardan distinto, y dejar basura en los
 * campos que no corresponden confunde despues al motor de calculo: un bono de
 * puntualidad con una meta de 40 no significa nada.
 */
function limpiarSegunTipo(datos: DatosBono) {
  const esMeta = datos.type === "SERVICES" || datos.type === "REVENUE" || datos.type === "CLIENTS";
  const esPuntualidad = datos.type === "PUNCTUALITY";

  return {
    name: datos.name.trim(),
    description: datos.description?.trim() || null,
    type: datos.type,
    amount: Math.max(0, Number(datos.amount) || 0),
    goal: esMeta ? Math.max(0, Number(datos.goal) || 0) : null,
    maxLates: esPuntualidad ? Math.max(0, Number(datos.maxLates) || 0) : 0,
    maxAbsences: esPuntualidad ? Math.max(0, Number(datos.maxAbsences) || 0) : 0,
    active: datos.active ?? true,
  };
}

function validar(datos: ReturnType<typeof limpiarSegunTipo>) {
  if (!datos.name) throw new Error("El bono necesita un nombre.");
  if (datos.amount <= 0) throw new Error("El monto del bono debe ser mayor a cero.");
  const esMeta = datos.type === "SERVICES" || datos.type === "REVENUE" || datos.type === "CLIENTS";
  if (esMeta && (!datos.goal || datos.goal <= 0)) {
    throw new Error("Un bono por meta necesita una meta mayor a cero.");
  }
}

export async function getBonusRules() {
  const business = await requireBusiness(["ADMIN"]);
  if (!business) throw new Error("No business found");

  return prisma.bonusRule.findMany({
    where: { businessId: business.id },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createBonusRule(datos: DatosBono) {
  const business = await requireBusiness(["ADMIN"]);
  if (!business) throw new Error("No business found");

  const limpio = limpiarSegunTipo(datos);
  validar(limpio);

  const creado = await prisma.bonusRule.create({
    data: { ...limpio, businessId: business.id },
  });

  revalidatePath("/payroll/bonos");
  return creado;
}

export async function updateBonusRule(id: string, datos: DatosBono) {
  const business = await requireBusiness(["ADMIN"]);
  if (!business) throw new Error("No business found");

  const limpio = limpiarSegunTipo(datos);
  validar(limpio);

  // El where lleva businessId ademas del id: una Server Action es un endpoint
  // publico, y sin eso bastaria con mandar el id de un bono de otro salon.
  const { count } = await prisma.bonusRule.updateMany({
    where: { id, businessId: business.id },
    data: limpio,
  });
  if (count === 0) throw new Error("Ese bono no existe en este salón.");

  revalidatePath("/payroll/bonos");
  return { ok: true };
}

/**
 * Borra el bono si nunca se otorgó. Si ya se usó en algún periodo, no se borra:
 * eso reescribiria nominas pasadas. En ese caso se apaga, que es lo que de
 * verdad se quiere -dejar de aplicarlo de aqui en adelante-.
 */
export async function deleteBonusRule(id: string) {
  const business = await requireBusiness(["ADMIN"]);
  if (!business) throw new Error("No business found");

  const regla = await prisma.bonusRule.findFirst({
    where: { id, businessId: business.id },
    select: { id: true, _count: { select: { awards: true } } },
  });
  if (!regla) throw new Error("Ese bono no existe en este salón.");

  if (regla._count.awards > 0) {
    await prisma.bonusRule.update({ where: { id: regla.id }, data: { active: false } });
    revalidatePath("/payroll/bonos");
    return { ok: true, desactivado: true };
  }

  await prisma.bonusRule.delete({ where: { id: regla.id } });
  revalidatePath("/payroll/bonos");
  return { ok: true, desactivado: false };
}

export async function toggleBonusRule(id: string, active: boolean) {
  const business = await requireBusiness(["ADMIN"]);
  if (!business) throw new Error("No business found");

  const { count } = await prisma.bonusRule.updateMany({
    where: { id, businessId: business.id },
    data: { active },
  });
  if (count === 0) throw new Error("Ese bono no existe en este salón.");

  revalidatePath("/payroll/bonos");
  return { ok: true };
}
