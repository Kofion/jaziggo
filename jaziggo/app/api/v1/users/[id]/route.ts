import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  AuthorizationError,
  requirePermission,
} from "../../../../../lib/auth/permissions"
import { uuidSchema } from "../../../../../lib/validation/common"
import {
  getUserById,
  updateUser,
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
import { PERMISSION } from "../../../../../types/auth"
import {
  USER_ROLE,
  type UserDto,
} from "../../../../../types/user"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

interface UserRouteContext {
  params: Promise<{ id: string }>
}

const updateUserRequestSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email())
      .optional(),
    role: z
      .enum([USER_ROLE.ADMIN, USER_ROLE.EMPLOYEE])
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  })

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

function successResponse(user: UserDto, requestId: string) {
  const body: SuccessEnvelope<UserDto> = {
    success: true,
    data: user,
    requestId,
  }

  return NextResponse.json(body, {
    status: HTTP_STATUS.OK,
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

async function authorizeAndParseId(
  context: UserRouteContext,
): Promise<string> {
  await requirePermission(PERMISSION.MANAGE_USERS)

  const { id } = await context.params
  const parsedId = uuidSchema.safeParse(id)

  if (!parsedId.success) {
    throw UserServiceError.validation()
  }

  return parsedId.data
}

export async function GET(
  _request: NextRequest,
  context: UserRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const userId = await authorizeAndParseId(context)
    const user = await getUserById(userId)

    return successResponse(user, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}

export async function PUT(
  request: NextRequest,
  context: UserRouteContext,
) {
  const requestId = crypto.randomUUID()

  try {
    const userId = await authorizeAndParseId(context)
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

    const parsedInput = updateUserRequestSchema.safeParse(input)

    if (!parsedInput.success) {
      return errorResponse(
        requestId,
        DOMAIN_ERROR_CODE.VALIDATION_ERROR,
        "Invalid user data",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      )
    }

    const user = await updateUser(userId, parsedInput.data)

    return successResponse(user, requestId)
  } catch (error) {
    return handleError(error, requestId)
  }
}
