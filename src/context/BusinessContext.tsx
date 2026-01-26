"use client"

import { createContext, useContext } from "react"
import { Business } from "@prisma/client"

export const BusinessContext = createContext<Business | null>(null)

export function useBusiness() {
    return useContext(BusinessContext)
}