"use client"

import { BusinessContext } from "@/context/BusinessContext"
// 👇 CAMBIO AQUÍ: Agrega 'type'
import type { PublicBusiness } from "@/lib/publicBusiness"

export default function BusinessProvider({
    business,
    children,
}: {
    business: PublicBusiness | null
    children: React.ReactNode
}) {
    return (
        <BusinessContext.Provider value={business}>
            {children}
        </BusinessContext.Provider>
    )
}