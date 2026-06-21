import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const LOGIN_PATH = "/login"
const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
] as const

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === LOGIN_PATH) {
    return NextResponse.next()
  }

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((cookieName) =>
    request.cookies.has(cookieName),
  )

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
