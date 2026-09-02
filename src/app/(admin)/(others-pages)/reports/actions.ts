// @ts-nocheck
"use server";

import prisma from "@/lib/prisma2";

import { getBusiness } from "@/lib/getBusiness";
export async function getFinancialMetrics(startDate: Date, endDate: Date) {
    const business = await getBusiness();
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
    const d = s.createdAt.toISOString().split("T")[0];
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
    const business = await getBusiness();
    if (!business) return null;
    const businessId = business.id;

  const newClientsCount = await prisma.client.count({
    where: {
      businessId,
      createdAt: { gte: startDate, lte: endDate },
      active: true,
    }
  });

  const returningClients = await prisma.sale.groupBy({
    by: ['clientId'],
    where: {
      businessId,
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
      clientId: { not: null },
      active: true,
      client: {
        createdAt: { lt: startDate }
      }
    },
  });
  const returningClientsCount = returningClients.length;

  const topClientsData = await prisma.sale.groupBy({
    by: ['clientId'],
    where: {
      businessId,
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
      clientId: { not: null },
      active: true,
    },
    _sum: { total: true },
    _count: { _all: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 10,
  });

  const topClientIds = topClientsData.map(t => t.clientId as string);
  const clients = await prisma.client.findMany({
    where: { id: { in: topClientIds } },
    select: { id: true, name: true, phone: true }
  });
  
  const topClients = topClientsData.map(t => {
    const c = clients.find(cl => cl.id === t.clientId);
    return {
      id: t.clientId as string,
      name: c?.name || "Desconocido",
      phone: c?.phone || "",
      totalSpent: t._sum.total || 0,
      visitsCount: t._count._all || 0,
    };
  });

  return {
    newClientsCount,
    returningClientsCount,
    topClients
  };
}

export async function getEmployeeMetrics(startDate: Date, endDate: Date) {
    const business = await getBusiness();
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
    const business = await getBusiness();
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
    const hour = s.createdAt.getHours();
    hourCounts[hour]++;
  });

  const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

  return { topServices, peakHours };
}
