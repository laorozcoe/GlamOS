import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // ✅ 1) Obtener slug del negocio desde headers
        const slug = headers().get("x-business-slug")

        if (!slug) return null

        // ✅ 2) Buscar negocio
        const business = await prisma.business.findUnique({
          where: { slug },
        })

        if (!business) return null

        // ✅ 3) Buscar usuario en ese negocio
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
            businessId: business.id,
          },
        })

        if (!user) return null

        // ✅ 4) Verificar password
        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!valid) return null

        // ✅ 5) Retornar usuario
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
})

export { handler as GET, handler as POST }
