'use server'

import { prisma } from '@/lib/prisma2'
import { hashPassword } from '@/lib/hashPassword'
import { revalidatePath } from "next/cache";
// import { auth } from "@/lib/auth"; // Tu configuración de Auth.js

//--------------------------------------------------------------------------------
//-------------------------Appointment-------------------------------------
//--------------------------------------------------------------------------------

export async function createAppointment(data) {
    // const session = await auth();
    // if (!session?.user) throw new Error("No autenticado");

    await prisma.appointment.create({
        data: {
            title: data.title,
            start: data.start,
            end: data.end,
            userId: "7bb16997-9054-4956-b001-47088536935e", // Ajusta según tu auth
        },
    });

    revalidatePath("/admin/calendario"); // <-- Pon aquí la ruta de tu página de calendario
}

export async function getAppointments() {
    // const session = await auth();
    // if (!session?.user?.email) return [];
    // return []
    // // Buscamos appointmentos solo de este usuario (opcional, según tu lógica)
    // const appointments = await prisma.appointment.findMany({
    //     where: { userId: "7bb16997-9054-4956-b001-47088536935e" },
    // });

    // // IMPORTANTE: Convertir fechas a String para evitar error de serialización en Client Components
    // return appointments.map(appointment => ({
    //     ...appointment,
    //     start: appointment.start.toISOString(),
    //     end: appointment.end.toISOString(),
    // }));
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
    const client = await prisma.client.create({
        data: {
            businessId,
            name,
            phone,
            email,
            notes
        },
    })

    return client
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


// model Client {
//   id         String   @id @default(uuid())
//   businessId String
//   name       String
//   phone      String?
//   email      String?
//   notes      String?
//   createdAt  DateTime @default(now())

//   business      Business       @relation(fields: [businessId], references: [id])
//   appointments  Appointment[]
//   reviews       Review[]
//   loyaltyPoints LoyaltyPoint[]

//   @@unique([businessId, phone])
// }