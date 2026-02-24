'use server'

import prisma from '@/lib/prisma2'
import { hashPassword } from '@/lib/hashPassword'
import { revalidatePath } from "next/cache";
// import { auth } from "@/lib/auth"; // Tu configuración de Auth.js

//--------------------------------------------------------------------------------
//-------------------------Appointment-------------------------------------
//--------------------------------------------------------------------------------

export async function createAppointment(payload) {
    // const session = await auth();
    // if (!session?.user) throw new Error("No autenticado");
    const appointment = await prisma.appointment.create({
        data: {
            businessId: payload.businessId,
            employeeId: payload.employeeId,
            title: payload.title,
            start: payload.start,
            end: payload.end,
            guestName: payload.guestName,
            guestPhone: payload.guestPhone,
            status: payload.status,
            paymentStatus: payload.paymentStatus,
            totalAmount: payload.totalAmount,
            notes: payload.notes,
            services: {
                create: payload.services.map((s) => ({
                    serviceId: s.serviceId,
                    price: s.price,
                })),
            },
        },
    });

    revalidatePath("/calendar"); // <-- Pon aquí la ruta de tu página de calendario
    return appointment
}

export async function getAppointmentPrisma(businessId, id) {
    const appointment = await prisma.appointment.findFirst({
        where: {
            businessId: businessId,
            id: id,
            active: true
        },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
            client: true,
            services: {
                include: {
                    service: true,
                    appointmentExtras: {
                        include: {
                            extra: true,
                        },
                    },
                },
            },
        },
    })

    return appointment
}

export async function getAppointmentsPrisma(businessId) {
    const appointment = await prisma.appointment.findMany({
        where: { businessId: businessId, active: true },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
            client: true,
            services: {
                include: {
                    service: true,
                    appointmentExtras: {
                        include: {
                            extra: true,
                        },
                    },
                },
            },
        },
    });

    return appointment
}


