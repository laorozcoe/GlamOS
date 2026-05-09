"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";
import type { Coupon } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type CouponKind = "GENERIC" | "FOLIADO";

type CartItem = { serviceId?: string | null; price: number };

/** Coupon row augmented with fields that need raw SQL (DLL lock prevents prisma generate) */
export type AugmentedCoupon = Coupon & {
  couponKind: CouponKind;
  tokenCount: number; // total tokens ever created (generated + burned + redeemed)
};

// ─── Regex helpers ────────────────────────────────────────────────────────────

const UUID_RE       = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_CODE_RE = /^[0-9a-f]{8}$/i;

// ─── Raw SQL helpers ──────────────────────────────────────────────────────────

async function augmentCoupons(coupons: Coupon[]): Promise<AugmentedCoupon[]> {
  if (coupons.length === 0) return [];
  const ids = coupons.map((c) => c.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const extras = (await prisma.$queryRawUnsafe(
    `SELECT c.id, c."couponKind", CAST(COUNT(ct.id) AS INT) AS "tokenCount"
     FROM "Coupon" c
     LEFT JOIN "CouponToken" ct ON ct."couponId" = c.id
     WHERE c.id IN (${placeholders})
     GROUP BY c.id`,
    ...ids
  )) as { id: string; couponKind: string; tokenCount: number }[];
  const map = new Map(extras.map((e: { id: string; couponKind: string; tokenCount: number }) => [e.id, e]));
  return coupons.map((c) => ({
    ...c,
    couponKind: (map.get(c.id)?.couponKind ?? "GENERIC") as CouponKind,
    tokenCount: map.get(c.id)?.tokenCount ?? 0,
  }));
}

async function setCouponKind(couponId: string, couponKind: CouponKind) {
  await prisma.$executeRawUnsafe(
    `UPDATE "Coupon" SET "couponKind" = $1 WHERE id = $2`,
    couponKind,
    couponId
  );
}

async function getCouponKind(couponId: string): Promise<CouponKind> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "couponKind" FROM "Coupon" WHERE id = $1`,
    couponId
  )) as { couponKind: string }[];
  return (rows[0]?.couponKind ?? "GENERIC") as CouponKind;
}

// ─── List / fetch ─────────────────────────────────────────────────────────────

export async function getCoupons(): Promise<AugmentedCoupon[]> {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const coupons = await prisma.coupon.findMany({
    where: { businessId: business.id, active: true },
    orderBy: { createdAt: "desc" },
  });

  return augmentCoupons(coupons);
}

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildCouponPayload(data: any) {
  const isCourtesy = data.category === "COURTESY";
  return {
    name: String(data.name).trim(),
    category: isCourtesy ? "COURTESY" as const : "DISCOUNT" as const,
    type: isCourtesy ? "FIXED" as const : data.type,
    value: isCourtesy ? 0 : Number(data.value),
    minPurchase: isCourtesy ? 0 : (Number(data.minPurchase) || 0),
    serviceNote: isCourtesy ? (String(data.serviceNote || "").trim() || null) : null,
    limitType: data.limitType,
    totalStock: Number(data.totalStock) || 1,
    usedCount: 0,
    active: true,
    startDate: data.startDate
      ? new Date(`${data.startDate}T00:00:00-06:00`)
      : new Date("2000-01-01T00:00:00-06:00"),
    endDate: data.endDate
      ? new Date(`${data.endDate}T23:59:59-06:00`)
      : new Date("2099-12-31T23:59:59-06:00"),
  };
}

// ─── Create / Update / Delete ─────────────────────────────────────────────────

export async function createCoupon(data: any) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const code = String(data.code).toUpperCase().trim();
  const couponKind: CouponKind = data.couponKind === "FOLIADO" ? "FOLIADO" : "GENERIC";
  const payload = buildCouponPayload(data);

  const existing = await prisma.coupon.findFirst({
    where: { businessId: business.id, code, active: false },
  });

  const coupon = existing
    ? await prisma.coupon.update({ where: { id: existing.id }, data: payload })
    : await prisma.coupon.create({ data: { businessId: business.id, code, ...payload } });

  await setCouponKind(coupon.id, couponKind);

  revalidatePath("/coupons");
  return coupon;
}

export async function updateCoupon(id: string, data: any) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const couponKind: CouponKind = data.couponKind === "FOLIADO" ? "FOLIADO" : "GENERIC";
  const { usedCount: _u, ...rest } = buildCouponPayload(data);
  const coupon = await prisma.coupon.update({
    where: { id, businessId: business.id },
    data: { code: String(data.code).toUpperCase().trim(), ...rest },
  });

  await setCouponKind(coupon.id, couponKind);

  revalidatePath("/coupons");
  return coupon;
}

export async function deleteCoupon(id: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  await prisma.coupon.update({
    where: { id, businessId: business.id },
    data: { active: false },
  });

  revalidatePath("/coupons");
}

// ─── Discount calculator ──────────────────────────────────────────────────────

function calcDiscount(
  coupon: Coupon,
  subtotal: number,
  cartItems?: CartItem[]
): { discount: number; coveredServiceIds: string[] } {
  if (coupon.category === "COURTESY") {
    try {
      const couponServices: { id: string; price: number }[] = JSON.parse(coupon.serviceNote ?? "[]");
      const couponServiceIds = new Set(couponServices.map((s) => s.id));

      if (cartItems && cartItems.length > 0) {
        const covered = cartItems.filter((item) => item.serviceId && couponServiceIds.has(item.serviceId));
        const discount = covered.reduce((sum, item) => sum + item.price, 0);
        return { discount: Math.min(discount, subtotal), coveredServiceIds: covered.map((i) => i.serviceId as string) };
      }

      const courtesyValue = couponServices.reduce((sum, s) => sum + (s.price ?? 0), 0);
      return { discount: Math.min(courtesyValue, subtotal), coveredServiceIds: [] };
    } catch {
      return { discount: subtotal, coveredServiceIds: [] };
    }
  }

  const discount = coupon.type === "PERCENTAGE"
    ? Math.round((subtotal * coupon.value) / 100 * 100) / 100
    : Math.min(coupon.value, subtotal);
  return { discount, coveredServiceIds: [] };
}

// ─── Validation V2 (new clean logic) ─────────────────────────────────────────

/**
 * Valida un cupón usando la nueva lógica GENERIC / FOLIADO.
 *
 * Reglas:
 *  - GENERIC: se ingresa el código compartido. El sistema valida fechas y stock de usos.
 *  - FOLIADO: DEBE ingresarse un folio (UUID completo o código corto de 8 hex chars).
 *             El código genérico es rechazado con mensaje claro.
 */
export async function validateCouponV2(code: string, subtotal: number, cartItems?: CartItem[]) {
  const business = await getBusiness();
  if (!business) return { valid: false as const, error: "Error de sesión" };

  const trimmed = code.trim();

  // UUID completo → folio individual FOLIADO
  if (UUID_RE.test(trimmed)) {
    return validateFoliadoByUUID(trimmed.toLowerCase(), subtotal, business.id, cartItems);
  }

  // Código corto 8 hex chars → folio FOLIADO (short code)
  if (SHORT_CODE_RE.test(trimmed)) {
    return validateFoliadoByShortCode(trimmed, subtotal, business.id, cartItems);
  }

  // Código alfanumérico → cupón GENERIC
  return validateGenericByCode(trimmed, subtotal, business.id, cartItems);
}

async function validateGenericByCode(code: string, subtotal: number, businessId: string, cartItems?: CartItem[]) {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT *, "couponKind" FROM "Coupon"
     WHERE "businessId" = $1 AND code = $2 AND active = true
     LIMIT 1`,
    businessId,
    code.toUpperCase().trim()
  )) as (Coupon & { couponKind: string })[];

  if (rows.length === 0) return { valid: false as const, error: "Cupón no encontrado" };
  const coupon = rows[0];

  if (coupon.couponKind === "FOLIADO") {
    return {
      valid: false as const,
      error: "Este cupón es foliado. Presenta tu folio o escanea el QR.",
    };
  }

  // Validaciones de vigencia
  const now = new Date();
  if (now < coupon.startDate) return { valid: false as const, error: "El cupón aún no está disponible" };
  if (now > coupon.endDate)   return { valid: false as const, error: "El cupón ha expirado" };

  // Validación de stock (para GENERIC con límite de cantidad)
  if ((coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") && coupon.usedCount >= coupon.totalStock) {
    return { valid: false as const, error: "El cupón ya se agotó" };
  }

  if (subtotal < coupon.minPurchase) {
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };
  }

  const { discount, coveredServiceIds } = calcDiscount(coupon, subtotal, cartItems);

  return {
    valid: true as const,
    tokenId: null,
    coupon: { id: coupon.id, code: coupon.code, name: coupon.name, category: coupon.category as string, type: coupon.type as string, value: coupon.value, serviceNote: coupon.serviceNote },
    discount,
    coveredServiceIds,
  };
}

