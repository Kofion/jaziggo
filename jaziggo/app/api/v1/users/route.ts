import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { AuthorizationError } from "../../../../lib/auth/permissions"
import { paginationSchema } from "../../../../lib/validation/pagination"
import {
  createUser,
  listUsers,
  UserServiceError,
} from "../../../../services/user-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../../../types/api"
import {
  USER_ROLE,
  USER_STATUS,
  type UserDto,
} from "../../../../types/user"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const userRoleSchema = z.enum([
  USER_ROLE.ADMIN,
  USER_ROLE.EMPLOYEE,
])

const listUsersQuerySchema = paginationSchema
  .extend({
    role: userRoleSchema.optional(),
    status: z
      .enum([USER_STATUS.ACTIVE, USER_STATUS.INACTIVE])
      .optional(),
  })
  .strict()

const createUserRequestSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    role: userRoleSchema,
  })
  .strict()

interface UserPageResponse extends PaginationMeta {
  data: UserDto[]
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

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const query = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsedQuery = listUsersQuerySchema.safeParse(query)

  if (!parsedQuery.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const result = await listUsers(parsedQuery.data)
    const body: SuccessEnvelope<UserPageResponse> = {
      success: true,
      data: {
        ...result.pagination,
        data: result.items,
      },
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

  const parsedInput = createUserRequestSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid user data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const user = await createUser(parsedInput.data)
    const body: SuccessEnvelope<UserDto> = {
      success: true,
      data: user,
      requestId,
    }

    return NextResponse.json(body, {
      status: HTTP_STATUS.CREATED,
      headers: NO_STORE_HEADERS,
    })
  } catch (error) {
    return handleError(error, requestId)
  }
}
