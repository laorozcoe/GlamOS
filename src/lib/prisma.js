import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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


