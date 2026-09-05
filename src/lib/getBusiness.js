import { headers } from "next/headers"
import prisma from "@/lib/prisma2"

// Vive aqui y no en @/lib/prisma porque ese archivo es "use server": alli
// esta funcion seria un Server Action publico que devuelve el negocio
// completo (tokens de MercadoPago incluidos) a quien pase un slug.
async function getBusinessPrisma(slug) {
    return await prisma.business.findUnique({
        where: { slug, active: true },
    })
}

const DEFAULT_SLUG = process.env.DEV_BUSINESS_SLUG || "testsalon";

export async function getBusiness() {
    try {
        const h = await headers();

        const host = h.get("host") || "";

        let slug = host.split(".")[0];

        if (!host || host.includes("localhost")) {
            slug = h.get("x-business-slug") || slug;
        }

        if (!slug || slug === "www" || slug === "localhost" || slug === "") {
            return await getBusinessPrisma(DEFAULT_SLUG);
        }

        const business = await getBusinessPrisma(slug);

        return business || await getBusinessPrisma(DEFAULT_SLUG);

    } catch (error) {
        console.error("Error obteniendo business:", error);
        return null;
    }
}