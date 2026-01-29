import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { getUserPrisma} from "@/lib/prisma"
import { NextAuthOptions } from "next-auth"
import {getBusiness} from "@/lib/getBusiness"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const business = await getBusiness()

        if (!business) return null

        // ✅ buscar usuario
        const user = await getUserPrisma(credentials.email, business.id)
        if (!user) return null

        // ✅ validar password
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          businessId: business.id,
          role: user.role,
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.businessId = user.businessId
        token.role = user.role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.businessId = token.businessId as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
