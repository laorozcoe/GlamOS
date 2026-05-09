"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";

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

  const { name, phone, email, address, mpAccessToken, mpStoreId, openHour, closeHour, weekStartDay } = data;

  const updated = await prisma.business.update({
    where: { id: businessCtx.id },
    data: {
      name,
      phone,
      email,
      address,
      mpAccessToken,
      mpStoreId,
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
