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

  return business;
}

export async function updateBusinessSettings(data: any) {
  const businessCtx = await getBusiness();
  if (!businessCtx) throw new Error("No business found");

  const { name, phone, email, address, mpAccessToken, mpStoreId } = data;

  const updated = await prisma.business.update({
    where: { id: businessCtx.id },
    data: {
      name,
      phone,
      email,
      address,
      mpAccessToken,
      mpStoreId,
    }
  });

  revalidatePath("/settings");
  return updated;
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
