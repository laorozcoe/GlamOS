"use client"

import { BusinessContext } from "@/context/BusinessContext"
import { Business } from "@prisma/client"

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
