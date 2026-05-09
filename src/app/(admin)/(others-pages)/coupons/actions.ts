"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";
import type { Coupon } from "@prisma/client";

export async function getCoupons() {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  return prisma.coupon.findMany({
    where: { businessId: business.id, active: true },
    orderBy: { createdAt: "desc" },
  });
}

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

export async function createCoupon(data: any) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const code = String(data.code).toUpperCase().trim();
  const payload = buildCouponPayload(data);

  // Si existe un cupón inactivo con el mismo código, reactivarlo en lugar de crear uno nuevo
  const existing = await prisma.coupon.findFirst({
    where: { businessId: business.id, code, active: false },
  });

  const coupon = existing
    ? await prisma.coupon.update({ where: { id: existing.id }, data: payload })
    : await prisma.coupon.create({ data: { businessId: business.id, code, ...payload } });

  revalidatePath("/coupons");
  return coupon;
}

export async function updateCoupon(id: string, data: any) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const { usedCount: _u, ...rest } = buildCouponPayload(data);
  const coupon = await prisma.coupon.update({
    where: { id, businessId: business.id },
    data: { code: String(data.code).toUpperCase().trim(), ...rest },
  });

  revalidatePath("/coupons");
  return coupon;
}

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

  // DATE: solo fechas (ya en WHERE). QUANTITY/BOTH: también requiere stock disponible.
  return coupons.filter((c: Coupon) => c.limitType === "DATE" || c.usedCount < c.totalStock);
}

const UUID_RE       = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_CODE_RE = /^[0-9a-f]{8}$/i;

type CartItem = { serviceId?: string | null; price: number };

function calcDiscount(
  coupon: Coupon,
  subtotal: number,
  cartItems?: CartItem[]
): { discount: number; coveredServiceIds: string[] } {
  if (coupon.category === "COURTESY") {
    try {
      const couponServices: { id: string; price: number }[] = JSON.parse(coupon.serviceNote ?? "[]");
      const couponServiceIds = new Set(couponServices.map(s => s.id));

      if (cartItems && cartItems.length > 0) {
        // Match only the cart items whose serviceId is in the coupon
        const covered = cartItems.filter(item => item.serviceId && couponServiceIds.has(item.serviceId));
        const discount = covered.reduce((sum, item) => sum + item.price, 0);
        const coveredServiceIds = covered.map(item => item.serviceId as string);
        return { discount: Math.min(discount, subtotal), coveredServiceIds };
      }

      // Fallback (e.g. search modal preview without cart context)
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

async function validateCouponByCode(code: string, subtotal: number, businessId: string, cartItems?: CartItem[]) {
  const coupon = await prisma.coupon.findFirst({
    where: { businessId, code: code.toUpperCase().trim(), active: true },
  });

  if (!coupon) return { valid: false as const, error: "Cupón no encontrado" };

  const now = new Date();
  if (now < coupon.startDate)
    return { valid: false as const, error: "El cupón aún no está disponible" };
  if (now > coupon.endDate)
    return { valid: false as const, error: "El cupón ha expirado" };
  if (coupon.limitType !== "DATE" && coupon.usedCount >= coupon.totalStock)
    return { valid: false as const, error: "El cupón ya fue utilizado en su totalidad" };
  if (subtotal < coupon.minPurchase)
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };

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
  // El UUID en DB empieza con los 8 chars del ID corto, e.g. "abcdef12-xxxx-..."
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
  if (now > coupon.endDate) return { valid: false as const, error: "El cupón ha expirado" };
  if ((coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") && coupon.usedCount >= coupon.totalStock)
    return { valid: false as const, error: "El cupón ya fue utilizado en su totalidad" };
  if (subtotal < coupon.minPurchase)
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };

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
  if (now > coupon.endDate) return { valid: false as const, error: "El cupón ha expirado" };
  if ((coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") && coupon.usedCount >= coupon.totalStock)
    return { valid: false as const, error: "El cupón ya fue utilizado en su totalidad" };
  if (subtotal < coupon.minPurchase)
    return { valid: false as const, error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida` };

  const { discount, coveredServiceIds } = calcDiscount(coupon, subtotal, cartItems);

  return {
    valid: true as const,
    tokenId: token.id,
    coupon: { id: coupon.id, code: coupon.code, name: coupon.name, category: coupon.category as string, type: coupon.type as string, value: coupon.value, serviceNote: coupon.serviceNote },
    discount,
    coveredServiceIds,
  };
}

export async function validateCoupon(code: string, subtotal: number, cartItems?: CartItem[]) {
  const business = await getBusiness();
  if (!business) return { valid: false as const, error: "Error de sesión" };

  const trimmed = code.trim();

  // UUID completo (legacy / escaneo directo) → token individual
  if (UUID_RE.test(trimmed)) {
    return validateCouponByToken(trimmed.toLowerCase(), subtotal, business.id, cartItems);
  }

  // Código corto de 8 chars hex → ID visible en el cupón impreso
  if (SHORT_CODE_RE.test(trimmed)) {
    return validateCouponByShortCode(trimmed, subtotal, business.id, cartItems);
  }

  // Código alfanumérico normal → cupón por código compartido
  return validateCouponByCode(trimmed, subtotal, business.id, cartItems);
}

export async function getServicesForCoupons() {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  return prisma.service.findMany({
    where: { businessId: business.id, active: true },
    include: { category: { select: { name: true, order: true } } },
    orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
  });
}

// ---- Token management ----

export async function generateCouponTokens(couponId: string, count: number) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, businessId: business.id },
  });
  if (!coupon) throw new Error("Cupón no encontrado");

  const safeCount = Math.min(Math.max(1, count), 500); // máx 500 por lote

  await prisma.couponToken.createMany({
    data: Array.from({ length: safeCount }, () => ({ couponId })),
  });

  revalidatePath("/coupons");
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

export async function deleteCoupon(id: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  await prisma.coupon.update({
    where: { id, businessId: business.id },
    data: { active: false },
  });

  revalidatePath("/coupons");
}
