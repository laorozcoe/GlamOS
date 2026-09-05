// @ts-nocheck
"use server";

import prisma from "@/lib/prisma2";

import { requireBusiness } from "@/lib/session";
export async function getFinancialMetrics(startDate: Date, endDate: Date) {
    const business = await requireBusiness(["ADMIN", "RECEPTION"]);
    if (!business) return null;
    const businessId = business.id;

  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
      active: true,
    },
    include: {
      payments: {
        where: { status: "COMPLETED", active: true }
      },
      employee: { select: { user: { select: { name: true, lastName: true } } } },
      client: { select: { name: true } },
    }
  });

  const totalRevenue = sales.reduce((acc: any, sale: any) => acc + sale.total, 0);
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
  
  const paymentMethods: Record<string, number> = { Efectivo: 0, Tarjeta: 0, Transferencia: 0 };
  sales.forEach(s => {
    s.payments.forEach(p => {
      if (p.method === "CASH") paymentMethods.Efectivo += p.amount;
      if (p.method === "CARD") paymentMethods.Tarjeta += p.amount;
      if (p.method === "TRANSFER") paymentMethods.Transferencia += p.amount;
    });
  });
  const paymentMethodsDistribution = Object.keys(paymentMethods).map(k => ({ name: k, value: paymentMethods[k] }));

  const salesByDayMap: Record<string, number> = {};
  sales.forEach(s => {
    const d = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(s.createdAt);
    salesByDayMap[d] = (salesByDayMap[d] || 0) + s.total;
  });
  const salesByDay = Object.keys(salesByDayMap).map(k => ({ date: k, amount: salesByDayMap[k] })).sort((a: any, b: any) => a.date.localeCompare(b.date));

  const detailedSales = sales.map(s => ({
    folio: s.folio,
    total: s.total,
    payments: s.payments.map(p => ({ method: p.method, amount: p.amount })),
    mpFee: s.mpFee,
    mpNetReceived: s.mpNetReceived,
    createdAt: s.createdAt,
    employeeName: s.employee?.user ? `${s.employee.user.name} ${s.employee.user.lastName}`.trim() : "Desconocido",
    clientName: s.client?.name || "Público General"
  }));

  return {
    totalRevenue,
    paymentMethodsDistribution,
    averageTicket,
    salesByDay,
    detailedSales,
  };
}

export async function getClientMetrics(startDate: Date, endDate: Date) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);
  if (!business) return null;
  const businessId = business.id;

  // 1. Nuevos clientes agregados al CRM
  const newClientsCount = await prisma.client.count({
    where: {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
      active: true,
    }
  });

  // 2. Traer TODAS las ventas completadas para extraer el nombre del cliente 
  // (ya sea de clientId o de appointment.guestName)
  const allSales = await prisma.sale.findMany({
    where: {
      businessId,
      status: "COMPLETED",
      active: true,
    },
    select: {
      id: true,
      total: true,
      createdAt: true,
      client: { select: { id: true, name: true, phone: true } },
      appointment: { select: { guestName: true, guestPhone: true } }
    }
  });

  // Agrupar por identificador de cliente (usamos ID si existe, sino el nombre en minúsculas)
  const clientStats = new Map();
  let returningClientsCount = 0;

  for (const sale of allSales) {
    let clientName = sale.client?.name || sale.appointment?.guestName || "Público General";
    let clientPhone = sale.client?.phone || sale.appointment?.guestPhone || "";
    let clientIdKey = sale.client?.id || clientName.toLowerCase().trim();

    if (clientIdKey === "público general" || clientIdKey === "") {
        clientIdKey = "publico_general_" + sale.id; // Evitar agrupar todo en público general si no hay nombre
    }

    if (!clientStats.has(clientIdKey)) {
      clientStats.set(clientIdKey, {
        id: clientIdKey,
        name: clientName,
        phone: clientPhone,
        totalSpent: 0,
        visitsCount: 0,
        firstVisit: sale.createdAt,
        visitsInRange: 0
      });
    }

    const stats = clientStats.get(clientIdKey);
    // Actualizar la fecha de primera visita si encontramos una más antigua
    if (sale.createdAt < stats.firstVisit) {
        stats.firstVisit = sale.createdAt;
    }

    // Si la venta está en el rango actual
    if (sale.createdAt >= startDate && sale.createdAt <= endDate) {
        stats.totalSpent += sale.total;
        stats.visitsCount += 1;
        stats.visitsInRange += 1;
    }
  }

  // Filtrar los que tuvieron visitas en el rango
  const clientsInRange = Array.from(clientStats.values()).filter((c: any) => c.visitsInRange > 0);

  // Calcular recurrentes (primera visita antes del rango, y visitó en el rango)
  for (const client of clientsInRange) {
      if (client.firstVisit < startDate) {
          returningClientsCount++;
      }
  }

  // Ordenar por gasto y tomar los 10 mejores
  const topClients = clientsInRange
    .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalSpent: c.totalSpent,
        visitsCount: c.visitsCount
    }));

  return {
    newClientsCount,
    returningClientsCount,
    topClients
  };
}