async function validateFoliadoByShortCode(shortCode: string, subtotal: number, businessId: string, cartItems?: CartItem[]) {
  const token = await prisma.couponToken.findFirst({
    where: { id: { startsWith: shortCode.toLowerCase() } },
    include: { coupon: true },
  });

  if (!token) return { valid: false as const, error: "Folio no encontrado" };
  if (token.coupon.businessId !== businessId) return { valid: false as const, error: "Folio no válido" };
  if (token.usedAt) return { valid: false as const, error: "Este folio ya fue canjeado" };

  return validateFoliadoCoupon(token, subtotal, cartItems);
}

async function validateFoliadoByUUID(tokenId: string, subtotal: number, businessId: string, cartItems?: CartItem[]) {
  const token = await prisma.couponToken.findUnique({
    where: { id: tokenId },
    include: { coupon: true },
  });

  if (!token) return { valid: false as const, error: "Folio no encontrado" };
  if (token.coupon.businessId !== businessId) return { valid: false as const, error: "Folio no válido" };
  if (token.usedAt) return { valid: false as const, error: "Este folio ya fue canjeado" };

  return validateFoliadoCoupon(token, subtotal, cartItems);
}

function validateFoliadoCoupon(
  token: { id: string; coupon: Coupon },
  subtotal: number,
  cartItems?: CartItem[]
) {
  const coupon = token.coupon;
  const now = new Date();

  if (!coupon.active) return { valid: false as const, error: "El cupón no está activo" };
  if (now < coupon.startDate) return { valid: false as const, error: "El cupón aún no está disponible" };
  if (now > coupon.endDate)   return { valid: false as const, error: "El cupón ha expirado" };
  if (subtotal < coupon.minPurchase) {
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };
  }

  const { discount, coveredServiceIds } = calcDiscount(coupon, subtotal, cartItems);

  return {
    valid: true as const,
    tokenId: token.id,
    coupon: { id: coupon.id, code: coupon.code, name: coupon.name, category: coupon.category as string, type: coupon.type as string, value: coupon.value, serviceNote: coupon.serviceNote },
    discount,
    coveredServiceIds,
  };
}

