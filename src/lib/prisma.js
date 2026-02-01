'use server'

import { prisma } from '@/lib/prisma2'
import { hashPassword } from '@/lib/hashPassword'



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

export async function getBusinessPrisma(slug) {

    const business = await prisma.business.findUnique({
        where: { slug },
    })

    return business
}

//--------------------------------------------------------------------------------
//-------------------------Service-------------------------------------
//--------------------------------------------------------------------------------

export async function createServicePrisma(businessId, name, description, duration, price, category) {
    const service = await prisma.service.create({
        data: {
            businessId,
            name,
            description,
            duration,
            price,
            category
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

export async function updateServicePrisma(id, businessId, name, description, duration, price, category) {
    const service = await prisma.service.update({
        where: {
            id: id,
            businessId: businessId,
        },
        data: {
            name,
            description,
            duration,
            price,
            category
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
//-------------------------Manicurist-------------------------------------
//--------------------------------------------------------------------------------
// model Manicurist {
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

export async function createManicuristPrisma(businessId, userId, phone, bio, commission, rating) {

    // commission = parseFloat(commission);
    // rating = parseFloat(rating);

    // if (isNaN(commission) || isNaN(rating)) {
    //     throw new Error("Commission o rating inválido");
    // }

    const manicurist = await prisma.manicurist.create({
        data: {
            businessId,
            userId,
            phone,
            bio,
            commission,
            rating
        },
    })

    return manicurist
}

export async function getManicuristPrisma(businessId, userId) {
    const manicurist = await prisma.manicurist.findFirst({
        where: {
            businessId: businessId,
            userId: userId,
        },
    })

    return manicurist
}

export async function getManicuristsPrisma(businessId) {
    const manicurists = await prisma.manicurist.findMany({
        where: {
            businessId: businessId,
        },
    })

    return manicurists
}

export async function updateManicuristPrisma(id, businessId, userId, phone, bio, commission, rating) {
    const manicurist = await prisma.manicurist.update({
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

    return manicurist
}

export async function deleteManicuristPrisma(id, businessId) {
    const manicurist = await prisma.manicurist.delete({
        where: {
            id: id,
            businessId: businessId,
        },
    })

    return manicurist
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createUserPrisma(email, businessId, name, lastName, password, role) {
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

// model User {
//   id         String   @id @default(uuid())
//   businessId String
//   name       String
//   email      String
//   password   String
//   role       Role     @default(RECEPTION)
//   active     Boolean  @default(true)
//   createdAt  DateTime @default(now())
//   updatedAt  DateTime @updatedAt

//   business   Business    @relation(fields: [businessId], references: [id])
//   manicurist Manicurist?

//   @@unique([businessId, email])
// }

// enum Role {
//   ADMIN
//   RECEPTION
//   MANICURIST
// }