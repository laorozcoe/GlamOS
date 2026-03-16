
// src/lib/getBusiness.js
import { headers } from "next/headers"
import { getBusinessPrisma } from "@/lib/prisma"

export async function getBusiness() {
    try {
        const h = await headers()
        const slug = h.get("x-business-slug")

        if (!slug || slug === "www" || slug === "localhost" || slug === "") {
            return await getBusinessPrisma("brillartebloom")
        }

        const business = await getBusinessPrisma(slug)
        // Si no encuentra el negocio, regresa el default para evitar nulls peligrosos
        return business || await getBusinessPrisma("brillartebloom")

    } catch (error) {
        console.error("Error obteniendo business:", error)
        // En caso de error (ej. durante build de not-found), devuelve null o un default seguro
        return null
    }
}