export async function getAppointmentsByDatePrisma(businessId, start) {

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${start}T23:59:59.999Z`);
    const appointment = await prisma.appointment.findMany({
        where: { businessId: businessId, start: { gte: startDate }, end: { lte: endDate }, active: true },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
            client: true,
            services: {
                include: {
                    service: true,
                    appointmentExtras: {
                        include: {
                            extra: true,
                        },
                    },
                },
            },
        },
    });

    return appointment
}

export async function updateAppointment(payload, appointmentId) {
    // Validación básica
    if (!appointmentId) throw new Error("Se requiere el ID de la cita para actualizar");

    await prisma.appointment.update({
        where: {
            id: appointmentId, active: true
        },
        data: {
            // 1. Actualizamos los datos planos de la Cita
            businessId: payload.businessId,
            employeeId: payload.employeeId, // Ojo: asegúrate que tu payload traiga el objeto o el string directo
            title: payload.title,
            start: payload.start,
            end: payload.end,
            status: payload.status,
            paymentStatus: payload.paymentStatus,
            totalAmount: payload.totalAmount,
            guestName: payload.guestName,
            guestPhone: payload.guestPhone,
            clientId: payload.clientId,
            notes: payload.notes,
            // 2. LA MAGIA: Borrar todo y crear de nuevo
            services: {
                // Esto borra TODOS los registros en la tabla AppointmentService 
                // que estén relacionados con este appointmentId.
                deleteMany: {},

                // Inmediatamente después, crea los nuevos que vienen en el payload
                create: payload.services.map((s) => ({
                    serviceId: s.serviceId,
                    price: s.price,
                })),
            },
        },
    });

    revalidatePath("/calendar");
}

export async function deleteAppointmentPrisma(appointmentId) {
    // Validación básica
    if (!appointmentId) throw new Error("Se requiere el ID de la cita para eliminar");

    await prisma.appointment.delete({
        where: {
            id: appointmentId,
            active: true
        },
    });

    revalidatePath("/calendar");
}

//--------------------------------------------------------------------------------
//-------------------------Seed-------------------------------------
//--------------------------------------------------------------------------------

export async function seed() {
    return await prisma.business.create({
        data: {
            name: "Brillarte Bloom",
            slug: "brillartebloom",
            phone: "",
            email: "",
            address: "",
        },
    })
}

//--------------------------------------------------------------------------------
//-------------------------Business-------------------------------------
//--------------------------------------------------------------------------------

export async function getBusinessPrisma(slug) {

    const business = await prisma.business.findUnique({
        where: { slug, active: true },
    })

    return business
}

//--------------------------------------------------------------------------------
//-------------------------ServiceCategory-------------------------------------
//--------------------------------------------------------------------------------


export async function createServiceCategoryPrisma(businessId, name, order, active) {
    const serviceCategory = await prisma.serviceCategory.create({
        data: {
            businessId,
            name,
            order,
            active
        },
    })

    return serviceCategory
}

export async function getServiceCategoryPrisma(businessId, name) {
    const serviceCategory = await prisma.serviceCategory.findFirst({
        where: {
            businessId: businessId,
            name: name,
            active: true,
        },
    })

    return serviceCategory
}

export async function getServicesCategoriesPrisma(businessId) {
    const serviceCategories = await prisma.serviceCategory.findMany({
        where: {
            businessId: businessId,
            active: true,
        },
    })

    return serviceCategories
}

export async function updateServiceCategoryPrisma(id, businessId, name, order, active) {
    const serviceCategory = await prisma.serviceCategory.update({
        where: {
            id: id,
            businessId: businessId,
            active: true,
        },
        data: {
            name,
            order,
            active
        },
    })

    return serviceCategory
}

export async function deleteServiceCategoryPrisma(id, businessId) {
    const serviceCategory = await prisma.serviceCategory.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return serviceCategory
}


//--------------------------------------------------------------------------------
//-------------------------Service-------------------------------------
//--------------------------------------------------------------------------------

export async function createServicePrisma(businessId, categoryId, name, description, descriptionTicket, duration, price) {
    const service = await prisma.service.create({
        data: {
            businessId,
            categoryId,
            name,
            description,
            descriptionTicket,
            duration,
            price
        },
    })

    return service
}

export async function getServicePrisma(businessId, name) {

    const service = await prisma.service.findFirst({
        where: {
            businessId: businessId,
            name: name,
            active: true
        },
    })

    return service
}

export async function getServicesPrisma(businessId) {

    const services = await prisma.service.findMany({
        where: {
            businessId: businessId,
            active: true
        },
    })

    return services
}

export async function getServicesByCategoryPrisma(businessId, categoryId) {

    const servicesCategories = await prisma.service.findMany({
        where: {
            businessId: businessId,
            categoryId: categoryId,
            active: true
        },
    })

    return servicesCategories
}

export async function updateServicePrisma(id, businessId, categoryId, name, description, descriptionTicket, duration, price) {
    const service = await prisma.service.update({
        where: {
            id: id,
            businessId: businessId,
            categoryId: categoryId,
            active: true
        },
        data: {
            name,
            description,
            descriptionTicket,
            duration,
            price
        },
    })

    return service
}

export async function deleteServicePrisma(id, businessId) {
    const service = await prisma.service.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return service
}

//--------------------------------------------------------------------------------
//-------------------------Employee-------------------------------------
//--------------------------------------------------------------------------------
// model Employee {
//   id         String   @id @default(uuid())
//   businessId String
//   userId     String   @unique
//   phone      String?
//   bio        String?
//   commission Float    @default(0.0)
//   rating     Float    @default(0.0)
//   active     Boolean  @default(true)
//   createdAt  DateTime @default(now())

//   business     Business      @relation(fields: [businessId], references: [id])
//   user         User          @relation(fields: [userId], references: [id])
//   appointments Appointment[]
//   reviews      Review[]
// }

export async function createEmployeePrisma(businessId, userId, phone, bio, commission, rating) {

    // commission = parseFloat(commission);
    // rating = parseFloat(rating);

    // if (isNaN(commission) || isNaN(rating)) {
    //     throw new Error("Commission o rating inválido");
    // }

    const employee = await prisma.employee.create({
        data: {
            businessId,
            userId,
            phone,
            bio,
            commission,
            rating
        },
    })

    return employee
}

export async function getEmployeePrisma(businessId, userId) {
    const employee = await prisma.employee.findFirst({
        where: {
            businessId: businessId,
            userId: userId,
            active: true
        },
        include: {
            user: {
                select: {
                    name: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    })

    return employee
}

export async function getEmployeesPrisma(businessId) {
    // const employees = await prisma.employee.findMany({
    //     where: {
    //         businessId: businessId,
    //     },
    // })

    const employees = await prisma.employee.findMany({
        where: {
            businessId,
            active: true,
        },
        include: {
            user: {
                select: {
                    name: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    })
    return employees

}

export async function updateEmployeePrisma(id, businessId, userId, phone, bio, commission, rating) {
    const employee = await prisma.employee.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            userId,
            phone,
            bio,
            commission,
            rating
        },
    })

    return employee
}

export async function deleteEmployeePrisma(id, businessId) {
    const employee = await prisma.employee.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return employee
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createUserPrisma(businessId, name, lastName, username, email, password, role) {
    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
        data: {
            email,
            businessId,
            name,
            username,
            lastName,
            password: passwordHash,
            role
        },
    })

    return user
}

export async function getUserPrisma(username, businessId) {

    const user = await prisma.user.findFirst({
        where: {
            username: username,
            businessId: businessId,
            active: true
        },
    })

    return user
}

export async function updateUserPrisma(id, businessId, name, username, lastName, password, role) {
    const user = await prisma.user.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            name,
            lastName,
            username,
            password,
            role
        },
    })

    return user
}

export async function deleteUserPrisma(id, businessId) {
    const user = await prisma.user.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return user
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createClientPrisma(businessId, name, phone, email, notes, employeeId) {

    if (name == '' || phone == '') return
    // 1. VALIDACIÓN: Buscar si ya existe un cliente con ese teléfono en ese negocio
    const existingClient = await prisma.client.findFirst({
        where: {
            businessId: businessId,
            phone: phone,
            active: true
        }
    });

    // 2. DECISIÓN: Si existe, lo retornamos (o puedes lanzar un error)
    if (existingClient) {
        // Opción A: Retornar el existente (útil para "Get or Create")
        console.log("Cliente ya existía, retornando el existente.");
        return existingClient;

        // Opción B: Si prefieres que de error, descomenta esto:
        // throw new Error("El cliente ya está registrado en este negocio.");
    }

    // 3. CREACIÓN: Si no existe, lo insertamos
    const newClient = await prisma.client.create({
        data: {
            businessId,
            name,
            phone,
            email,
            notes,
            employeeId
        },
    });

    return newClient;
}

export async function getClientPrisma(businessId, phone) {
    const client = await prisma.client.findFirst({
        where: {
            businessId: businessId,
            phone: phone,
            active: true
        },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
        }
    })

    return client
}

export async function getClientsPrisma(businessId) {
    const clients = await prisma.client.findMany({
        where: {
            businessId: businessId,
            active: true
        },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
        }
    })

    return clients
}

export async function updateClientPrisma(id, businessId, name, phone, email, notes, employeeId) {
    const client = await prisma.client.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            name,
            phone,
            email,
            notes,
            employeeId
        },
    })

    return client
}

export async function deleteClientPrisma(id, businessId) {
    const client = await prisma.client.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return client
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createPaymentPrisma(businessId, appointmentId, amount, method, status, externalId) {
    const payment = await prisma.payment.create({
        data: {
            businessId,
            appointmentId,
            amount,
            method,
            status,
            externalId
        },
    })

    return payment
}

export async function getPaymentPrisma(businessId, appointmentId) {
    const payment = await prisma.payment.findFirst({
        where: {
            appointmentId: appointmentId,
            businessId: businessId,
            active: true
        },
    })

    return payment
}

export async function getPaymentsPrisma(businessId) {
    const payments = await prisma.payment.findMany({
        where: {
            businessId: businessId,
            active: true
        },
    })

    return payments
}

export async function updatePaymentPrisma(businessId, id, amount, method, status, externalId) {
    const payment = await prisma.payment.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            amount,
            method,
            status,
            externalId
        },
    })

    return payment
}

export async function deletePaymentPrisma(businessId, id) {
    const payment = await prisma.payment.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return payment
}

//--------------------------------------------------------------------------------
//-------------------------Sale-------------------------------------
//--------------------------------------------------------------------------------

export const createSalePrisma = async (data) => {
    const {
        businessId,
        clientId,
        employeeId,
        appointmentId,
        items, // Array de { serviceId, description, price, quantity }
        payment, // Objeto { amount, method, received, change }
        totals // Objeto { subtotal, discount, total }
    } = data;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Creamos la Venta principal
            const newSale = await tx.sale.create({
                data: {
                    businessId,
                    clientId,
                    employeeId,
                    appointmentId,
                    subtotal: totals.subtotal,
                    discount: totals.discount,
                    total: totals.total,
                    status: 'COMPLETED',
                    // 2. Creamos los ítems de la venta en la misma operación (Nested Write)
                    items: {
                        create: items.map((item) => ({
                            serviceId: item.serviceId, // Puede ser null si es cargo extra manual
                            description: item.description,
                            price: item.price,
                            quantity: item.quantity || 1,
                        })),
                    },
                    // 3. Creamos el registro del pago
                    payments: {
                        create: {
                            businessId,
                            amount: payment.amount,
                            method: payment.method,
                            amountReceived: payment.received,
                            changeReturned: payment.change,
                            status: 'COMPLETED',
                        },
                    },
                },
                // Incluimos los datos relacionados para devolverlos al frontend (para el ticket)
                include: {
                    items: true,
                    payments: true,
                },
            });

            // 4. Si la venta viene de una cita, la marcamos como completada
            if (appointmentId) {
                await tx.appointment.update({
                    where: { id: appointmentId, active: true },
                    data: { status: 'COMPLETED', paymentStatus: "PAID" },
                });
            }

            return newSale;
        }, {
            maxWait: 5000, // Tiempo máximo para esperar una conexión (5s)
            timeout: 30000 // Tiempo máximo para que se ejecute la transacción (30s)
        });

        return { success: true, sale: result };
    } catch (error) {
        console.error("Error en la transacción de venta:", error);
        return { success: false, error: error.message };
    }
};

export async function getSalePrisma(businessId, id) {
    const sale = await prisma.sale.findFirst({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return sale
}

export async function getSalesPrisma(businessId) {
    const sales = await prisma.sale.findMany({
        where: {
            businessId: businessId,
            active: true
        },
    })

    return sales
}

export async function updateSalePrisma(id, businessId, clientId, employeeId, appointmentId, subtotal, discount, total, status, notes) {
    const sale = await prisma.sale.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            businessId, clientId, employeeId, appointmentId, subtotal, discount, total, status, notes
        },
    })

    return sale
}

export async function deleteSalePrisma(businessId, id) {
    const sale = await prisma.sale.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return sale
}

//--------------------------------------------------------------------------------
//-------------------------SaleItem-------------------------------------
//--------------------------------------------------------------------------------  

export async function createSaleItemPrisma(saleId, serviceId, description, price, quantity) {
    const saleItem = await prisma.saleItem.create({
        data: {
            saleId, serviceId, description, price, quantity
        },
    })

    return saleItem
}

export async function getSaleItemPrisma(businessId, saleId) {
    const saleItem = await prisma.saleItem.findFirst({
        where: {
            saleId: saleId,
            businessId: businessId,
            active: true
        },
    })

    return saleItem
}

export async function updateSaleItemPrisma(id, saleId, serviceId, description, price, quantity) {
    const saleItem = await prisma.saleItem.update({
        where: {
            id: id,
            active: true
        },
        data: {
            saleId, serviceId, description, price, quantity
        },
    })

    return saleItem
}

export async function deleteSaleItemPrisma(businessId, id) {
    const saleItem = await prisma.saleItem.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return saleItem
}

//--------------------------------------------------------------------------------
//-------------------------Review-------------------------------------
//--------------------------------------------------------------------------------  

export async function createReviewPrisma(businessId, clientId, rating, comment) {
    const review = await prisma.review.create({
        data: {
            businessId, clientId, rating, comment
        },
    })

    return review
}

export async function getReviewPrisma(businessId, id) {
    const review = await prisma.review.findFirst({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return review
}

export async function updateReviewPrisma(id, businessId, clientId, rating, comment) {
    const review = await prisma.review.update({
        where: {
            id: id,
            active: true
        },
        data: {
            businessId, clientId, rating, comment
        },
    })

    return review
}

export async function deleteReviewPrisma(businessId, id) {
    const review = await prisma.review.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return review
}


//corte de caja
export async function getCashCloseSummary(businessId) {
    // A. Buscar el último corte
    const lastClose = await prisma.cashClose.findFirst({
        where: { businessId, active: true },
        orderBy: { closingDate: 'desc' },
    })

    const openingDate = lastClose
        ? lastClose.closingDate
        : new Date(new Date().setHours(0, 0, 0, 0))
    const closingDate = new Date()

    // B. Buscar ventas y sus pagos completados
    const sales = await prisma.sale.findMany({
        where: {
            businessId,
            status: 'COMPLETED',
            active: true,
            createdAt: {
                gte: openingDate,
                lte: closingDate,
            },
        },
        include: {
            payments: {
                where: {
                    status: 'COMPLETED', // Fundamental: solo sumar pagos exitosos
                    active: true
                }
            }
        }
    })

    // C. Clasificar los totales por método de pago
    let cashExpected = 0
    let cardTotal = 0
    let transferTotal = 0

    sales.forEach(sale => {
        sale.payments.forEach(payment => {
            // Ajusta 'payment.amount' por el nombre real de tu campo de monto en el modelo Payment
            if (payment.method === 'CASH') cashExpected += payment.amount
            if (payment.method === 'CARD') cardTotal += payment.amount
            if (payment.method === 'TRANSFER') transferTotal += payment.amount
        })
    })

    return {
        openingDate,
        closingDate,
        cashExpected,
        cardTotal,
        transferTotal,
        totalSales: cashExpected + cardTotal + transferTotal,
        salesCount: sales.length,
    }
}

// 2. Guardar el corte de caja en la base de datos
export async function createCashClose(data) {
    const difference = data.cashActual - data.cashExpected

    const cashClose = await prisma.cashClose.create({
        data: {
            businessId: data.businessId,
            userId: data.userId,
            openingDate: data.openingDate,
            closingDate: new Date(),
            cashExpected: data.cashExpected,
            cashActual: data.cashActual,
            difference: difference,
            notes: data.notes,
        },
    })

    return cashClose
}

export async function getDailySummary(businessId) {
    // Rango de fechas para "Hoy" (desde las 00:00:00 hasta las 23:59:59)
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    // Buscar empleados con sus ventas y citas de HOY
    const employees = await prisma.employee.findMany({
        where: { businessId, active: true },
        include: {
            user: {
                select: {
                    name: true,
                    lastName: true,
                    email: true,
                },
            },
            // Ventas completadas hoy
            sales: {
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: 'COMPLETED',
                    active: true
                },
                include: {
                    payments: {
                        where: { status: 'COMPLETED', active: true },
                    },
                },
            },
            // Citas programadas para hoy que siguen PENDING (o que no se han cobrado)
            appointments: {
                where: {
                    start: { gte: startOfDay, lte: endOfDay },
                    status: 'PENDING', // Puedes ajustar esto si usas otro estado
                    active: true
                },
            },
        },
    })

    // Variables para los totales globales del negocio
    let totalDay = 0
    let totalCashDay = 0
    let totalCardDay = 0

    // Procesar los datos por cada empleado
    const employeeStats = employees.map((emp) => {
        let cash = 0
        let card = 0

        emp.sales.forEach((sale) => {
            sale.payments.forEach((payment) => {
                // Asumiendo que tu modelo Payment tiene el campo 'amount'
                if (payment.method === 'CASH') {
                    cash += payment.amount
                    totalCashDay += payment.amount
                }
                if (payment.method === 'CARD') {
                    card += payment.amount
                    totalCardDay += payment.amount
                }
                totalDay += payment.amount
            })
        })

        return {
            id: emp.id,
            name: `${emp.user.name} ${emp.user.lastName}` || 'Empleado sin nombre', // Asumiendo que Employee tiene un campo name
            cash,
            card,
            pendingAppointments: emp.appointments.length,
        }
    })

    return {
        date: startOfDay,
        totalDay,
        totalCashDay,
        totalCardDay,
        employeeStats,
    }
}