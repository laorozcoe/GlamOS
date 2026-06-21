import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// 🌍 rutas públicas
const publicRoutes = ["/api/auth", "/api/mp/webhook", "/not-found", "/error-404", "/schedule", "/seed", "testPrint"]

// 🔐 rutas por rol
const roleBasedRoutes = {
  ADMIN: [
    "/sales",
    "/payroll",
    "/permissions",
    "/services",
    "/employees",
    "/settlements"
  ],
  RECEPTION: [
    "/customers"
  ],
  EMPLOYEE: [
    // Los empleados solo pueden acceder a la agenda por defecto
  ]
}

// 🏢 obtener slug del negocio desde subdominio
function getBusinessSlug(req: NextRequest) {
    debugger
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

// 📦 archivos públicos (no bloquear)
function isPublicFile(pathname: string) {
    return (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/favicon_io") ||
        pathname.startsWith("/images") ||
        pathname.startsWith("/icons") ||
        pathname.startsWith("/assets") ||
        pathname === "/manifest.json" || // <--- PERMITIR MANIFEST ESTÁTICO
        pathname === "/manifest.webmanifest" || // <--- PERMITIR MANIFEST DINÁMICO
        pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|css|js|map)$/)
    )
}

// 🔐 verificar acceso por rol
function hasAccessToRoute(userRole: string, pathname: string): boolean {
    // Rutas accesibles para todos los roles autenticados
    const commonRoutes = ["/calendar", "/profile"];
    
    // Rutas que solo ADMIN y RECEPTION pueden ver (contienen datos financieros)
    const restrictedRoutes = ["/"];
    
    // Si es una ruta restringida, verificar permisos
    if (restrictedRoutes.some(route => pathname.startsWith(route))) {
        return userRole === "ADMIN" || userRole === "RECEPTION";
    }
    
    // Si es una ruta común, permitir acceso
    if (commonRoutes.some(route => pathname.startsWith(route))) {
        return true;
    }
    
    // Verificar si la ruta está en las rutas permitidas para el rol del usuario
    const allowedRoutes = roleBasedRoutes[userRole as keyof typeof roleBasedRoutes] || [];
    
    return allowedRoutes.some(route => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    const { pathname } = request.nextUrl;

    // ✅ ignorar archivos públicos
    if (isPublicFile(pathname)) {
        return NextResponse.next()
    }

    // ✅ rutas públicas
    const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
    )

    // ✅ ignorar archivos públicos
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // THIS IS NOT SECURE!
    // This is the recommended approach to optimistically redirect users
    // We recommend handling auth checks in each page/route
    const isAuthPage = pathname === "/signin" || pathname === "/signup";

    // CASO A: Usuario logueado intenta entrar a Login o Signup
    if (isAuthPage && session) {
        const userRole = session.user.role || "EMPLOYEE";
        const redirectUrl = userRole === "EMPLOYEE" ? "/calendar" : "/";
        return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    if (!session && !isAuthPage) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    // CASO B: Verificar acceso por rol para usuarios autenticados
    if (session && !isAuthPage) {
        const userRole = session.user.role || "EMPLOYEE";
        
        // Si el empleado intenta acceder a la raíz, redirigir a calendar
        if (userRole === "EMPLOYEE" && pathname === "/") {
            return NextResponse.redirect(new URL("/calendar", request.url));
        }
        
        // Evitar bucles de redirección para empleados
        if (userRole === "EMPLOYEE" && pathname === "/calendar") {
            return NextResponse.next();
        }
        
        if (!hasAccessToRoute(userRole, pathname)) {
            // Si no tiene acceso, redirigir según el rol
            let redirectUrl = userRole === "EMPLOYEE" ? "/calendar" : "/?access-denied=true";
            
            // Evitar bucle de redirección si ya está en la URL de destino
            if (pathname === redirectUrl) {
                return NextResponse.next();
            }
            
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // Aplicar a todas las rutas excepto las internas de Next y archivos estáticos obvios
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};