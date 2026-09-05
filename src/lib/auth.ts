


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
        required: true, // Ponlo en true si es obligatorio en tu form
      },
      phone: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
      },
      // Necesario para que la sesion sepa a que negocio pertenece el usuario.
      // input: false => el cliente no puede enviarlo al registrarse.
      businessId: {
        type: "string",
        required: false,
        input: false,
      }
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [nextCookies()],
  hooks: {
    // Valida que el usuario que intenta entrar pertenezca al negocio del
    // subdominio desde el que se esta haciendo el login.
    //
    // Sin esto, un usuario de "salonA" puede autenticarse en
    // "salonB.dominio.com" y operar los datos de salonB, porque el negocio se
    // resuelve por host (getBusiness) y no por la sesion.
    //
    // OJO: la key correcta es `hooks` (plural). El bloque anterior usaba
    // `hook`, por lo que nunca llego a ejecutarse.
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

      // El schema tiene @@unique([businessId, email, username]), es decir el
      // email NO es unico globalmente. Better Auth resuelve el login con un
      // findFirst por email, asi que si el mismo correo existe en dos negocios
      // el usuario autenticado seria ambiguo. Bloqueamos ese caso.
      const matches = await prisma.user.findMany({
        where: { email, active: true },
        select: { businessId: true },
      });

      if (matches.length > 1) {
        throw new APIError("UNAUTHORIZED", {
          message:
            "Este correo esta registrado en mas de un negocio. Contacta a soporte.",
        });
      }

      const belongsToBusiness = matches.some(
        (u: { businessId: string }) => u.businessId === business.id
      );

      if (!belongsToBusiness) {
        // Mensaje generico: no revelamos si el correo existe en otro negocio.
        throw new APIError("UNAUTHORIZED", {
          message: "Correo o contrasena incorrectos.",
        });
      }
    })
  }
});
