import { encode } from "next-auth/jwt"
import { NextResponse } from "next/server"
import { z } from "zod"

import { authOptions } from "../../../../../lib/auth/config"
import { authenticateCredentials } from "../../../../../lib/auth/dal"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type ErrorEnvelope,
  type SuccessEnvelope,
} from "../../../../../types/api"
import type { UserDto } from "../../../../../types/user"

const DEFAULT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const loginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8),
  })
  .strict()

function errorResponse(
  requestId: string,
  code:
    | typeof DOMAIN_ERROR_CODE.UNAUTHORIZED
    | typeof DOMAIN_ERROR_CODE.VALIDATION_ERROR
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

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid request",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const parsedCredentials = loginSchema.safeParse(body)

  if (!parsedCredentials.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid request",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const user = await authenticateCredentials(parsedCredentials.data)

    if (!user) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.UNAUTHORIZED,
        "Invalid credentials",
        HTTP_STATUS.UNAUTHORIZED,
      )
    }

    const secret = authOptions.secret
    const sessionCookie = authOptions.cookies?.sessionToken
    const sessionMaxAge =
      authOptions.session?.maxAge ?? DEFAULT_SESSION_MAX_AGE_SECONDS

    if (!secret || !sessionCookie) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.INTERNAL_ERROR,
        "Unable to complete request",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      )
    }

    const expires = new Date(
      Date.now() + sessionMaxAge * 1_000,
    )
    const sessionToken = await encode({
      secret,
      maxAge: sessionMaxAge,
      token: {
        sub: user.id,
        role: user.role,
      },
    })
    const responseBody: SuccessEnvelope<UserDto> = {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
      },
      requestId,
    }
    const response = NextResponse.json(responseBody, {
      status: HTTP_STATUS.OK,
      headers: NO_STORE_HEADERS,
    })

    response.cookies.set({
      name: sessionCookie.name,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: authOptions.useSecureCookies ?? false,
      expires,
    })

    return response
  } catch {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.INTERNAL_ERROR,
      "Unable to complete request",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }
}
