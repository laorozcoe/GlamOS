"use server";

import prisma from "@/lib/prisma2";
import { requireBusiness, requireSession } from "@/lib/session";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

const SIMULATE = process.env.MP_SIMULATE === "true";

const SIM_DEVICES = [
  { id: "SIM_NEWLAND__N950DEMO0001", operating_mode: "PDV" },
  { id: "SIM_PAX__A910DEMO0002", operating_mode: "STANDALONE" },
];

async function getMpToken() {
  const ctx = await requireBusiness();
  if (!ctx) throw new Error("No business found");
  const biz = await prisma.business.findUnique({
    where: { id: ctx.id },
    select: { mpAccessToken: true },
  });
  return biz?.mpAccessToken ?? null;
}

// Lista las terminales registradas en la cuenta de MercadoPago del negocio.
export async function listMpDevices(customToken?: string): Promise<{ devices?: any[]; error?: string }> {
  await requireSession(["ADMIN", "RECEPTION"]);

  if (SIMULATE) return { devices: SIM_DEVICES };

  const token = customToken || (await getMpToken());
  if (!token) return { error: "No hay Access Token configurado." };

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
  operating_mode: "PDV" | "STANDALONE",
  customToken?: string
): Promise<{ operating_mode?: string; error?: string; isManualRequired?: boolean }> {
  await requireSession();

  if (SIMULATE) return { operating_mode };

  const token = customToken || (await getMpToken());
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
  if (!res.ok) {
    if (data?.message === "Device is not allowed to perform this action" || data?.error === "113") {
        return { 
            error: "Requiere configuración manual en la terminal física.",
            isManualRequired: true 
        };
    }
    return { error: data?.message || "Error al cambiar el modo" };
  }
  return { operating_mode: data.operating_mode ?? operating_mode };
}

// Verifica el estado real de múltiples terminales
export async function checkTerminalsStatus(terminals: any[]): Promise<Record<string, string>> {
  noStore();
  if (SIMULATE) {
    const map: Record<string, string> = {};
    terminals.forEach(t => map[t.posId] = "PDV");
    return map;
  }

  // Agrupar por access token para minimizar peticiones
  const tokensToPosIds = new Map<string, string[]>();
  const defaultToken = await getMpToken();
  
  terminals.forEach(t => {
    const tk = t.mpAccessToken || defaultToken;
    if (tk) {
      if (!tokensToPosIds.has(tk)) tokensToPosIds.set(tk, []);
      tokensToPosIds.get(tk)!.push(t.posId);
    }
  });

  const resultMap: Record<string, string> = {};

  const promises = Array.from(tokensToPosIds.entries()).map(async ([token, posIds]) => {
    const res = await fetch("https://api.mercadopago.com/point/integration-api/devices", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const devices = data.devices || [];
      devices.forEach((d: any) => {
        if (posIds.includes(d.id) || posIds.map(p=>p.trim()).includes(d.id.trim())) {
          resultMap[d.id] = d.operating_mode;
        }
      });
    }
  });

  await Promise.all(promises);
  return resultMap;
}

export async function getBusinessSettings() {
  const businessCtx = await requireBusiness();
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
  const businessCtx = await requireBusiness(["ADMIN", "RECEPTION"]);
  if (!businessCtx) throw new Error("No business found");

  await prisma.$executeRawUnsafe(
    `UPDATE "Business" SET "themeColors" = $1::jsonb WHERE id = $2`,
    JSON.stringify(themeColors),
    businessCtx.id
  );

  revalidatePath("/settings");
}

export async function updateBusinessSettings(data: any) {
  const businessCtx = await requireBusiness(["ADMIN", "RECEPTION"]);
  if (!businessCtx) throw new Error("No business found");

  const { name, phone, email, address, mpAccessToken, mpStoreId, mpWebhookSecret, mpAccounts, openHour, closeHour, weekStartDay } = data;

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
      mpAccounts,
      openHour: Number(openHour),
      closeHour: Number(closeHour),
      weekStartDay: Number(weekStartDay)
    }
  });

  revalidatePath("/settings");
  return updated;
}

