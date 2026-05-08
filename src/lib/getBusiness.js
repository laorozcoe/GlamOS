import { headers } from "next/headers"
import { getBusinessPrisma } from "@/lib/prisma"

export async function getBusiness() {
    try {
        const h = await headers();

        const host = h.get("host") || "";
        
        let slug = host.split(".")[0];

        if (!host || host.includes("localhost")) {
            slug = h.get("x-business-slug") || slug;
        }

        if (!slug || slug === "www" || slug === "localhost" || slug === "") {

            return await getBusinessPrisma("evorasalon");
        }

        const business = await getBusinessPrisma(slug);

        return business || await getBusinessPrisma("evorasalon");

    } catch (error) {
        console.error("Error obteniendo business:", error);
        return null;
    }
}