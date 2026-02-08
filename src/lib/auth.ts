


// export const authOptions = {
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { type: "email" },
//         password: { type: "password" },
//       },

//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) return null

//         const business = await getBusiness()

//         if (!business) return null

//         const user = await getUserPrisma(credentials.email, business.id)
//         if (!user) return null

//         const valid = await bcrypt.compare(credentials.password, user.password)
//         if (!valid) return null

//         return {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           businessId: business.id,
//           role: user.role,
//         }
//       },
//     }),
//   ],

//   session: {
//     strategy: "jwt",
//   },

//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.userId = user.id
//         token.businessId = user.businessId
//         token.role = user.role
//       }
//       return token
//     },

//     async session({ session, token }) {
//       if (session.user) {
//         session.user.id = token.userId
//         session.user.businessId = token.businessId
//         session.user.role = token.role
//       }
//       return session
//     },
//   },
// }


// import NextAuth from "next-auth"

// declare module "next-auth" {
//   interface Session {
//     user: {
//       id: string
//       businessId: string
//       role: string
//       name?: string | null
//       email?: string | null
//     }
//   }

//   interface User {
//     businessId: string
//     role: string
//   }
// }

// declare module "next-auth/jwt" {
//   interface JWT {
//     userId: string
//     businessId: string
//     role: string
//   }
// }

import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"

import { getUserPrisma } from "@/lib/prisma"
// import { NextAuthOptions } from "next-auth"
import { getBusiness } from "@/lib/getBusiness"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { type: "text" },
        password: { type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const business = await getBusiness()
        if (!business) return null

        const user = await getUserPrisma(credentials.username, business.id)
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
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
        token.username = user.username
        token.role = user.role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.businessId = token.businessId
        session.user.username = token.username
        session.user.role = token.role
      }
      return session
    },
  },
}