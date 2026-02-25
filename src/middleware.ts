// // // import { NextRequest, NextResponse } from "next/server"

// // // export function middleware(req) {
// // //     const host = req.headers.get("host") || ""

// // //     let slug = ""

// // //     // producción: brillarte.tusalon.com
// // //     if (host.includes(".")) {
// // //         slug = host.split(".")[0]
// // //     }

// // //     // desarrollo: brillarte.localhost:3000
// // //     if (host.includes("localhost")) {
// // //         const parts = host.split(".")
// // //         if (parts.length > 1) {
// // //             slug = parts[0]
// // //         }
// // //     }

// // //     const requestHeaders = new Headers(req.headers)
// // //     requestHeaders.set("x-business-slug", slug)

// // //     return NextResponse.next({
// // //         request: {
// // //             headers: requestHeaders,
// // //         },
// // //     })
// // // }

// // import { NextRequest, NextResponse } from "next/server"
// // import { getToken } from "next-auth/jwt"

// // export async function middleware(req: NextRequest) {
// //   const host = req.headers.get("host") || ""
// //   let slug = ""

// //   // ✅ 1) Detectar subdominio (producción)
// //   if (host.includes(".")) {
// //     slug = host.split(".")[0]
// //   }

// //   // ✅ 2) Detectar subdominio en localhost
// //   if (host.includes("localhost")) {
// //     const parts = host.split(".")
// //     if (parts.length > 1) {
// //       slug = parts[0]
// //     }
// //   }

// //   // ✅ 3) Agregar slug a headers
// //   const requestHeaders = new Headers(req.headers)
// //   requestHeaders.set("x-business-slug", slug)

// //   const pathname = req.nextUrl.pathname

// //   // ✅ 4) Rutas públicas
// //   const publicRoutes = ["/signin", "/signup", "/api/auth"]

// //   const isPublic = publicRoutes.some((route) =>
// //     pathname.startsWith(route)
// //   )

// //   // ✅ 5) Validar sesión con NextAuth
// //   const token = await getToken({
// //     req,
// //     secret: process.env.NEXTAUTH_SECRET,
// //   })

// //   // ✅ 6) Redirigir si no está logueado
// //   if (!token && !isPublic) {
// //     const url = new URL("/signin", req.url)
// //     return NextResponse.redirect(url)
// //   }

// //   // ✅ 7) Continuar request con headers modificados
// //   return NextResponse.next({
// //     request: {
// //       headers: requestHeaders,
// //     },
// //   })
// // }

// // export const config = {
// //   matcher: [
// //     "/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2|ttf)).*)",
// //   ],
// // }


// import { NextRequest, NextResponse } from "next/server"
// import { getToken } from "next-auth/jwt"

// function getBusinessSlug(req: NextRequest) {
//   const host = req.headers.get("host") || ""

//   // prod: empresa.tusalon.com
//   if (host.includes(".")) {
//     return host.split(".")[0]
//   }

//   // dev: empresa.localhost:3000
//   if (host.includes("localhost")) {
//     const parts = host.split(".")
//     if (parts.length > 1) return parts[0]
//   }

//   return ""
// }

// function isPublicFile(pathname: string) {
//   return (
//     pathname.startsWith("/_next") ||
//     pathname.startsWith("/favicon.ico") ||
//     pathname.startsWith("/images") ||
//     pathname.startsWith("/icons") ||
//     pathname.startsWith("/assets") ||
//     pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|css|js|map)$/)
//   )
// }

// export async function middleware(req: NextRequest) {
//   const pathname = req.nextUrl.pathname

//   // ✅ ignorar archivos públicos
//   if (isPublicFile(pathname)) {
//     return NextResponse.next()
//   }

//   // ✅ rutas públicas
//   const publicRoutes = ["/login", "/api/auth"]
//   const isPublicRoute = publicRoutes.some((r) =>
//     pathname.startsWith(r)
//   )

//   // ✅ obtener slug del negocio
//   const slug = getBusinessSlug(req)

//   // ✅ pasar slug por header
//   const headers = new Headers(req.headers)
//   headers.set("x-business-slug", slug)

//   // ✅ auth
//   const token = await getToken({
//     req,
//     secret: process.env.NEXTAUTH_SECRET,
//   })

//   // 🔐 si no está logueado → login
//   if (!token && !isPublicRoute) {
//     return NextResponse.redirect(new URL("/login", req.url))
//   }

//   // 🧠 roles (ejemplo)
//   if (token && pathname.startsWith("/admin")) {
//     if (token.role !== "ADMIN") {
//       return NextResponse.redirect(new URL("/403", req.url))
//     }
//   }

//   return NextResponse.next({
//     request: { headers },
//   })
// }

// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
// }

import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"



// 🔐 roles permitidos por ruta
const roleRules: Record<string, string[]> = {
  "/admin": ["ADMIN", "RECEPTION", "EMPLOYEE"],
  "/dashboard": ["ADMIN", "RECEPTION", "EMPLOYEE"],
  "/": ["ADMIN", "RECEPTION", "EMPLOYEE"],
  "/ventas": ["ADMIN", "RECEPTION", "EMPLOYEE"],
  "/config": ["ADMIN", "RECEPTION", "EMPLOYEE"],
}

// 🌍 rutas públicas
const publicRoutes = ["/signin", "/signup", "/api/auth", "/not-found", "/error-404", "/schedule", "/seed", "testPrint"]

// 📦 archivos públicos (no bloquear)
function isPublicFile(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/assets") ||
    pathname === "/manifest.json" || // <--- PERMITIR MANIFEST ESTÁTICO
    pathname === "/manifest.webmanifest" || // <--- PERMITIR MANIFEST DINÁMICO
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|css|js|map)$/)
  )
}

// 🏢 obtener slug del negocio desde subdominio
function getBusinessSlug(req: NextRequest) {
  const host = req.headers.get("host") || ""

  // producción: empresa.tusalon.com
  if (host.includes(".")) {
    return host.split(".")[0]
  }

  // desarrollo: empresa.localhost:3000
  if (host.includes("localhost")) {
    const parts = host.split(".")
    if (parts.length > 1) return parts[0]
  }

  return ""
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // ✅ ignorar archivos públicos
  if (isPublicFile(pathname)) {
    return NextResponse.next()
  }

  // ✅ rutas públicas
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // 🏢 slug business
  const slug = getBusinessSlug(req)

  const headers = new Headers(req.headers)
  headers.set("x-business-slug", slug)

  // 🔐 token NextAuth
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // 🚫 no autenticado → login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/signin", req.url))
  }

  if (isPublicRoute) {
    return NextResponse.next({
      request: { headers },
    })
  }



  //TODO: Revisar esta parte, en las rutas publicas esta / entonces permite todo a todos

  // 🧑‍💻 roles
  if (token) {
    const userRole = token.role as string
    const matchedRoute = Object.keys(roleRules).find((route) =>
      pathname.startsWith(route)
    )

    if (matchedRoute) {
      const allowedRoles = roleRules[matchedRoute]

      if (!allowedRoles.includes(userRole)) {
        //AL NAVEGAR A ESTA RUTA SIN PERMISO NO ME CARGA NADA
        return NextResponse.redirect(new URL("/not-found", req.url))
      }
    }
  }

  return NextResponse.next({
    request: { headers },
  })
}

// 🎯 aplicar middleware a todo menos assets internos
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}