export async function getActiveTerminals() {
  noStore();
  const businessCtx = await requireBusiness();
  if (!businessCtx) throw new Error("No business found");

  return prisma.paymentTerminal.findMany({
    where: { businessId: businessCtx.id, active: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function savePaymentTerminals(terminals: any[]) {
  const businessCtx = await requireBusiness(["ADMIN", "RECEPTION"]);
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
           mpAccessToken: t.mpAccessToken || null,
           isDefault: t.isDefault
         }
       });
    } else {
       await prisma.paymentTerminal.create({
         data: {
           businessId: businessCtx.id,
           name: t.name,
           posId: t.posId,
           mpAccessToken: t.mpAccessToken || null,
           isDefault: t.isDefault
         }
       });
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function simulateDemoData() {
    const business = await requireBusiness(["ADMIN", "RECEPTION"]);
    if (!business || business.slug !== 'demo') {
        return { error: 'Solo disponible en el sitio demo.' };
    }
    
    // 1. Delete all appointments, sales, cash closes for this business
    await prisma.saleItem.deleteMany({ where: { sale: { businessId: business.id } } });
    await prisma.payment.deleteMany({ where: { businessId: business.id } });
    await prisma.sale.deleteMany({ where: { businessId: business.id } });
    await prisma.appointment.deleteMany({ where: { businessId: business.id } });
    await prisma.cashClose.deleteMany({ where: { businessId: business.id } });
    
    // 2. Fetch employees and services
    const employees = await prisma.employee.findMany({ where: { businessId: business.id } });
    if (employees.length === 0) return { error: 'No hay empleadas' };
    
    let services = await prisma.service.findMany({ where: { businessId: business.id } });
    if (services.length === 0) {
        await prisma.service.createMany({
            data: [
                { name: 'Corte de Cabello', price: 200, duration: 30, businessId: business.id },
                { name: 'Manicura', price: 300, duration: 45, businessId: business.id },
                { name: 'Tinte', price: 800, duration: 120, businessId: business.id },
                { name: 'Pedicura', price: 350, duration: 45, businessId: business.id }
            ]
        });
        services = await prisma.service.findMany({ where: { businessId: business.id } });
    }
    
    // 3. Generate random sales and appointments for the last 14 days and next 2 days
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 14);
    
    const clientNames = ['Laura G.', 'Carmen S.', 'Andrea M.', 'Lucia T.', 'Valeria R.'];
    const paymentMethods = ['CASH', 'CARD', 'TRANSFER'];
    
    for (let d = new Date(startDate); d <= new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); d.setDate(d.getDate() + 1)) {
        // Create 2 to 5 appointments per day
        const numApps = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < numApps; i++) {
            const emp = employees[Math.floor(Math.random() * employees.length)];
            const serv = services[Math.floor(Math.random() * services.length)];
            const guestName = clientNames[Math.floor(Math.random() * clientNames.length)];
            const hour = Math.floor(Math.random() * 8) + 10; // 10 to 17
            
            const start = new Date(d);
            start.setHours(hour, 0, 0, 0);
            const end = new Date(start.getTime() + serv.duration * 60000);
            
            const isPast = start < now;
            
            const app = await prisma.appointment.create({
                data: {
                    businessId: business.id,
                    employeeId: emp.id,
                    title: serv.name,
                    start,
                    end,
                    guestName,
                    guestPhone: '5550000000',
                    status: isPast ? 'COMPLETED' : 'PENDING',
                    totalAmount: serv.price,
                }
            });
            
            if (isPast) {
                // Create Sale
                const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                await prisma.sale.create({
                    data: {
                        businessId: business.id,
                        employeeId: emp.id,
                        appointmentId: app.id,
                        subtotal: serv.price,
                        total: serv.price,
                        status: 'COMPLETED',
                        createdAt: start,
                        updatedAt: start,
                        items: {
                            create: {
                                description: serv.name,
                                quantity: 1,
                                price: serv.price,
                                subtotal: serv.price,
                                serviceId: serv.id
                            }
                        },
                        payments: {
                            create: {
                                businessId: business.id,
                                method: method as any,
                                amount: serv.price,
                                status: 'COMPLETED'
                            }
                        }
                    }
                });
            }
        }
    }
    
    return { ok: true };
}
