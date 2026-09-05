


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
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => hashPassword(password),
      verify: async ({ password, hash }) => verifyPassword(password, hash),
    }
  },
  trustedOrigins: [
    "https://brillartebloom.vercel.app",
    "https://evorasalon.vercel.app"
  ],
  user: {
    additionalFields: {
      lastName: {
        type: "string",
        required: true,
      },
      phone: {
        type: "string",
        required: false,
      },
      // Ya no hay businessId ni role en User: la pertenencia a un salon y el
      // rol dentro de el viven en Employee (la membresia).
    }
  },
  session: {
    additionalFields: {
      // La sesion queda atada al salon en el que se inicio. Tenerlos aqui
      // evita consultar la membresia en cada request del middleware.
      businessId: { type: "string", required: false, input: false },
      role: { type: "string", required: false, input: false },
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [nextCookies()],
  hooks: {
    // Solo puede entrar quien tenga una membresia activa en el salon del
    // subdominio. El correo ya es unico global, asi que la identidad no es
    // ambigua; lo que se valida aqui es la pertenencia.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const email = ctx.body?.email;
      if (!email) return;

      const business = await getBusiness();
      if (!business) {
        throw new APIError("UNAUTHORIZED", {
          message: "No se pudo identificar el negocio de esta direccion.",
        });
      }

      const membership = await prisma.employee.findFirst({
        where: {
          active: true,
          businessId: business.id,
          user: { email, active: true },
        },
        select: { id: true },
      });

      if (!membership) {
        // Mensaje generico: no revelamos si el correo existe en otro salon.
        throw new APIError("UNAUTHORIZED", {
          message: "Correo o contrasena incorrectos.",
        });
      }
    })
  },
  databaseHooks: {
    session: {
      create: {
        // Se sella la sesion con el salon y el rol vigentes al iniciarla.
        before: async (session) => {
          const business = await getBusiness();
          if (!business) return;

          const membership = await prisma.employee.findFirst({
            where: { userId: session.userId, businessId: business.id, active: true },
            select: { role: true },
          });
          if (!membership) return;

          return {
            data: {
              ...session,
              businessId: business.id,
              role: membership.role,
            },
          };
        },
      },
    },
  },
});