// ─── Validation legacy (mantener para compatibilidad) ─────────────────────────

export async function validateCoupon(code: string, subtotal: number, cartItems?: CartItem[]) {
  const business = await getBusiness();
  if (!business) return { valid: false as const, error: "Error de sesión" };

  const trimmed = code.trim();

  if (UUID_RE.test(trimmed)) {
    return validateCouponByToken(trimmed.toLowerCase(), subtotal, business.id, cartItems);
  }

  if (SHORT_CODE_RE.test(trimmed)) {
    return validateCouponByShortCode(trimmed, subtotal, business.id, cartItems);
  }

  return validateCouponByCode(trimmed, subtotal, business.id, cartItems);
}

async function validateCouponByCode(code: string, subtotal: number, businessId: string, cartItems?: CartItem[]) {
  const coupon = await prisma.coupon.findFirst({
    where: { businessId, code: code.toUpperCase().trim(), active: true },
  });

  if (!coupon) return { valid: false as const, error: "Cupón no encontrado" };

  if (coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") {
    return {
      valid: false as const,
      error: "Este cupón requiere un folio único. Escanea el QR del cupón o ingresa el ID del folio.",
    };
  }

  const now = new Date();
  if (now < coupon.startDate) return { valid: false as const, error: "El cupón aún no está disponible" };
  if (now > coupon.endDate)   return { valid: false as const, error: "El cupón ha expirado" };
  if (subtotal < coupon.minPurchase) {
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };
  }

  const { discount, coveredServiceIds } = calcDiscount(coupon, subtotal, cartItems);

  return {
    valid: true as const,
    tokenId: null,
    coupon: { id: coupon.id, code: coupon.code, name: coupon.name, category: coupon.category as string, type: coupon.type as string, value: coupon.value, serviceNote: coupon.serviceNote },
    discount,
    coveredServiceIds,
  };
}

