import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../lib/auth/permissions"
import {
  createResponsibleSchema,
  responsibleListFiltersSchema,
} from "../../../../lib/validation/responsible"
import {
  createResponsible,
  listResponsibles,
  ResponsibleServiceError,
} from "../../../../services/responsible-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../../../types/api"
import type { ResponsibleListItemDto } from "../../../../types/responsible"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const listResponsiblesQuerySchema =
  responsibleListFiltersSchema.pick({
    page: true,
    pageSize: true,
    name: true,
  })

interface ResponsiblePageResponse extends PaginationMeta {
  data: ResponsibleListItemDto[]
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
    error instanceof ResponsibleServiceError
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
  const query = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  )
  const parsedQuery = listResponsiblesQuerySchema.safeParse(query)

  if (!parsedQuery.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const result = await listResponsibles(parsedQuery.data)
    const body: SuccessEnvelope<ResponsiblePageResponse> = {
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

  const parsedInput = createResponsibleSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid responsible data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const responsible = await createResponsible(parsedInput.data)
    const body: SuccessEnvelope<ResponsibleListItemDto> = {
      success: true,
      data: responsible,
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
