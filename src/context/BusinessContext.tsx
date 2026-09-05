"use client"

import { createContext, useContext } from "react"
// 👇 CAMBIO AQUÍ: Agrega 'type'
import type { PublicBusiness } from "@/lib/publicBusiness"

export const BusinessContext = createContext<PublicBusiness | null>(null)

export function useBusiness() {
    return useContext(BusinessContext)
}