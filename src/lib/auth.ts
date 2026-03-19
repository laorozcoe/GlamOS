


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

// import type { NextAuthOptions } from "next-auth"
// import CredentialsProvider from "next-auth/providers/credentials"
// import bcrypt from "bcrypt"

// import { getUserPrisma } from "@/lib/prisma"
// // import { NextAuthOptions } from "next-auth"
// import { getBusiness } from "@/lib/getBusiness"

// export const authOptions: NextAuthOptions = {
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         username: { type: "text" },
//         password: { type: "password" },
//       },

//       async authorize(credentials) {
//         if (!credentials?.username || !credentials?.password) return null

//         const business = await getBusiness()
//         if (!business) return null

//         const user = await getUserPrisma(credentials.username.toLowerCase(), business.id)
//         if (!user) return null

//         const valid = await bcrypt.compare(credentials.password, user.password)
//         if (!valid) return null

//         return {
//           id: user.id,
//           email: user.email,
//           name: user.name,
//           username: user.username,
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
//         token.username = user.username
//         token.role = user.role
//       }
//       return token
//     },

//     async session({ session, token }) {
//       if (session.user) {
//         session.user.id = token.userId
//         session.user.businessId = token.businessId
//         session.user.username = token.username
//         session.user.role = token.role
//       }
//       return session
//     },
//   },
// }

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma2"
import { nextCookies } from "better-auth/next-js";
import { hashPassword, verifyPassword } from "@/lib/hashPassword"
import { getBusiness } from "@/lib/getBusiness"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",

  }),
  // AGREGA ESTO:
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => hashPassword(password),
      verify: async ({ password, hash }) => verifyPassword(password, hash),
    }
  },
  trustedOrigins: [
    "https://brillartebloom.vercel.app/",
    "https://evorasalon.vercel.app/"
  ],
  user: {
    additionalFields: {
      lastName: {
        type: "string",
        required: true, // Ponlo en true si es obligatorio en tu form
      },
      phone: {
        type: "string",
        required: false,
      }
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [nextCookies()],
  hook: {
    before: createAuthMiddleware(async (ctx) => {
      //TODO: REVISAR EL BUSSINESS VS EL BUSINESS ID DEL USUARIO
      debugger
      const bussiness = await getBusiness();
      console.log(bussiness)

      // 1. Solo interceptamos la ruta exacta donde ocurre el login con correo
      // if (ctx.path === "/sign-in/email") {

      // 2. Extraemos el correo del body y el ID del negocio de los Headers
      // const email = ctx.body?.email;
      // const requestedBusinessId = ctx.headers.get("x-business-id");

      // if (!email || !requestedBusinessId) {
      //   throw new APIError("BAD_REQUEST", {
      //     message: "Faltan credenciales o el ID del local."
      //   });
      // }

      // 3. Buscamos al usuario en la base de datos
      // const user = await prisma.user.findUnique({
      //   where: { email },
      //   select: { businessId: true } // Solo traemos lo que nos importa
      // });

      // 4. Si el usuario existe, validamos que los IDs coincidan
      // if (user && user.businessId !== requestedBusinessId) {
      //   // Bloqueamos el login lanzando un error oficial de Better Auth
      //   throw new APIError("UNAUTHORIZED", {
      //     message: "Este usuario no tiene permisos para acceder a este local."
      //   });
      // }

      // Si todo coincide (o si el usuario no existe), la función termina aquí.
      // Better Auth tomará el control automáticamente y procederá a validar la contraseña.
      // }
    })
  }
});