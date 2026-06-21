"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";

const SIMULATE = process.env.MP_SIMULATE === "true";

const SIM_DEVICES = [
  { id: "SIM_NEWLAND__N950DEMO0001", operating_mode: "PDV" },
  { id: "SIM_PAX__A910DEMO0002", operating_mode: "STANDALONE" },
];

async function getMpToken() {
  const ctx = await getBusiness();
  if (!ctx) throw new Error("No business found");
  const biz = await prisma.business.findUnique({
    where: { id: ctx.id },
    select: { mpAccessToken: true },
  });
  return biz?.mpAccessToken ?? null;
}

// Lista las terminales registradas en la cuenta de MercadoPago del negocio.
export async function listMpDevices(): Promise<{ devices?: any[]; error?: string }> {
  if (SIMULATE) return { devices: SIM_DEVICES };

  const token = await getMpToken();
  if (!token) return { error: "No hay Access Token de MercadoPago configurado. Guárdalo primero." };

  const res = await fetch("https://api.mercadopago.com/point/integration-api/devices", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) return { error: data?.message || "Error al listar terminales" };
  return { devices: data.devices ?? [] };
}

// Cambia el modo de operación de una terminal (PDV = integrada | STANDALONE = independiente).
// Requiere reiniciar la terminal para que tome efecto.
export async function changeMpDeviceMode(
  deviceId: string,
  operating_mode: "PDV" | "STANDALONE"
): Promise<{ operating_mode?: string; error?: string }> {
  if (SIMULATE) return { operating_mode };

  const token = await getMpToken();
  if (!token) return { error: "No hay Access Token de MercadoPago configurado." };

  const res = await fetch(
    `https://api.mercadopago.com/point/integration-api/devices/${deviceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ operating_mode }),
    }
  );
  const data = await res.json();
  if (!res.ok) return { error: data?.message || "Error al cambiar el modo" };
  return { operating_mode: data.operating_mode ?? operating_mode };
}

export async function getBusinessSettings() {
  const businessCtx = await getBusiness();
  if (!businessCtx) throw new Error("No business found");

  const business = await prisma.business.findUnique({
    where: { id: businessCtx.id },
    include: {
      terminals: {
        where: { active: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  // themeColors requires a raw query until prisma generate runs (DLL locked by dev server)
  const raw = await prisma.$queryRaw<{ themeColors: unknown }[]>`
    SELECT "themeColors" FROM "Business" WHERE id = ${businessCtx.id}
  `;

  return { ...business, themeColors: raw[0]?.themeColors ?? null };
}

export async function updateThemeColors(themeColors: Record<string, string>) {
  const businessCtx = await getBusiness();
  if (!businessCtx) throw new Error("No business found");

  await prisma.$executeRawUnsafe(
    `UPDATE "Business" SET "themeColors" = $1::jsonb WHERE id = $2`,
    JSON.stringify(themeColors),
    businessCtx.id
  );

  revalidatePath("/settings");
}

export async function updateBusinessSettings(data: any) {
  const businessCtx = await getBusiness();
  if (!businessCtx) throw new Error("No business found");

  const { name, phone, email, address, mpAccessToken, mpStoreId, mpWebhookSecret, openHour, closeHour, weekStartDay } = data;

  const updated = await prisma.business.update({
    where: { id: businessCtx.id },
    data: {
      name,
      phone,
      email,
      address,
      mpAccessToken,
      mpStoreId,
      mpWebhookSecret,
      openHour: Number(openHour),
      closeHour: Number(closeHour),
      weekStartDay: Number(weekStartDay)
    }
  });

  revalidatePath("/settings");
  return updated;
}

export async function getActiveTerminals() {
  const businessCtx = await getBusiness();
  if (!businessCtx) throw new Error("No business found");

  return prisma.paymentTerminal.findMany({
    where: { businessId: businessCtx.id, active: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function savePaymentTerminals(terminals: any[]) {
  const businessCtx = await getBusiness();
  if (!businessCtx) throw new Error("No business found");

  // Soft delete all active terminals not in the payload
  const incomingIds = terminals.map((t) => t.id).filter(Boolean);
  
  await prisma.paymentTerminal.updateMany({
    where: {
      businessId: businessCtx.id,
      id: { notIn: incomingIds }
    },
    data: { active: false }
  });

  // Upsert the remaining
  for (const t of terminals) {
    if (t.id) {
       await prisma.paymentTerminal.update({
         where: { id: t.id },
         data: {
           name: t.name,
           posId: t.posId,
           isDefault: t.isDefault
         }
       });
    } else {
       await prisma.paymentTerminal.create({
         data: {
           businessId: businessCtx.id,
           name: t.name,
           posId: t.posId,
           isDefault: t.isDefault
         }
       });
    }
  }

  revalidatePath("/settings");
  return { success: true };
}
