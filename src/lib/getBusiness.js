// import { headers } from "next/headers"
// import { getBusinessPrisma } from "@/lib/prisma"

// export async function getBusiness() {
//     const slug = headers().get("x-business-slug")

//     if (!slug || slug === "www" || slug === "localhost") {
//         return null
//     }

//     const business = await getBusinessPrisma(slug);

//     return business
// }


import { headers } from "next/headers"
import { getBusinessPrisma } from "@/lib/prisma"

export async function getBusiness() {
    const h = await headers()   // 👈 clave
    const slug = h.get("x-business-slug")

    if (!slug || slug === "www" || slug === "localhost" || slug === "" || slug === "192") {
        // aqui hay que definir un business por defecto
        const business = await getBusinessPrisma("brillarte-bloom")
        return business
    }

    const business = await getBusinessPrisma(slug)

    return business
}
