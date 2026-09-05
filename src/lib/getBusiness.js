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

// Negocio que se usa cuando el host no identifica ninguno: en desarrollo
// (localhost) o si el subdominio no corresponde a un negocio existente.
// Definelo en .env como DEV_BUSINESS_SLUG con el slug del negocio al que
// pertenece tu usuario, o el guard de tenant de requireSession() rechazara la
// sesion.
const DEFAULT_SLUG = process.env.DEV_BUSINESS_SLUG || "demo";

export async function getBusiness() {
    try {
        const h = await headers();

        const host = h.get("host") || "";

        // El host trae el puerto en desarrollo ("localhost:3000"), asi que hay
        // que quitarlo ANTES de sacar el subdominio. Sin esto el slug quedaba
        // en "localhost:3000", la comparacion contra "localhost" de abajo
        // fallaba, y se hacia una consulta de mas a la base buscando un
        // negocio con ese slug antes de caer al fallback.
        const hostname = host.split(":")[0];

        let slug = hostname.split(".")[0];

        if (!hostname || hostname.includes("localhost")) {
            slug = h.get("x-business-slug") || DEFAULT_SLUG;
        }

        if (!slug || slug === "www" || slug === "localhost" || slug === "") {
            return await getBusinessPrisma(DEFAULT_SLUG);
        }

        const business = await getBusinessPrisma(slug);

        return business || await getBusinessPrisma(DEFAULT_SLUG);

    } catch (error) {
        // Next senaliza con excepciones parte de su control de flujo:
        // DYNAMIC_SERVER_USAGE (la ruta uso headers() y por tanto no puede
        // renderizarse estaticamente), NEXT_REDIRECT, NEXT_NOT_FOUND. Todas
        // llevan `digest` y TIENEN que propagarse: si se tragan aqui, Next no
        // se entera y la ruta se renderiza sin negocio en vez de marcarse como
        // dinamica.
        if (error && typeof error.digest === "string") {
            throw error;
        }

        console.error("Error obteniendo business:", error);
        return null;
    }
}