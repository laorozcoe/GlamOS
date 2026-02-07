import NextAuth from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            businessId: string
            role: string
            name?: string | null
            email?: string | null
            username?: string | null
        }
    }

    interface User {
        businessId: string
        role: string
        username?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        userId: string
        businessId: string
        role: string
        username?: string | null
    }
}