async function validateCouponByShortCode(shortCode: string, subtotal: number, businessId: string, cartItems?: CartItem[]) {
  const token = await prisma.couponToken.findFirst({
    where: { id: { startsWith: shortCode.toLowerCase() } },
    include: { coupon: true },
  });

  if (!token) return { valid: false as const, error: "Cupón no encontrado" };
  if (token.coupon.businessId !== businessId) return { valid: false as const, error: "Cupón no válido" };
  if (token.usedAt) return { valid: false as const, error: "Este cupón ya fue canjeado" };

  const coupon = token.coupon;
  const now = new Date();
  if (!coupon.active) return { valid: false as const, error: "El cupón no está activo" };
  if (now < coupon.startDate) return { valid: false as const, error: "El cupón aún no está disponible" };
  if (now > coupon.endDate)   return { valid: false as const, error: "El cupón ha expirado" };
  if ((coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") && coupon.usedCount >= coupon.totalStock) {
    return { valid: false as const, error: "El cupón ya fue utilizado en su totalidad" };
  }
  if (subtotal < coupon.minPurchase) {
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };
  }

  const { discount, coveredServiceIds } = calcDiscount(coupon, subtotal, cartItems);

  return {
    valid: true as const,
    tokenId: token.id,
    coupon: { id: coupon.id, code: coupon.code, name: coupon.name, category: coupon.category as string, type: coupon.type as string, value: coupon.value, serviceNote: coupon.serviceNote },
    discount,
    coveredServiceIds,
  };
}

async function validateCouponByToken(tokenId: string, subtotal: number, businessId: string, cartItems?: CartItem[]) {
  const token = await prisma.couponToken.findUnique({
    where: { id: tokenId },
    include: { coupon: true },
  });

  if (!token) return { valid: false as const, error: "Cupón no encontrado" };
  if (token.coupon.businessId !== businessId) return { valid: false as const, error: "Cupón no válido" };
  if (token.usedAt) return { valid: false as const, error: "Este cupón ya fue canjeado" };

  const coupon = token.coupon;
  const now = new Date();
  if (!coupon.active) return { valid: false as const, error: "El cupón no está activo" };
  if (now < coupon.startDate) return { valid: false as const, error: "El cupón aún no está disponible" };
  if (now > coupon.endDate)   return { valid: false as const, error: "El cupón ha expirado" };
  if ((coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") && coupon.usedCount >= coupon.totalStock) {
    return { valid: false as const, error: "El cupón ya fue utilizado en su totalidad" };
  }
  if (subtotal < coupon.minPurchase) {
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };
  }

  const { discount, coveredServiceIds } = calcDiscount(coupon, subtotal, cartItems);

  return {
    valid: true as const,
    tokenId: token.id,
    coupon: { id: coupon.id, code: coupon.code, name: coupon.name, category: coupon.category as string, type: coupon.type as string, value: coupon.value, serviceNote: coupon.serviceNote },
    discount,
    coveredServiceIds,
  };
}

// ─── Checkout: coupons activos (para selector en caja) ───────────────────────

/**
 * Devuelve cupones GENÉRICOS activos y vigentes para el selector de caja.
 * Los cupones FOLIADOS NO aparecen aquí — deben ingresarse por folio o QR.
 */
