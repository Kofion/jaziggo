import { NextRequest, NextResponse } from "next/server"

import { AuthorizationError } from "../../../../lib/auth/permissions"
import {
  createDeceasedSchema,
  deceasedListFiltersSchema,
} from "../../../../lib/validation/deceased"
import {
  createDeceased,
  DeceasedServiceError,
  listDeceased,
} from "../../../../services/deceased-service"
import {
  DOMAIN_ERROR_CODE,
  HTTP_STATUS,
  type DomainErrorCode,
  type ErrorEnvelope,
  type HttpStatus,
  type PaginationMeta,
  type SuccessEnvelope,
} from "../../../../types/api"
import type {
  DeceasedDetailDto,
  DeceasedListItemDto,
} from "../../../../types/deceased"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }
const ALLOWED_LIST_QUERY_PARAMS = new Set([
  "page",
  "pageSize",
  "name",
  "deathDate",
  "burialDate",
  "burialSpaceId",
])

const listDeceasedQuerySchema = deceasedListFiltersSchema.pick({
  page: true,
  pageSize: true,
  name: true,
  deathDate: true,
  burialDate: true,
  burialSpaceId: true,
})

interface DeceasedPageResponse extends PaginationMeta {
  data: DeceasedListItemDto[]
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
    error instanceof DeceasedServiceError
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

function hasUnknownQueryParameter(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_LIST_QUERY_PARAMS.has(key)) {
      return true
    }
  }

  return false
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  if (hasUnknownQueryParameter(request.nextUrl.searchParams)) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  const query = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  )
  const parsedQuery = listDeceasedQuerySchema.safeParse(query)

  if (!parsedQuery.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid query parameters",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const result = await listDeceased(parsedQuery.data)
    const body: SuccessEnvelope<DeceasedPageResponse> = {
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

  const parsedInput = createDeceasedSchema.safeParse(input)

  if (!parsedInput.success) {
    return errorResponse(
      requestId,
      DOMAIN_ERROR_CODE.VALIDATION_ERROR,
      "Invalid deceased data",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    )
  }

  try {
    const deceased = await createDeceased(parsedInput.data)
    const body: SuccessEnvelope<DeceasedDetailDto> = {
      success: true,
      data: deceased,
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
