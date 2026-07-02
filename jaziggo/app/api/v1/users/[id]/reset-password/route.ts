import { NextRequest, NextResponse } from "next/server"

import {
  AuthorizationError,
  requirePermission,
} from "../../../../../../lib/auth/permissions"
import { uuidSchema } from "../../../../../../lib/validation/common"
import {
  resetUserPassword,
  UserServiceError,
} from "../../../../../../services/user-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../../types/api"
import { PERMISSION } from "../../../../../../types/auth"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface ResetPasswordRouteContext {
  params: Promise<{ id: string }>
}

interface Acknowledgement {
  acknowledged: true
}

function errorResponse(
  requestId: string,
  code: DomainErrorCode,
  message: string,
  status: HttpStatus,
) {
  const body: ErrorEnvelope = {
    success: false,
    error: { code, message },
    requestId,
  }

  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  })
}

function handleError(error: unknown, requestId: string) {
  if (
    error instanceof AuthorizationError ||
    error instanceof UserServiceError
  ) {
    return errorResponse(
      requestId,
      error.code,
      error.message,
      error.status,
    )
  }

  return errorResponse(
    requestId,
    DOMAIN_ERROR_CODE.INTERNAL_ERROR,
    "Unable to complete request",
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  )
}

export async function PATCH(
  _request: NextRequest,
  context: ResetPasswordRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    await requirePermission(PERMISSION.MANAGE_USERS)

    const { id } = await context.params
    const parsedId = uuidSchema.safeParse(id)

    if (!parsedId.success) {
      throw UserServiceError.validation()
    }

    await resetUserPassword(parsedId.data)

    const body: SuccessEnvelope<Acknowledgement> = {
      success: true,
      data: { acknowledged: true },
      requestId,
    }

    return NextResponse.json(body, {
      status: HTTP_STATUS.OK,
      headers: NO_STORE_HEADERS,
    })
  } catch (error) {
    return handleError(error, requestId)
  }
}
