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
    debugger
    const appointment = await prisma.appointment.findFirst({
        where: {
            businessId: businessId,
            id: id,
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
        where: { businessId: businessId },
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
            id: appointmentId
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

//--------------------------------------------------------------------------------
//-------------------------Seed-------------------------------------
//--------------------------------------------------------------------------------

export async function seed() {
    return await prisma.business.create({
        data: {
            name: "Brillarte Bloom",
            slug: "brillarte-bloom",
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
        where: { slug },
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
        },
    })

    return serviceCategory
}

export async function getServicesCategoriesPrisma(businessId) {
    const serviceCategories = await prisma.serviceCategory.findMany({
        where: {
            businessId: businessId,
        },
    })

    return serviceCategories
}

export async function updateServiceCategoryPrisma(id, businessId, name, order, active) {
    const serviceCategory = await prisma.serviceCategory.update({
        where: {
            id: id,
            businessId: businessId,
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
        },
    })

    return serviceCategory
}


//--------------------------------------------------------------------------------
//-------------------------Service-------------------------------------
//--------------------------------------------------------------------------------

export async function createServicePrisma(businessId, categoryId, name, description, duration, price) {
    const service = await prisma.service.create({
        data: {
            businessId,
            categoryId,
            name,
            description,
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
        },
    })

    return service
}

export async function getServicesPrisma(businessId) {

    const services = await prisma.service.findMany({
        where: {
            businessId: businessId,
        },
    })

    return services
}

export async function getServicesByCategoryPrisma(businessId, categoryId) {

    const servicesCategories = await prisma.service.findMany({
        where: {
            businessId: businessId,
            categoryId: categoryId,
        },
    })

    return servicesCategories
}

export async function updateServicePrisma(id, businessId, categoryId, name, description, duration, price) {
    const service = await prisma.service.update({
        where: {
            id: id,
            businessId: businessId,
            categoryId: categoryId,
        },
        data: {
            name,
            description,
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
        },
    })

    return employee
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createUserPrisma(businessId, name, lastName, email, password, role) {
    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
        data: {
            email,
            businessId,
            name,
            lastName,
            password: passwordHash,
            role
        },
    })

    return user
}

export async function getUserPrisma(email, businessid) {

    const user = await prisma.user.findFirst({
        where: {
            email: email,
            businessId: businessid,
        },
    })

    return user
}



export async function updateUserPrisma(id, businessId, name, lastName, password, role) {
    const user = await prisma.user.update({
        where: {
            id: id,
            businessId: businessId,
        },
        data: {
            name,
            lastName,
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
        },
    })

    return user
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createClientPrisma(businessId, name, phone, email, notes) {

    if (name == '' || phone == '') return
    // 1. VALIDACIÓN: Buscar si ya existe un cliente con ese teléfono en ese negocio
    const existingClient = await prisma.client.findFirst({
        where: {
            businessId: businessId,
            phone: phone
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
            notes
        },
    });

    return newClient;
}

export async function getClientPrisma(businessId, phone) {
    const client = await prisma.client.findFirst({
        where: {
            businessId: businessId,
            phone: phone,
        },
    })

    return client
}

export async function getClientsPrisma(businessId) {
    const clients = await prisma.client.findMany({
        where: {
            businessId: businessId,
        },
    })

    return clients
}

export async function updateClientPrisma(id, businessId, name, phone, email, notes) {
    const client = await prisma.client.update({
        where: {
            id: id,
            businessId: businessId,
        },
        data: {
            name,
            phone,
            email,
            notes
        },
    })

    return client
}

export async function deleteClientPrisma(id, businessId) {
    const client = await prisma.client.delete({
        where: {
            id: id,
            businessId: businessId,
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
        },
    })

    return payment
}

export async function getPaymentsPrisma(businessId) {
    const payments = await prisma.payment.findMany({
        where: {
            businessId: businessId,
        },
    })

    return payments
}

export async function updatePaymentPrisma(businessId, id, amount, method, status, externalId) {
    const payment = await prisma.payment.update({
        where: {
            id: id,
            businessId: businessId,
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
        },
    })

    return payment
}



// //////////////////////
// // 💰 PAGOS
// //////////////////////
// model Payment {
//   id            String @id @default (uuid())
//   appointmentId String
//   amount        Float // Cuánto pagó en ESTA transacción
//   method        PaymentMethod // CASH, CARD, TRANSFER, OTHER
//   status        PaymentStatus @default (COMPLETED) // COMPLETED, PENDING, REFUNDED
//   externalId    String ? // ID de Stripe/PayPal o número de autorización de la terminal

//         createdAt DateTime @default (now())

//   // Relación inversa
//   appointment Appointment @relation(fields: [appointmentId], references: [id])
//   business    Business ? @relation(fields: [businessId], references: [id])
//   businessId  String ?
// }

// // Tus Enums para controlar los tipos
// enum PaymentMethod {
//     CASH
//   CARD
//   TRANSFER
// }

// enum PaymentStatus {
//     PENDING
//   COMPLETED
//   FAILED
//   REFUNDED
// }