export async function getActiveCoupons() {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      businessId: business.id,
      active: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });

  const withStock = coupons.filter((c: Coupon) => c.limitType === "DATE" || c.usedCount < c.totalStock);
  if (withStock.length === 0) return [];

  // Filtrar solo GENERIC — los FOLIADO se ingresan por folio o QR
  const augmented = await augmentCoupons(withStock);
  return augmented.filter((c) => c.couponKind === "GENERIC");
}

// ─── Services for coupon form ─────────────────────────────────────────────────

export async function getServicesForCoupons() {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  return prisma.service.findMany({
    where: { businessId: business.id, active: true },
    include: { category: { select: { name: true, order: true } } },
    orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
  });
}

// ─── Token management ────────────────────────────────────────────────────────

/**
 * FOLIADO: genera N tokens verificando que no se supere el totalStock (tokens creados, no canjeados).
 * Un token generado pero no canjeado sigue consumiendo un slot ("folio quemado").
 */
export async function generateFoliadoTokens(couponId: string, count: number) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: business.id },
  });
  if (!coupon) throw new Error("Cupón no encontrado");

  const safeCount = Math.min(Math.max(1, count), 500);

  // Para FOLIADO: el límite es tokens GENERADOS (no canjeados)
  if (coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") {
    const generatedCount = await prisma.couponToken.count({ where: { couponId } });
    const available = coupon.totalStock - generatedCount;
    if (available <= 0) throw new Error("Este cupón no tiene folios disponibles para generar");
    const finalCount = Math.min(safeCount, available);
    await prisma.couponToken.createMany({
      data: Array.from({ length: finalCount }, () => ({ couponId })),
    });
  } else {
    // DATE only: sin límite de generación
    await prisma.couponToken.createMany({
      data: Array.from({ length: safeCount }, () => ({ couponId })),
    });
  }

  revalidatePath("/coupons");
}

/** Legacy: mantiene compatibilidad con código existente */
export async function generateCouponTokens(couponId: string, count: number) {
  return generateFoliadoTokens(couponId, count);
}

export async function getCouponTokens(couponId: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: business.id },
  });
  if (!coupon) throw new Error("Acceso denegado");

  return prisma.couponToken.findMany({
    where: { couponId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * FOLIADO: genera exactamente 1 token para compartir.
 * El slot se descuenta inmediatamente aunque no sea canjeado (folio quemado si no se usa).
 */
export async function generateFoliadoSingleToken(couponId: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: business.id },
  });
  if (!coupon) throw new Error("Cupón no encontrado");

  if (coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") {
    const generatedCount = await prisma.couponToken.count({ where: { couponId } });
    if (generatedCount >= coupon.totalStock) {
      throw new Error("No hay folios disponibles en este cupón");
    }
  }

  const token = await prisma.couponToken.create({ data: { couponId } });
  revalidatePath("/coupons");
  return token;
}

/** Legacy alias */
export async function generateAndGetSingleToken(couponId: string) {
  return generateFoliadoSingleToken(couponId);
}

/**
 * Amplía el totalStock del cupón en 1 y genera 1 token adicional.
 * Usado cuando todos los folios ya fueron asignados y el admin quiere
 * compartir 1 folio extra (ej: alguien llama por teléfono después de imprimir el lote).
 */
export async function extendCouponAndShareToken(couponId: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: business.id },
  });
  if (!coupon) throw new Error("Cupón no encontrado");

  const updated = await prisma.coupon.update({
    where: { id: couponId },
    data: { totalStock: coupon.totalStock + 1 },
  });

  const token = await prisma.couponToken.create({ data: { couponId } });

  revalidatePath("/coupons");
  return { token, newTotalStock: updated.totalStock };
}

// ─── Sales history ────────────────────────────────────────────────────────────

export async function getCouponSales(couponId: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: business.id },
  });
  if (!coupon) throw new Error("Acceso denegado");

  return prisma.sale.findMany({
    where: { couponId, businessId: business.id, active: true },
    orderBy: { createdAt: "desc" },
    include: {
      appointment: { select: { guestName: true } },
      employee: {
        include: { user: { select: { name: true, lastName: true } } },
      },
    },
  });
}
