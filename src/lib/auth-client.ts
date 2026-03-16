import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields<typeof auth>()
    ],
    baseURL: process.env.NEXT_PUBLIC_APP_URL
})

export const { signIn, signUp, useSession } = authClient;