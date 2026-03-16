
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";


// 🌍 rutas públicas
const publicRoutes = ["/api/auth", "/not-found", "/error-404", "/schedule", "/seed", "testPrint"]

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
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!session && !isAuthPage) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Aplicar a todas las rutas excepto las internas de Next y archivos estáticos obvios
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};