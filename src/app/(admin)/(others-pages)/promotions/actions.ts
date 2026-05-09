"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";
import { ActivePromotion } from "@/lib/applyPromotions";

export interface PromotionRow {
  id: string;
  businessId: string;
  name: string;
  type: string;
  discountType: string | null;
  discountValue: number | null;
  buyQuantity: number;
  getQuantity: number;
  startDate: Date | string;
  endDate: Date | string;
  usedCount: number;
  active: boolean;
  createdAt: Date | string;
  services: { serviceId: string; role: string; serviceName: string }[];
}

async function fetchPromotionsWithServices(businessId: string): Promise<PromotionRow[]> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT p.id, p."businessId", p.name, p.type, p."discountType", p."discountValue",
            p."buyQuantity", p."getQuantity", p."startDate", p."endDate",
            p."usedCount", p.active, p."createdAt"
     FROM "Promotion" p
     WHERE p."businessId" = $1
     ORDER BY p."createdAt" DESC`,
    businessId
  )) as PromotionRow[];

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const svcRows = (await prisma.$queryRawUnsafe(
    `SELECT ps."promotionId", ps."serviceId", ps.role, s.name AS "serviceName"
     FROM "PromotionService" ps
     JOIN "Service" s ON s.id = ps."serviceId"
     WHERE ps."promotionId" IN (${placeholders})`,
    ...ids
  )) as { promotionId: string; serviceId: string; role: string; serviceName: string }[];

  const svcByPromo = new Map<string, { serviceId: string; role: string; serviceName: string }[]>();
  for (const s of svcRows) {
    if (!svcByPromo.has(s.promotionId)) svcByPromo.set(s.promotionId, []);
    svcByPromo.get(s.promotionId)!.push({ serviceId: s.serviceId, role: s.role, serviceName: s.serviceName });
  }

  return rows.map((r) => ({ ...r, services: svcByPromo.get(r.id) ?? [] }));
}

export async function getPromotions(): Promise<PromotionRow[]> {
  const business = await getBusiness();
  if (!business?.id) return [];
  return fetchPromotionsWithServices(business.id);
}

export async function getActivePromotions(businessId: string): Promise<ActivePromotion[]> {
  const now = new Date();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT p.id, p.name, p.type, p."discountType", p."discountValue",
            p."buyQuantity", p."getQuantity"
     FROM "Promotion" p
     WHERE p."businessId" = $1
       AND p.active = true
       AND p."startDate" <= $2
       AND p."endDate" >= $2`,
    businessId,
    now
  )) as Omit<ActivePromotion, "services">[];

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const svcRows = (await prisma.$queryRawUnsafe(
    `SELECT "promotionId", "serviceId", role FROM "PromotionService" WHERE "promotionId" IN (${placeholders})`,
    ...ids
  )) as { promotionId: string; serviceId: string; role: string }[];

  const svcByPromo = new Map<string, { serviceId: string; role: string }[]>();
  for (const s of svcRows) {
    if (!svcByPromo.has(s.promotionId)) svcByPromo.set(s.promotionId, []);
    svcByPromo.get(s.promotionId)!.push({ serviceId: s.serviceId, role: s.role });
  }

  return rows.map((r) => ({
    ...r,
    type: r.type as ActivePromotion["type"],
    discountType: r.discountType as ActivePromotion["discountType"],
    services: svcByPromo.get(r.id) ?? [],
  }));
}

interface PromotionServiceInput {
  serviceId: string;
  role: string;
}

interface CreatePromotionData {
  name: string;
  type: string;
  discountType?: string | null;
  discountValue?: number | null;
  buyQuantity?: number;
  getQuantity?: number;
  startDate: string;
  endDate: string;
  services: PromotionServiceInput[];
}

export async function createPromotion(data: CreatePromotionData) {
  const business = await getBusiness();
  if (!business?.id) throw new Error("No business context");

  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Promotion" (id, "businessId", name, type, "discountType", "discountValue", "buyQuantity", "getQuantity", "startDate", "endDate", active, "usedCount", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 0, now())`,
    id,
    business.id,
    data.name,
    data.type,
    data.discountType ?? null,
    data.discountValue ?? null,
    data.buyQuantity ?? 2,
    data.getQuantity ?? 1,
    new Date(data.startDate),
    new Date(data.endDate)
  );

  for (const svc of data.services) {
    const svcId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PromotionService" (id, "promotionId", "serviceId", role) VALUES ($1, $2, $3, $4)`,
      svcId,
      id,
      svc.serviceId,
      svc.role
    );
  }

  revalidatePath("/promotions");
  return { id };
}

interface UpdatePromotionData extends CreatePromotionData {
  id: string;
  active: boolean;
}

export async function updatePromotion(data: UpdatePromotionData) {
  const business = await getBusiness();
  if (!business?.id) throw new Error("No business context");

  await prisma.$executeRawUnsafe(
    `UPDATE "Promotion" SET name=$1, type=$2, "discountType"=$3, "discountValue"=$4,
            "buyQuantity"=$5, "getQuantity"=$6, "startDate"=$7, "endDate"=$8, active=$9
     WHERE id=$10 AND "businessId"=$11`,
    data.name,
    data.type,
    data.discountType ?? null,
    data.discountValue ?? null,
    data.buyQuantity ?? 2,
    data.getQuantity ?? 1,
    new Date(data.startDate),
    new Date(data.endDate),
    data.active,
    data.id,
    business.id
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM "PromotionService" WHERE "promotionId" = $1`,
    data.id
  );

  for (const svc of data.services) {
    const svcId = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PromotionService" (id, "promotionId", "serviceId", role) VALUES ($1, $2, $3, $4)`,
      svcId,
      data.id,
      svc.serviceId,
      svc.role
    );
  }

  revalidatePath("/promotions");
}

export async function deletePromotion(id: string) {
  const business = await getBusiness();
  if (!business?.id) throw new Error("No business context");

  await prisma.$executeRawUnsafe(
    `UPDATE "Promotion" SET active = false WHERE id = $1 AND "businessId" = $2`,
    id,
    business.id
  );
  revalidatePath("/promotions");
}
