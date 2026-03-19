// src/lib/getBusiness.js
import { headers } from "next/headers"
import { getBusinessPrisma } from "@/lib/prisma"

export async function getBusiness() {
    try {
        const h = await headers();

        // 1. Intentamos leer el host real que envía el navegador (ej: "evorasalon.vercel.app")
        const host = h.get("host") || "";

        // 2. Extraemos el slug cortando el dominio en el primer punto
        // Si es "evorasalon.vercel.app" -> se convierte en "evorasalon"
        // Si es "brillartebloom.vercel.app" -> se convierte en "brillartebloom"
        let slug = host.split(".")[0];

        // Opcional: Si tienes un middleware, intentamos leer tu custom header como plan B
        if (!host || host.includes("localhost")) {
            slug = h.get("x-business-slug") || slug;
        }

        // 3. Si estamos en localhost y no hay slug, o si algo falla, cargamos el default
        if (!slug || slug === "www" || slug === "localhost" || slug === "") {
            // Nota: Si quieres probar Evora en tu computadora (localhost:3000), 
            // cambia temporalmente "brillartebloom" por "evorasalon" aquí abajo
            return await getBusinessPrisma("brillartebloom");
        }

        // 4. Buscamos el negocio en la base de datos con el slug extraído
        const business = await getBusinessPrisma(slug);

        // Si por alguna razón el slug no existe en la BD, regresamos el default
        return business || await getBusinessPrisma("brillartebloom");

    } catch (error) {
        console.error("Error obteniendo business:", error);
        return null;
    }
}