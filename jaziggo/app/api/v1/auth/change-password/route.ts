import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { AuthorizationError } from "../../../../../lib/auth/permissions"
import {
  changeOwnPassword,
  UserServiceError,
} from "../../../../../services/user-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type SuccessEnvelope,
} from "../../../../../types/api"
import type { UserDto } from "../../../../../types/user"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const changePasswordRequestSchema = z
  .object({
    password: z.string().min(8).max(1024),
    passwordConfirmation: z.string().min(8).max(1024),
  })
  .strict()

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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  let input: unknown

  try {
    input = await request.json()
  } catch {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid request body",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const parsedInput = changePasswordRequestSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid password data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const user = await changeOwnPassword(parsedInput.data)
    const body: SuccessEnvelope<UserDto> = {
      success: true,
      data: user,
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
