import { NextRequest, NextResponse } from "next/server"

export function middleware(req) {
    const host = req.headers.get("host") || ""

    let slug = ""

    // producción: brillarte.tusalon.com
    if (host.includes(".")) {
        slug = host.split(".")[0]
    }

    // desarrollo: brillarte.localhost:3000
    if (host.includes("localhost")) {
        const parts = host.split(".")
        if (parts.length > 1) {
            slug = parts[0]
        }
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-business-slug", slug)

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}
