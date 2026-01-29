import { PrismaClient } from '@prisma/client'
import { hashPassword } from '@/lib/hashPassword'

export const prisma = new PrismaClient()

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

export async function getUserPrisma(email, businessid) {

    const user = await prisma.user.findFirst({
        where: {
            email: email,
            businessId: businessid,
        },
    })

    return user
}

export async function createUserPrisma(email, businessId, name, password, role) {
    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
        data: {
            email,
            businessId,
            name,
            password: passwordHash,
            role
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