import { NextResponse } from "next/server"

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
import {
  USER_ROLE,
  type UserDto,
} from "../../../../../types/user"

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

export async function GET() {
  const requestId = crypto.randomUUID()

  try {
    const user = await requireRole(
      USER_ROLE.ADMIN,
      USER_ROLE.EMPLOYEE,
    )
    const body: SuccessEnvelope<UserDto> = {
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

    return NextResponse.json(body, {
      status: HTTP_STATUS.OK,
      headers: NO_STORE_HEADERS,
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.UNAUTHORIZED,
        "Authentication required",
        HTTP_STATUS.UNAUTHORIZED,
      )
    }

    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.INTERNAL_ERROR,
      "Unable to complete request",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }
}