export async function getEmployeeMetrics(startDate: Date, endDate: Date) {
    const business = await requireBusiness(["ADMIN", "RECEPTION"]);
    if (!business) return null;
    const businessId = business.id;

  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
      active: true,
    },
    select: {
      total: true,
      employeeId: true,
      items: {
        select: { quantity: true }
      }
    }
  });

  const employeeStats: Record<string, { id: string, revenueGenerated: number, servicesCount: number }> = {};
  sales.forEach(s => {
    if (!employeeStats[s.employeeId]) {
      employeeStats[s.employeeId] = { id: s.employeeId, revenueGenerated: 0, servicesCount: 0 };
    }
    employeeStats[s.employeeId].revenueGenerated += s.total;
    s.items.forEach(i => {
      employeeStats[s.employeeId].servicesCount += i.quantity;
    });
  });

  const employeeIds = Object.keys(employeeStats);
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    include: { user: { select: { name: true, lastName: true } } }
  });

  const employeeProductivity = employees.map(emp => ({
    id: emp.id,
    name: `${emp.user.name} ${emp.user.lastName}`.trim(),
    servicesCount: employeeStats[emp.id].servicesCount,
    revenueGenerated: employeeStats[emp.id].revenueGenerated,
  })).sort((a: any, b: any) => b.revenueGenerated - a.revenueGenerated);

  return { employeeProductivity };
}

export async function getOperationMetrics(startDate: Date, endDate: Date) {
    const business = await requireBusiness(["ADMIN", "RECEPTION"]);
    if (!business) return null;
    const businessId = business.id;

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        businessId,
        status: "COMPLETED",
        createdAt: { gte: startDate, lte: endDate },
        active: true,
      },
      active: true
    },
    select: {
      description: true,
      quantity: true,
      price: true,
    }
  });

  const serviceStats: Record<string, { name: string, quantitySold: number, revenueGenerated: number }> = {};
  saleItems.forEach(i => {
    if (!serviceStats[i.description]) {
      serviceStats[i.description] = { name: i.description, quantitySold: 0, revenueGenerated: 0 };
    }
    serviceStats[i.description].quantitySold += i.quantity;
    serviceStats[i.description].revenueGenerated += (i.price * i.quantity);
  });

  const topServices = Object.values(serviceStats)
    .sort((a: any, b: any) => b.quantitySold - a.quantitySold)
    .slice(0, 5);

  const sales = await prisma.sale.findMany({
    where: {
      businessId,
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
      active: true,
    },
    select: {
      createdAt: true
    }
  });

  const hourCounts = new Array(24).fill(0);
  sales.forEach(s => {
    const mxDateString = s.createdAt.toLocaleString("en-US", { timeZone: "America/Mexico_City" });
    const mxDate = new Date(mxDateString);
    const hour = mxDate.getHours();
    hourCounts[hour]++;
  });

  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

  return { topServices, peakHours };
}
