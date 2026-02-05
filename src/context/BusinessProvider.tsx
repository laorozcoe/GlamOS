"use client"

import { BusinessContext } from "@/context/BusinessContext"
// 👇 CAMBIO AQUÍ: Agrega 'type'
import type { Business } from "@prisma/client"

export default function BusinessProvider({
    business,
    children,
}: {
    business: Business | null
    children: React.ReactNode
}) {
    return (
        <BusinessContext.Provider value={business}>
            {children}
        </BusinessContext.Provider>
    )
}