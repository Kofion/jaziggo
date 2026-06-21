import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { authOptions } from "../../../../../lib/auth/config"
import {
  AuthorizationError,
  requireRole,
} from "../../../../../lib/auth/permissions"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from "../../../../../types/api"
import { USER_ROLE } from "../../../../../types/user"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

function errorResponse(
  requestId: string,
  code:
    | typeof DOMAIN_ERROR_CODE.UNAUTHORIZED
    | typeof DOMAIN_ERROR_CODE.INTERNAL_ERROR,
  message: string,
  status: number,
) {
  const body: ErrorEnvelope<typeof code> = {
    success: false,
    error: { code, message },
    requestId,
  }

  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  })
}

function expireSessionCookies(
  request: NextRequest,
  response: NextResponse,
): void {
  const sessionCookie = authOptions.cookies?.sessionToken

  if (!sessionCookie) return

  const cookieNames = new Set([sessionCookie.name])

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith(`${sessionCookie.name}.`)) {
      cookieNames.add(cookie.name)
    }
  }

  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: authOptions.useSecureCookies ?? false,
      expires: new Date(0),
      maxAge: 0,
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    await requireRole(USER_ROLE.ADMIN, USER_ROLE.EMPLOYEE)
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const response = errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.UNAUTHORIZED,
        "Authentication required",
        HTTP_STATUS.UNAUTHORIZED,
      )

      expireSessionCookies(request, response)

      return response
    }

    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.INTERNAL_ERROR,
      "Unable to complete request",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }

  const body: SuccessEnvelope<{ acknowledged: true }> = {
    success: true,
    data: { acknowledged: true },
    requestId,
  }
  const response = NextResponse.json(body, {
    status: HTTP_STATUS.OK,
    headers: NO_STORE_HEADERS,
  })

  expireSessionCookies(request, response)

  return response
}
